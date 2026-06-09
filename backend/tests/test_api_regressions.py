import importlib
import sys
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient


def load_client(tmp_path, monkeypatch, *, origins="https://agency-arena.vercel.app,https://*.vercel.app"):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("SEED_ON_STARTUP", "false")
    monkeypatch.setenv("ALLOWED_ORIGINS", origins)
    monkeypatch.setenv("BUSINESS_TIMEZONE", "America/New_York")

    for name in list(sys.modules):
        if name == "app" or name.startswith("app."):
            del sys.modules[name]

    main = importlib.import_module("app.main")
    return TestClient(main.app)


def test_rejects_unknown_activity_type(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        client.post("/agents", json={"name": "Alice", "role": "agent"})
        response = client.post(
            "/activity",
            json={"agent_id": 1, "activity_type": "made_up_type"},
        )

    assert response.status_code == 422
    assert "activity_type" in response.text


def test_rejects_blank_names(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        agent = client.post("/agents", json={"name": "", "role": "agent"})
        contest = client.post(
            "/contests",
            json={
                "name": "   ",
                "metric": "points",
                "start_date": "2026-05-01",
                "end_date": "2026-05-02",
            },
        )
        partner = client.post("/referral-partners", json={"name": " "})

    assert agent.status_code == 422
    assert contest.status_code == 422
    assert partner.status_code == 422


def test_rejects_invalid_settings_agent(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        response = client.patch("/settings", json={"current_agent_id": 9999})

    assert response.status_code == 422
    assert "not found" in response.text


def test_delete_agent_cascades_and_repoints_current(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        alice_id = client.post("/agents", json={"name": "Alice", "role": "agent"}).json()["id"]
        bob_id = client.post("/agents", json={"name": "Bob", "role": "agent"}).json()["id"]

        # Give Alice a scoring activity, then point Settings at her so the
        # delete has both a cascade and a current-agent repoint to exercise.
        client.post("/activity", json={"agent_id": alice_id, "activity_type": "policy_bound"})
        client.patch("/settings", json={"current_agent_id": alice_id})

        deleted = client.delete(f"/agents/{alice_id}")
        missing = client.get(f"/agents/{alice_id}")
        agents = client.get("/agents").json()
        leaderboard = client.get("/leaderboard?period=daily").json()
        settings = client.get("/settings").json()

    assert deleted.status_code == 204
    assert missing.status_code == 404
    assert [a["id"] for a in agents] == [bob_id]
    # Her daily score cascaded away, so she's gone from the leaderboard too.
    assert all(e["agent_id"] != alice_id for e in leaderboard["entries"])
    # current_agent_id repointed off the deleted agent onto the survivor.
    assert settings["current_agent_id"] == bob_id


def test_delete_missing_agent_returns_404(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        response = client.delete("/agents/9999")

    assert response.status_code == 404


def test_deactivated_agent_hidden_from_leaderboard_but_kept(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        alice_id = client.post("/agents", json={"name": "Alice", "role": "agent"}).json()["id"]
        client.post("/activity", json={"agent_id": alice_id, "activity_type": "policy_bound"})

        before = client.get("/leaderboard?period=daily").json()
        patched = client.patch(f"/agents/{alice_id}", json={"active": False})
        after = client.get("/leaderboard?period=daily").json()
        # The agent record (and its history) survives the deactivation.
        still_there = client.get(f"/agents/{alice_id}").json()

    assert patched.status_code == 200
    assert any(e["agent_id"] == alice_id for e in before["entries"])
    assert all(e["agent_id"] != alice_id for e in after["entries"])
    assert still_there["active"] is False


def test_rejects_invalid_referral_counts(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        response = client.post(
            "/referral-partners",
            json={
                "name": "Bad Co",
                "total_referrals": 1,
                "converted_referrals": 2,
            },
        )

    assert response.status_code == 422
    assert "converted_referrals" in response.text


def test_point_overrides_affect_future_scoring(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        client.post("/agents", json={"name": "Alice", "role": "agent"})
        patch = client.patch(
            "/settings",
            json={"point_overrides": {"quote_completed": 99}},
        )
        activity = client.post(
            "/activity",
            json={"agent_id": 1, "activity_type": "quote_completed"},
        )

    assert patch.status_code == 200
    assert activity.status_code == 201
    assert activity.json()["points"] == 99


def test_contests_list_is_read_only(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        create = client.post(
            "/contests",
            json={
                "name": "Weekly Sprint",
                "type": "weekly",
                "metric": "points",
                "start_date": "2026-04-01",
                "end_date": "2026-04-07",
                "auto_renew": True,
            },
        )
        first = client.get("/contests")
        second = client.get("/contests")

    assert create.status_code == 201
    assert first.status_code == 200
    assert second.status_code == 200
    assert len(first.json()) == 1
    assert len(second.json()) == 1


def test_cors_wildcard_matches_vercel_previews(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        response = client.options(
            "/health",
            headers={
                "Origin": "https://my-preview.vercel.app",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://my-preview.vercel.app"


def test_concurrent_activity_logging_is_safe(tmp_path, monkeypatch):
    with load_client(tmp_path, monkeypatch) as client:
        create_agent = client.post("/agents", json={"name": "Alice", "role": "agent"})
        assert create_agent.status_code == 201

        def create_activity(_):
            response = client.post(
                "/activity",
                json={"agent_id": 1, "activity_type": "quote_completed"},
            )
            return response.status_code

        with ThreadPoolExecutor(max_workers=8) as pool:
            statuses = list(pool.map(create_activity, range(20)))

        leaderboard = client.get("/leaderboard?period=daily").json()

    assert statuses == [201] * 20
    assert leaderboard["entries"][0]["quotes"] == 20
    assert leaderboard["entries"][0]["total_points"] == 200

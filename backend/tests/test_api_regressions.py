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

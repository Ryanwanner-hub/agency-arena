import { ReportsClient } from "./ReportsClient";

export const metadata = { title: "Reports · Agency Arena" };

export default function ReportsPage() {
  // Window picker + data fetching live entirely client-side so the
  // user can flip ranges without round-tripping through SSR.
  return <ReportsClient />;
}

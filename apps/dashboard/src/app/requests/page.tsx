import RequestsPage from "@/components/requests-page";
import { requirePageSession } from "@/lib/server/page-auth";

export default async function RequestsRoutePage() {
  await requirePageSession();

  return <RequestsPage />;
}

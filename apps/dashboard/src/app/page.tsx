import OverviewPage from "@/components/overview-page";
import { requirePageSession } from "@/lib/server/page-auth";

export default async function HomePage() {
  const session = await requirePageSession();

  return <OverviewPage userName={session.user.name} />;
}

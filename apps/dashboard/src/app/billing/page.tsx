import BillingPage from "@/components/billing-page";
import { requirePageSession } from "@/lib/server/page-auth";

export default async function BillingRoutePage() {
  await requirePageSession();

  return <BillingPage />;
}

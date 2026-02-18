import ApiKeysPage from "@/components/api-keys-page";
import { requirePageSession } from "@/lib/server/page-auth";

export default async function ApiKeysRoutePage() {
  await requirePageSession();

  return <ApiKeysPage />;
}

import { ImportPanel } from "@/components/ImportPanel";
import { countInventory } from "@/lib/db/inventory";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  let initialTotal = 0;
  try {
    initialTotal = await countInventory();
  } catch {
    initialTotal = 0;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f0f7ff]">
      <ImportPanel initialTotal={initialTotal} />
    </div>
  );
}

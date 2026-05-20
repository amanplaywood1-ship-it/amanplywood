import { PageHero } from "@/components/PageHero";
import { SearchStock } from "@/components/SearchStock";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = await searchParams;
  const qRaw = sp.q;
  const initialQuery = typeof qRaw === "string" ? qRaw : Array.isArray(qRaw) ? (qRaw[0] ?? "") : "";

  return (
    <div className="flex flex-col">
      {/* <PageHero eyebrow="Code lookup" title="Find an item" /> */}
      <SearchStock initialQuery={initialQuery} />
    </div>
  );
}

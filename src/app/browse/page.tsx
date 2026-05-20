import { BrowseStock } from "@/components/BrowseStock";
import { PageHero } from "@/components/PageHero";

export default function BrowsePage() {
  return (
    <div className="flex flex-col">
      {/* <PageHero eyebrow="Tag & spec" wide title="Browse by tag or spec" /> */}
      <BrowseStock />
    </div>
  );
}

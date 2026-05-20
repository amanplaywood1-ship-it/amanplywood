import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { HeaderNav } from "@/components/HeaderNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-blue-200/70 bg-white/90 shadow-[0_4px_24px_-8px_rgba(30,58,138,0.12)] backdrop-blur-md">
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-500/90 via-sky-500/80 to-blue-800/90" aria-hidden />
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="group flex min-w-0 max-w-full items-center gap-3 transition hover:opacity-95"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-blue-800 shadow-md ring-1 ring-white/20 sm:h-11 sm:w-11">
            <BrandMark onDark className="scale-90 opacity-95" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block break-words text-sm font-bold tracking-tight text-blue-950 sm:truncate sm:text-base">
              Aman Ply Wood Stock
            </span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-blue-600/80 sm:text-xs">
              Inventory desk
            </span>
          </span>
        </Link>
        <div className="min-w-0 shrink-0 sm:w-auto">
          <HeaderNav />
        </div>
      </div>
    </header>
  );
}

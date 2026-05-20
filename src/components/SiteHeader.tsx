import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { HeaderNav } from "@/components/HeaderNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-blue-200/70 bg-white/90 shadow-[0_4px_24px_-8px_rgba(30,58,138,0.12)] backdrop-blur-md">
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-500/90 via-sky-500/80 to-blue-800/90" aria-hidden />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 transition hover:opacity-95"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-blue-800 shadow-md ring-1 ring-white/20">
            <BrandMark onDark className="scale-90 opacity-95" />
          </span>
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-bold tracking-tight text-blue-950 sm:text-base">
              Aman Ply Wood Stock
            </span>
            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-blue-600/80 sm:text-xs">
              Inventory desk
            </span>
          </span>
        </Link>
        <HeaderNav />
      </div>
    </header>
  );
}

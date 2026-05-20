"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Search", match: (p: string) => p === "/" || p === "" },
  { href: "/browse", label: "Browse", match: (p: string) => p.startsWith("/browse") },
  { href: "/import", label: "Import", match: (p: string) => p.startsWith("/import") },
] as const;

export function HeaderNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Main"
      className="flex w-full min-w-0 flex-nowrap items-stretch gap-1 overflow-x-auto rounded-full bg-blue-950/[0.04] p-1 ring-1 ring-blue-950/10 [-webkit-overflow-scrolling:touch] sm:w-auto sm:items-center sm:overflow-visible [&::-webkit-scrollbar]:h-1"
    >
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "flex min-h-11 shrink-0 flex-1 items-center justify-center rounded-full bg-white px-3 py-2 text-center text-xs font-semibold text-blue-950 shadow-sm ring-1 ring-blue-200/80 sm:flex-none sm:min-h-0 sm:px-4 sm:text-sm"
                : "flex min-h-11 shrink-0 flex-1 items-center justify-center rounded-full px-3 py-2 text-center text-xs font-medium text-blue-700/90 transition hover:bg-white/70 hover:text-blue-900 sm:flex-none sm:min-h-0 sm:px-4 sm:text-sm"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

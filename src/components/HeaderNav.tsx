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
    <nav className="flex items-center gap-1 rounded-full bg-blue-950/[0.04] p-1 ring-1 ring-blue-950/10">
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-950 shadow-sm ring-1 ring-blue-200/80 sm:px-4 sm:text-sm"
                : "rounded-full px-3.5 py-1.5 text-xs font-medium text-blue-700/90 transition hover:bg-white/70 hover:text-blue-900 sm:px-4 sm:text-sm"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  /** Wider max width for browse-style pages */
  wide?: boolean;
};

export function PageHero({ eyebrow, title, children, wide }: PageHeroProps) {
  return (
    <div className="relative border-b border-blue-200/60 bg-gradient-to-b from-white via-[#f7fbff] to-[#eef6ff] px-4 py-8 sm:px-6 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-amber-200/15 blur-3xl" />
      </div>
      <div
        className={`relative mx-auto rounded-2xl border border-blue-100/90 bg-white/85 p-6 shadow-[0_8px_30px_-12px_rgba(30,58,138,0.18)] backdrop-blur-sm ring-1 ring-blue-950/[0.04] sm:p-8 ${wide ? "max-w-6xl" : "max-w-2xl"}`}
      >
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-500">{eyebrow}</p>
        ) : null}
        <h1 className={`font-semibold tracking-tight text-blue-950 ${eyebrow ? "mt-2" : ""} text-2xl sm:text-3xl`}>
          {title}
        </h1>
        {children ? (
          <div className="mt-3 max-w-prose text-sm leading-relaxed text-blue-800/90 sm:text-[15px]">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

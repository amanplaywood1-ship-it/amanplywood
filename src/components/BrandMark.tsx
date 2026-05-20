/** Stacked bars — reads as “layers” on light or dark backgrounds */
export function BrandMark({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const a = onDark ? "bg-amber-200/95" : "bg-amber-600/90";
  const b = onDark ? "bg-amber-100/90" : "bg-amber-500/75";
  const c = onDark ? "bg-sky-100/90" : "bg-sky-700/85";
  return (
    <span className={`inline-flex shrink-0 flex-col gap-0.5 ${className}`} aria-hidden>
      <span className={`h-1 w-6 rounded-sm shadow-sm ${a}`} />
      <span className={`h-1 w-6 rounded-sm shadow-sm ${b}`} />
      <span className={`h-1 w-6 rounded-sm shadow-sm ${c}`} />
    </span>
  );
}

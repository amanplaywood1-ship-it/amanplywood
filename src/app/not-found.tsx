import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#f0f7ff] px-4 text-center">
      <h1 className="text-2xl font-semibold text-blue-950">Page not found</h1>
      <p className="max-w-md text-blue-800/90">That URL does not exist in this app.</p>
      <Link href="/" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
        Go to search
      </Link>
    </div>
  );
}

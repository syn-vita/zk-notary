"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type PageNavProps = {
  backLabel?: string;
  homeLabel?: string;
};

export function PageNav({
  backLabel = "Back",
  homeLabel = "Home"
}: PageNavProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-blue-950/5 transition hover:border-slate-300 hover:bg-slate-50"
      >
        ← {backLabel}
      </button>
      <Link
        href="/"
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-blue-950/5 transition hover:border-slate-300 hover:bg-slate-50"
      >
        {homeLabel}
      </Link>
    </div>
  );
}

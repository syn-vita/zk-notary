import { Suspense } from "react";

import { PageNav } from "@/components/page-nav";
import { VerifyWorkbench } from "@/components/verify-workbench";

export default function VerifyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <PageNav backLabel="Back" homeLabel="Main page" />
      <Suspense
        fallback={
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Verify
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              Loading verification tools...
            </h1>
          </div>
        }
      >
        <VerifyWorkbench />
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";

import { PageShell } from "@/components/page-shell";
import { VerifyWorkbench } from "@/components/verify-workbench";

export default function VerifyPage() {
  return (
    <PageShell showBack>
      <Suspense
        fallback={
          <div className="rounded-card border border-ui-border bg-base p-8 shadow-card">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
              Verify
            </p>
            <h1 className="mt-3 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
              Loading verification tools...
            </h1>
          </div>
        }
      >
        <VerifyWorkbench />
      </Suspense>
    </PageShell>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { StepIndicator } from "@/components/step-indicator";

type StepDef = { label: string };

type PageShellProps = {
  children: ReactNode;
  showBack?: boolean;
  steps?: StepDef[];
  currentStep?: number;
};

export function PageShell({
  children,
  showBack = false,
  steps,
  currentStep,
}: PageShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleBack() {
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-base">
      {/* Top nav */}
      <header className="sticky top-0 z-10 flex h-[52px] items-center border-b border-ui-border bg-base px-6">
        <div className="flex items-center gap-3">
          {showBack && (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="flex h-7 w-7 items-center justify-center rounded-btn text-ink-secondary transition hover:bg-surface"
                aria-label="Go back"
              >
                ←
              </button>
              <div className="h-4 w-px bg-ui-border" />
            </>
          )}
          <Link
            href="/"
            className="border-l-2 border-warm pl-2 text-[1rem] font-extrabold tracking-[-0.01em] text-ink"
          >
            zkNotary
          </Link>
        </div>

        <nav className="ml-auto flex items-center gap-5">
          <Link
            href="/verify"
            className={`hidden sm:block text-[0.8125rem] transition ${pathname === "/verify" ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"}`}
          >
            Verify
          </Link>
          <Link
            href="/dashboard"
            className={`hidden sm:block text-[0.8125rem] transition ${pathname === "/dashboard" ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"}`}
          >
            Dashboard
          </Link>
          <Link
            href="/notarize"
            className={`btn-warm px-3 py-1.5 ${pathname === "/notarize" ? "!bg-warm !text-white" : ""}`}
          >
            Notarize
          </Link>
        </nav>
      </header>

      {/* Optional step indicator */}
      {steps && currentStep !== undefined && (
        <StepIndicator steps={steps} currentStep={currentStep} />
      )}

      {/* Page content */}
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-ui-border px-6 py-4">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3">
          <span className="text-[0.6875rem] font-bold tracking-[-0.01em] text-ink">
            zkNotary
          </span>
          <p className="text-[0.6875rem] leading-5 text-muted">
            Proves a document fingerprint was recorded on Ethereum at a specific time. Does not prove authorship, truthfulness, or legal enforceability.
          </p>
        </div>
      </footer>
    </div>
  );
}

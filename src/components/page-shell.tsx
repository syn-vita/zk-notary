"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
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
            className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-ink"
          >
            zkNotary
          </Link>
        </div>

        <nav className="ml-auto flex items-center gap-5">
          <Link
            href="/verify"
            className="text-[0.8125rem] text-ink-secondary transition hover:text-ink"
          >
            Verify
          </Link>
          <Link
            href="/dashboard"
            className="text-[0.8125rem] text-ink-secondary transition hover:text-ink"
          >
            Dashboard
          </Link>
          <Link
            href="/notarize"
            className="rounded-btn bg-action px-3 py-1.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-action/90"
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
    </div>
  );
}

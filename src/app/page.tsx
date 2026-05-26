import Link from "next/link";

import { PageShell } from "@/components/page-shell";

const steps = [
  {
    num: "01",
    title: "Hash locally",
    body: "The original file never leaves the browser. zkNotary only works from the cryptographic hash.",
  },
  {
    num: "02",
    title: "Sign intent",
    body: "Your wallet signs a plain-English authorization message before the platform relays the record.",
  },
  {
    num: "03",
    title: "Verify later",
    body: "Anyone can inspect the attestation certificate, wallet, timestamp, and chain reference.",
  },
];

export default function HomePage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="border-b border-ui-border pb-12 pt-16">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Ethereum Sepolia · Beta
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.025em] text-ink">
          Wallet-authorized evidence records.
        </h1>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-ink-secondary">
          Hash locally in your browser. Sign with your wallet. Get an immutable
          on-chain record — with a public proof anyone can verify.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/notarize"
            className="rounded-btn bg-action px-5 py-2.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-action/90"
          >
            Notarize a document
          </Link>
          <Link
            href="/verify"
            className="rounded-btn border border-ui-border px-5 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-secondary transition hover:border-ink-secondary"
          >
            Verify an attestation
          </Link>
          <Link
            href="/dashboard"
            className="rounded-btn border border-ui-border px-5 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-secondary transition hover:border-ink-secondary"
          >
            Open dashboard
          </Link>
        </div>
      </section>

      {/* How it works strip */}
      <section className="border-b border-ui-border py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.num}>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-action">
                {step.num}
              </p>
              <h2 className="mt-2 text-[1rem] font-bold tracking-[-0.015em] text-ink">
                {step.title}
              </h2>
              <p className="mt-2 text-[0.875rem] leading-6 text-ink-secondary">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Trust note */}
      <section className="pt-8">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Important
        </p>
        <p className="mt-2 max-w-2xl text-[0.875rem] leading-6 text-muted">
          zkNotary proves that a wallet authorized an attestation for a specific
          file hash at a specific time on Ethereum Sepolia. It does not prove
          authorship, truthfulness, or legal enforceability.
        </p>
      </section>
    </PageShell>
  );
}

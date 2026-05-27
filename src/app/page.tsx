import Link from "next/link";

import { PageShell } from "@/components/page-shell";

const steps = [
  {
    num: "01",
    title: "Upload your file",
    body: "Any file, any format. It never leaves your browser — we only use a digital fingerprint of its contents.",
  },
  {
    num: "02",
    title: "We fingerprint it",
    body: "A unique digital fingerprint is created from your document's contents. Change one character and the fingerprint changes.",
  },
  {
    num: "03",
    title: "It's recorded forever",
    body: "That fingerprint is permanently stamped on the blockchain — public, timestamped, and unchangeable.",
  },
];

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 8.5a2.5 2.5 0 003.5 0l2-2a2.5 2.5 0 00-3.5-3.5L6.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7.5a2.5 2.5 0 00-3.5 0l-2 2a2.5 2.5 0 003.5 3.5l1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5.5V8l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const trustItems = [
  { icon: <LockIcon />, text: "Your file never leaves your browser" },
  { icon: <ChainIcon />, text: "Recorded permanently on Ethereum" },
  { icon: <ClockIcon />, text: "Timestamp nobody can alter" },
];

export default function HomePage() {
  return (
    <PageShell>
      {/* Hero — negative margin pulls it flush under the nav, past main's py-10 */}
      <section
        className="relative overflow-hidden border-b border-ui-border pb-8 pt-10 -mt-10 -mx-6 px-6"
        style={{
          background: "radial-gradient(ellipse 100% 200px at 50% 0px, #fefce8 0%, transparent 75%)",
        }}
      >

        {/* Brand identity block */}
        <p className="mt-3 text-[2.75rem] font-black tracking-[-0.02em] text-ink leading-none">
          zkNotary
        </p>
        <p className="mt-1 text-[1.125rem] font-medium tracking-[0.04em] text-warm">
          Zero Knowledge Notary
        </p>

        <h1 className="mt-6 text-[clamp(1.125rem,2.5vw,1.5rem)] font-bold leading-[1.3] tracking-[-0.01em] text-ink-secondary">
          Your documents. Timestamped. Tamper-proof. Forever.
        </h1>
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-7 text-ink-secondary">
          zkNotary lets you prove that any document existed — unchanged — at a specific
          point in time. No lawyers. No paperwork. No trust required.
        </p>
        <p className="mt-3 max-w-xl text-[0.8125rem] leading-6 text-muted">
          Think of it as a receipt for your document that nobody can fake, edit, or take away.
        </p>

        {/* CTAs */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/notarize"
            className="btn-warm px-5 py-2.5"
          >
            Notarize a document
          </Link>
          <Link
            href="/verify"
            className="rounded-btn border border-ui-border px-5 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-secondary transition hover:border-ink-secondary"
          >
            Verify a document
          </Link>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-ui-border py-4">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          {trustItems.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <span className="text-warm">{icon}</span>
              <span className="text-[0.8125rem] font-medium text-ink-secondary">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-ui-border py-6">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.num}>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
                {step.num}
              </p>
              <h2 className="mt-2 text-[1rem] font-bold tracking-[-0.015em] text-ink">
                {step.title}
              </h2>
              <p className="mt-1 text-[0.875rem] leading-6 text-ink-secondary">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

    </PageShell>
  );
}

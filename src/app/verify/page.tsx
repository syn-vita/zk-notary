import { TrustBanner } from "@/components/trust-banner";

export default function VerifyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Verify
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Public verification centers a specific attestation.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This page establishes the route and trust framing for attestation-specific
            certificates. The next checkpoint will add file hashing, attestation
            lookup, multi-attestation resolution, and downloadable evidence receipts.
          </p>
        </section>

        <TrustBanner
          title="What verification will mean"
          body="zkNotary will distinguish an exact attestation match, a file hash with other attestations, no record found, and superseded-but-still-valid evidence states."
        />
      </div>
    </main>
  );
}

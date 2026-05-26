import { TrustBanner } from "@/components/trust-banner";

export default function NotarizePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Notarize
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Prepare a wallet-authorized attestation.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This foundation checkpoint wires the route, trust copy, and provider
            setup. The interactive hashing, duplicate detection, signature request,
            and sponsored relay flow land in the next checkpoint.
          </p>
        </section>

        <TrustBanner
          title="Privacy first"
          body="Original files stay in the browser. A later checkpoint will add progress-rich local hashing and a signed authorization message before the relay wallet submits the attestation."
        />
      </div>
    </main>
  );
}

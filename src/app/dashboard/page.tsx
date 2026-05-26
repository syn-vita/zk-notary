import { TrustBanner } from "@/components/trust-banner";

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Personal evidence archive for active and superseded attestations.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            The dashboard shell is in place so later checkpoints can plug in Supabase
            queries, filtering, and supersession controls without revisiting the route
            structure.
          </p>
        </section>

        <TrustBanner
          title="Superseded is not deleted"
          body="A later checkpoint will let owners mark an attestation as superseded in the app while still preserving the underlying chain record and its public timestamp."
        />
      </div>
    </main>
  );
}

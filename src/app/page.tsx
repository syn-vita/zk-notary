import Link from "next/link";

import { TrustBanner } from "@/components/trust-banner";

const actions = [
  { href: "/notarize", label: "Notarize a document" },
  { href: "/verify", label: "Verify an attestation" },
  { href: "/dashboard", label: "Open your dashboard" }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10 lg:px-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
            zkNotary beta
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-5xl">
            Wallet-authorized evidence records for files that stay local.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            zkNotary creates cryptographic proof of a document hash, the wallet that
            authorized it, and when it was attested on Ethereum Sepolia. It is built
            for evidence workflows, not as a licensed legal notary service.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-3xl border border-slate-200 bg-slate-950 px-5 py-4 text-sm font-medium text-white shadow-lg shadow-blue-900/10 transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            {action.label}
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            How it works
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Hash locally",
                body: "The original file never leaves the browser. zkNotary only works from the cryptographic hash."
              },
              {
                title: "Sign intent",
                body: "The user wallet signs a plain-English authorization message before the platform relays the record."
              },
              {
                title: "Verify later",
                body: "Anyone can inspect the attestation certificate, see the wallet, timestamp, and chain reference, and compare hashes."
              }
            ].map((step) => (
              <article
                key={step.title}
                className="rounded-3xl border border-slate-200 bg-white p-5"
              >
                <h2 className="text-lg font-semibold text-slate-950">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>
        </div>

        <TrustBanner
          title="Public beta on Sepolia"
          body="This first release is designed as a trustworthy beta. It proves wallet-authorized attestation of a file hash on a test network, but it does not by itself prove authorship, truthfulness, or universal legal enforceability."
        />
      </section>
    </main>
  );
}

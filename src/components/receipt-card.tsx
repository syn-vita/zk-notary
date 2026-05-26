import { CertificateActions } from "@/components/certificate-actions";
import Link from "next/link";

import type { PublicAttestationRecord } from "@/lib/domain";

type ReceiptCardProps = {
  record: PublicAttestationRecord;
};

export function ReceiptCard({ record }: ReceiptCardProps) {
  const superseded = record.status === "superseded";

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-8 shadow-xl shadow-blue-950/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            Attestation receipt
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Proof-only attestation receipt
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This receipt confirms that zkNotary recorded a wallet-authorized
            attestation for the file hash below on Ethereum Sepolia. Private file
            metadata remains visible only in owner-only views.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            superseded
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {superseded ? "Superseded context" : "Active attestation"}
        </span>
      </div>

      <dl className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ["Attestation reference", record.attestationRef],
          ["Wallet", record.attestingWallet],
          ["Transaction", record.txHash],
          ["Network", `${record.networkName} (${record.chainId})`],
          ["Document hash", record.documentHash],
          ["Recorded at", new Date(record.notarizedAt).toLocaleString()]
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {label}
            </dt>
            <dd className="mt-2 break-all text-sm leading-6 text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {superseded && record.publicSupersededNote ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Owner note</p>
          <p className="mt-1">{record.publicSupersededNote}</p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/verify?ref=${encodeURIComponent(record.attestationRef)}`}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
        >
          Open verification view
        </Link>
        <a
          href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          View transaction
        </a>
      </div>

      <CertificateActions record={record} variant="receipt" />
    </section>
  );
}

import Link from "next/link";

import { CertificateActions } from "@/components/certificate-actions";
import { DataField } from "@/components/data-field";
import type { PublicAttestationRecord } from "@/lib/domain";

type ReceiptCardProps = {
  record: PublicAttestationRecord;
};

export function ReceiptCard({ record }: ReceiptCardProps) {
  const superseded = record.status === "superseded";

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            Attestation receipt
          </p>
          <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.025em] text-ink">
            Proof-only attestation receipt.
          </h1>
          <p className="mt-3 max-w-2xl text-[0.875rem] leading-6 text-ink-secondary">
            This receipt confirms zkNotary recorded a wallet-authorized
            attestation for the file hash below on Ethereum Sepolia. Private
            file metadata remains visible only in owner-only views.
          </p>
        </div>
        <span
          className={`rounded-btn px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] ${
            superseded
              ? "bg-warning/10 text-warning"
              : "bg-success/10 text-success"
          }`}
        >
          {superseded ? "Superseded" : "Active"}
        </span>
      </div>

      <dl className="mt-8 grid gap-3 md:grid-cols-2">
        <DataField
          label="Owner-provided public name"
          value={record.publicDisplayName ?? "Not shared"}
        />
        <DataField label="Attestation reference" value={record.attestationRef} mono />
        <DataField label="Wallet" value={record.attestingWallet} mono />
        <DataField label="Transaction" value={record.txHash} mono />
        <DataField
          label="Network"
          value={`${record.networkName} (${record.chainId})`}
        />
        <DataField label="Document hash" value={record.documentHash} mono />
        <DataField
          label="Recorded at"
          value={new Date(record.notarizedAt).toLocaleString()}
        />
      </dl>

      {superseded && record.publicSupersededNote ? (
        <div className="mt-6 rounded-card border border-warning/30 bg-warning/5 px-4 py-4 text-[0.875rem] leading-6 text-warning">
          <p className="font-semibold">Owner note</p>
          <p className="mt-1">{record.publicSupersededNote}</p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/verify?ref=${encodeURIComponent(record.attestationRef)}`}
          className="rounded-btn bg-action px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-action/90"
        >
          Open verification view
        </Link>
        <a
          href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-btn border border-ui-border px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-secondary transition hover:border-ink-secondary"
        >
          View transaction
        </a>
      </div>

      <CertificateActions record={record} variant="receipt" />
    </section>
  );
}

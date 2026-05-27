import Link from "next/link";

import { CertificateActions } from "@/components/certificate-actions";
import type { PublicAttestationRecord } from "@/lib/domain";

type ReceiptCardProps = {
  record: PublicAttestationRecord;
};

type RowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function Row({ label, value, mono = false }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-ui-border last:border-0">
      <span className="shrink-0 text-[0.8125rem] font-medium text-ink-secondary">
        {label}
      </span>
      <span
        className={`text-right break-all text-[0.8125rem] leading-6 ${
          mono ? "font-mono text-accent" : "text-ink font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ReceiptCard({ record }: ReceiptCardProps) {
  const superseded = record.status === "superseded";

  return (
    <section>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
            Notarization receipt
          </p>
          <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.025em] text-ink">
            Your proof is on-chain.
          </h1>
          <p className="mt-3 max-w-2xl text-[0.875rem] leading-6 text-ink-secondary">
            Permanently recorded on Ethereum. Share this page as proof that your document existed, unchanged, at this moment in time.
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

      {/* Receipt rows */}
      <div className="mt-8 rounded-card border border-ui-border bg-base shadow-card">
        <div className="border-b border-ui-border px-5 py-3">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            Proof details
          </p>
        </div>
        <div className="px-5">
          <Row label="Recorded at" value={new Date(record.notarizedAt).toLocaleString()} />
          <Row label="Proof reference" value={record.attestationRef} mono />
          <Row label="Document fingerprint" value={record.documentHash} mono />
          <Row label="Notarized by" value={record.attestingWallet} mono />
          <Row label="Transaction" value={record.txHash} mono />
          <Row label="Network" value={`${record.networkName} (${record.chainId})`} />
          {record.publicDisplayName ? (
            <Row label="Public name" value={record.publicDisplayName} />
          ) : null}
        </div>
      </div>

      {superseded && record.publicSupersededNote ? (
        <div className="mt-4 rounded-card border border-warning/30 bg-warning/5 px-4 py-4 text-[0.875rem] leading-6 text-warning">
          <p className="font-semibold">Owner note</p>
          <p className="mt-1">{record.publicSupersededNote}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/verify?ref=${encodeURIComponent(record.attestationRef)}`}
          className="btn-warm px-4 py-2"
        >
          Verify this proof
        </Link>
        <a
          href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-btn border border-ui-border px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-secondary transition hover:border-ink-secondary"
        >
          View transaction
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <CertificateActions record={record} variant="receipt" />
    </section>
  );
}

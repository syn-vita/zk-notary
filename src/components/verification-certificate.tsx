import { CertificateActions } from "@/components/certificate-actions";
import { DataField } from "@/components/data-field";
import type { PublicAttestationRecord, VerificationOutcome } from "@/lib/domain";
import { buildVerificationSummary } from "@/lib/verify";

type VerificationCertificateProps = {
  outcome: VerificationOutcome;
  record: PublicAttestationRecord;
  relatedRecords: PublicAttestationRecord[];
};

function outcomeStyle(outcome: VerificationOutcome): {
  badge: string;
  className: string;
} {
  switch (outcome) {
    case "exact-attestation":
      return { badge: "Proof verified", className: "bg-success/10 text-success" };
    case "hash-with-other-attestations":
      return { badge: "Multiple proofs found", className: "bg-action/10 text-action" };
    case "superseded-valid":
      return { badge: "Superseded — still valid", className: "bg-warning/10 text-warning" };
    default:
      return { badge: "Verification result", className: "bg-surface text-ink-secondary" };
  }
}

export function VerificationCertificate({
  outcome,
  record,
  relatedRecords,
}: VerificationCertificateProps) {
  const style = outcomeStyle(outcome);
  const summaryRecord = {
    ...record,
    id: "",
    userId: "",
    authorizationDigest: "",
    fileName: "",
    fileType: null,
    description: null,
    tags: [],
    privateSupersededNote: null,
    createdAt: record.notarizedAt,
  };

  return (
    <section className="rounded-card border border-ui-border bg-base p-8 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
            Public certificate
          </p>
          <h2 className="mt-2 text-[1.25rem] font-bold tracking-[-0.015em] text-ink">
            Proof of notarization
          </h2>
          <p className="mt-3 max-w-2xl text-[0.875rem] leading-6 text-ink-secondary">
            {buildVerificationSummary(summaryRecord)}
          </p>
        </div>
        <span
          className={`rounded-btn px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] ${style.className}`}
        >
          {style.badge}
        </span>
      </div>

      <dl className="mt-8 grid gap-3 md:grid-cols-2">
        <DataField
          label="Owner-provided public name"
          value={record.publicDisplayName ?? "Not shared"}
        />
        <DataField label="Proof reference" value={record.attestationRef} mono />
        <DataField label="Document fingerprint" value={record.documentHash} mono />
        <DataField label="Wallet" value={record.attestingWallet} mono />
        <DataField
          label="Recorded at"
          value={new Date(record.notarizedAt).toLocaleString()}
        />
        <DataField
          label="Network"
          value={`${record.networkName} (${record.chainId})`}
        />
        <DataField label="Transaction" value={record.txHash} mono />
      </dl>

      {record.status === "superseded" && record.publicSupersededNote ? (
        <div className="mt-6 rounded-card border border-warning/30 bg-warning/5 px-4 py-4 text-[0.875rem] leading-6 text-warning">
          <p className="font-semibold">Superseded context</p>
          <p className="mt-1">{record.publicSupersededNote}</p>
        </div>
      ) : null}

      {relatedRecords.length > 0 ? (
        <div className="mt-8 rounded-card border border-ui-border bg-surface px-5 py-5">
          <p className="text-[0.875rem] font-semibold text-ink">
            Other notarizations for the same document
          </p>
          <ul className="mt-3 space-y-3">
            {relatedRecords.map((related) => (
              <li
                key={related.attestationRef}
                className="rounded-card bg-base px-4 py-3 text-[0.875rem] leading-6 text-ink-secondary"
              >
                <p className="font-medium text-ink">{related.attestingWallet}</p>
                <p>{new Date(related.notarizedAt).toLocaleString()}</p>
                <p className="break-all font-mono text-[0.75rem] text-accent">
                  {related.attestationRef}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CertificateActions record={record} variant="certificate" />
    </section>
  );
}

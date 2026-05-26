import type { PublicAttestationRecord, VerificationOutcome } from "@/lib/domain";
import { buildVerificationSummary } from "@/lib/verify";

type VerificationCertificateProps = {
  outcome: VerificationOutcome;
  record: PublicAttestationRecord;
  relatedRecords: PublicAttestationRecord[];
};

function outcomeLabel(outcome: VerificationOutcome) {
  switch (outcome) {
    case "exact-attestation":
      return {
        badge: "Verified attestation",
        tone: "bg-emerald-100 text-emerald-800"
      };
    case "hash-with-other-attestations":
      return {
        badge: "Multiple attestations found",
        tone: "bg-blue-100 text-blue-800"
      };
    case "superseded-valid":
      return {
        badge: "Superseded but valid",
        tone: "bg-amber-100 text-amber-800"
      };
    default:
      return {
        badge: "Verification result",
        tone: "bg-slate-100 text-slate-800"
      };
  }
}

export function VerificationCertificate({
  outcome,
  record,
  relatedRecords
}: VerificationCertificateProps) {
  const label = outcomeLabel(outcome);
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
    createdAt: record.notarizedAt
  };

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-8 shadow-xl shadow-blue-950/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            Public certificate
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            Proof of attestation
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {buildVerificationSummary(summaryRecord)}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${label.tone}`}>
          {label.badge}
        </span>
      </div>

      <dl className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ["Attestation reference", record.attestationRef],
          ["Document hash", record.documentHash],
          ["Wallet", record.attestingWallet],
          ["Recorded at", new Date(record.notarizedAt).toLocaleString()],
          ["Network", `${record.networkName} (${record.chainId})`],
          ["Transaction", record.txHash]
        ].map(([labelText, value]) => (
          <div
            key={labelText}
            className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {labelText}
            </dt>
            <dd className="mt-2 break-all text-sm leading-6 text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {record.status === "superseded" && record.publicSupersededNote ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Superseded context</p>
          <p className="mt-1">{record.publicSupersededNote}</p>
        </div>
      ) : null}

      {relatedRecords.length ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <p className="text-sm font-semibold text-slate-900">
            Other attestations for the same file hash
          </p>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            {relatedRecords.map((related) => (
              <li key={related.attestationRef} className="rounded-2xl bg-white px-4 py-3">
                <p className="font-medium text-slate-900">{related.attestingWallet}</p>
                <p>{new Date(related.notarizedAt).toLocaleString()}</p>
                <p className="break-all text-xs uppercase tracking-[0.12em] text-slate-500">
                  {related.attestationRef}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

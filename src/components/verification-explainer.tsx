type VerificationExplainerProps = {
  outcome: "exact-attestation" | "hash-with-other-attestations" | "not-found" | "superseded-valid";
};

const copy = {
  "exact-attestation":
    "This certificate points to a specific attestation reference. Reviewers can compare the file hash, wallet, timestamp, and transaction link.",
  "hash-with-other-attestations":
    "The uploaded file hash matches more than one attestation. zkNotary highlights one record and lists the others so reviewers can inspect each wallet and timestamp.",
  "superseded-valid":
    "The chain proof is still valid, but the attestation owner has marked this record as superseded in the application layer.",
  "not-found":
    "No matching attestation record was found for the supplied reference or file hash.",
} as const;

export function VerificationExplainer({ outcome }: VerificationExplainerProps) {
  return (
    <details className="mt-8 rounded-card border border-ui-border bg-base p-6 shadow-card">
      <summary className="cursor-pointer text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-action">
        Verification explainer
      </summary>
      <p className="mt-4 text-[0.875rem] leading-6 text-ink-secondary">{copy[outcome]}</p>
      <p className="mt-3 text-[0.875rem] leading-6 text-ink-secondary">
        zkNotary proves that a wallet-authorized attestation for this file hash
        was recorded on Sepolia. It does not prove authorship, truthfulness, or
        legal validity by itself.
      </p>
    </details>
  );
}

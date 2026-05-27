type VerificationExplainerProps = {
  outcome: "exact-attestation" | "hash-with-other-attestations" | "not-found" | "superseded-valid";
};

const copy = {
  "exact-attestation":
    "This proof is tied to a specific notarization. Anyone can confirm the document fingerprint, the wallet that signed it, and the exact time it was recorded.",
  "hash-with-other-attestations":
    "The document you uploaded matches more than one notarization record. zkNotary highlights one and lists the others so you can inspect each one.",
  "superseded-valid":
    "The proof is still valid on-chain, but the owner has marked this record as superseded — meaning they've replaced or updated it.",
  "not-found":
    "No notarization record was found for this document or reference code.",
} as const;

export function VerificationExplainer({ outcome }: VerificationExplainerProps) {
  return (
    <details className="mt-8 rounded-card border border-ui-border bg-base p-6 shadow-card">
      <summary className="cursor-pointer text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-action">
        What does this proof mean?
      </summary>
      <p className="mt-4 text-[0.875rem] leading-6 text-ink-secondary">{copy[outcome]}</p>
      <p className="mt-3 text-[0.875rem] leading-6 text-ink-secondary">
        zkNotary proves a document fingerprint was recorded on Ethereum at a specific
        time. It doesn't prove authorship, truthfulness, or legal validity on its own.
      </p>
    </details>
  );
}

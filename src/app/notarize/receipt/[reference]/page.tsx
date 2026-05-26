import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { ReceiptCard } from "@/components/receipt-card";
import { TrustBanner } from "@/components/trust-banner";
import { toPublicAttestationView } from "@/lib/records";
import { getAttestationRecordByRef } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ReceiptPageProps = {
  params: Promise<{ reference: string }>;
};

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { reference } = await params;
  const decodedReference = decodeURIComponent(reference);
  const record = await getAttestationRecordByRef(decodedReference);

  return (
    <PageShell showBack>
      <div className="mx-auto max-w-[720px]">
        {record ? (
          <>
            <ReceiptCard record={toPublicAttestationView(record)} />
            <TrustBanner
              title="Independent verification"
              body="The receipt page is a convenience surface. Reviewers can still inspect the transaction reference directly on Sepolia or re-run a file hash and compare it with the attested hash."
            />
          </>
        ) : (
          <section className="rounded-card border border-ui-border bg-base p-8 shadow-card">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
              Attestation receipt
            </p>
            <h1 className="mt-3 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
              Receipt not available yet
            </h1>
            <p className="mt-4 max-w-2xl text-[0.875rem] leading-7 text-ink-secondary">
              We could not load a stored attestation record for this reference.
              Make sure the Supabase service role credentials are configured and
              that the attestation completed successfully.
            </p>
            <Link
              href="/notarize"
              className="mt-6 inline-flex rounded-btn bg-action px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white"
            >
              Back to notarize
            </Link>
          </section>
        )}
      </div>
    </PageShell>
  );
}

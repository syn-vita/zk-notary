import Link from "next/link";

import { PageNav } from "@/components/page-nav";
import { ReceiptCard } from "@/components/receipt-card";
import { TrustBanner } from "@/components/trust-banner";
import { toPublicAttestationView } from "@/lib/records";
import { getAttestationRecordByRef } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ReceiptPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { reference } = await params;
  const decodedReference = decodeURIComponent(reference);
  const record = await getAttestationRecordByRef(decodedReference);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 lg:px-10">
      <PageNav backLabel="Back" homeLabel="Main page" />
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.95fr]">
        {record ? (
          <ReceiptCard record={toPublicAttestationView(record)} />
        ) : (
          <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-8 shadow-xl shadow-blue-950/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Attestation receipt
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              Receipt not available yet
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              We could not load a stored attestation record for this reference. Make
              sure the Supabase service role credentials are configured and that the
              attestation completed successfully.
            </p>
            <Link
              href="/notarize"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              Back to notarize
            </Link>
          </section>
        )}

        <TrustBanner
          title="Independent verification"
          body="The receipt page is a convenience surface. Reviewers can still inspect the transaction reference directly on Sepolia or re-run a file hash and compare it with the attested hash."
        />
      </div>
    </main>
  );
}

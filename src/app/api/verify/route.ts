import { NextResponse } from "next/server";
import { z } from "zod";

import type { VerificationLookupResponse } from "@/lib/domain";
import { toPublicAttestationView } from "@/lib/records";
import {
  getAttestationRecordByRef,
  getAttestationRecordsByHash
} from "@/lib/supabase";
import { resolveVerificationOutcome } from "@/lib/verify";

const querySchema = z.object({
  ref: z
    .string()
    .regex(/^eip155:\d+:0x[a-fA-F0-9]{64}:\d+$/)
    .optional(),
  hash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional()
});

export async function GET(request: Request) {
  const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parseResult = querySchema.safeParse(rawQuery);

  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid verification query." }, { status: 400 });
  }

  const query = parseResult.data;
  if (!query.ref && !query.hash) {
    return NextResponse.json({ error: "A reference or hash is required." }, { status: 400 });
  }

  let matches = query.hash ? await getAttestationRecordsByHash(query.hash) : [];

  if (query.ref) {
    const exactRecord = await getAttestationRecordByRef(query.ref);

    if (exactRecord) {
      if (!query.hash) {
        matches = await getAttestationRecordsByHash(exactRecord.documentHash);
      } else if (!matches.some((record) => record.attestationRef === exactRecord.attestationRef)) {
        matches = [exactRecord, ...matches];
      }
    }
  }

  const resolved = resolveVerificationOutcome({
    requestedRef: query.ref ?? null,
    matches
  });

  const payload: VerificationLookupResponse = {
    outcome: resolved.outcome,
    primaryRecord: resolved.primaryRecord
      ? toPublicAttestationView(resolved.primaryRecord)
      : null,
    relatedRecords: resolved.relatedRecords.map(toPublicAttestationView),
    query: {
      attestationRef: query.ref ?? null,
      documentHash: query.hash ?? resolved.primaryRecord?.documentHash ?? null
    }
  };

  return NextResponse.json(payload);
}

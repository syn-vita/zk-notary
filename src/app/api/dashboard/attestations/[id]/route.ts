import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrivyServerClient } from "@/lib/privy-server";
import { supersedeAttestationRecord } from "@/lib/supabase";

const supersedeSchema = z.object({
  publicSupersededNote: z.string().trim().max(280).nullable(),
  privateSupersededNote: z.string().trim().max(500).nullable()
});

type SupersedeRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: SupersedeRouteProps) {
  const authHeader = request.headers.get("authorization");
  const authToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!authToken) {
    return NextResponse.json({ error: "Missing Privy access token." }, { status: 401 });
  }

  const privy = getPrivyServerClient();
  if (!privy) {
    return NextResponse.json({ error: "Privy server client is not configured." }, { status: 503 });
  }

  const parseResult = supersedeSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid supersession payload." }, { status: 400 });
  }

  try {
    const claims = await privy.utils().auth().verifyAuthToken(authToken);
    const { id } = await params;

    const updated = await supersedeAttestationRecord({
      id,
      userId: claims.user_id,
      publicSupersededNote: parseResult.data.publicSupersededNote,
      privateSupersededNote: parseResult.data.privateSupersededNote
    });

    if (!updated) {
      return NextResponse.json({ error: "Attestation not found." }, { status: 404 });
    }

    return NextResponse.json({ record: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not update attestation."
      },
      { status: 500 }
    );
  }
}

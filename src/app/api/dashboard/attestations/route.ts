import { NextResponse } from "next/server";

import type { DashboardListResponse } from "@/lib/domain";
import { getPrivyServerClient } from "@/lib/privy-server";
import { getAttestationRecordsByUser } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const authToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!authToken) {
    return NextResponse.json({ error: "Missing Privy access token." }, { status: 401 });
  }

  const privy = getPrivyServerClient();
  if (!privy) {
    return NextResponse.json({ error: "Privy server client is not configured." }, { status: 503 });
  }

  try {
    const claims = await privy.utils().auth().verifyAuthToken(authToken);
    const records = await getAttestationRecordsByUser(claims.user_id);
    const payload: DashboardListResponse = { records };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load owner attestations."
      },
      { status: 500 }
    );
  }
}

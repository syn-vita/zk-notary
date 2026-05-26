import { NextResponse } from "next/server";
import { z } from "zod";

import type { UserProfileResponse } from "@/lib/domain";
import { getPrivyServerClient } from "@/lib/privy-server";
import { getProfileByUserId, upsertProfile } from "@/lib/supabase";

export const runtime = "nodejs";

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80)
});

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.replace(/^Bearer\s+/i, "");
}

export async function GET(request: Request) {
  const authToken = getBearerToken(request);

  if (!authToken) {
    return NextResponse.json({ error: "Missing Privy access token." }, { status: 401 });
  }

  const privy = getPrivyServerClient();
  if (!privy) {
    return NextResponse.json({ error: "Privy server client is not configured." }, { status: 503 });
  }

  try {
    const claims = await privy.utils().auth().verifyAuthToken(authToken);
    const profile = await getProfileByUserId(claims.user_id);
    const payload: UserProfileResponse = { profile };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load profile."
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const authToken = getBearerToken(request);

  if (!authToken) {
    return NextResponse.json({ error: "Missing Privy access token." }, { status: 401 });
  }

  const privy = getPrivyServerClient();
  if (!privy) {
    return NextResponse.json({ error: "Privy server client is not configured." }, { status: 503 });
  }

  const parseResult = profileSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid display name payload." }, { status: 400 });
  }

  try {
    const claims = await privy.utils().auth().verifyAuthToken(authToken);
    const profile = await upsertProfile({
      userId: claims.user_id,
      displayName: parseResult.data.displayName
    });

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not save profile."
      },
      { status: 500 }
    );
  }
}

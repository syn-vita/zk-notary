import { PrivyClient } from "@privy-io/node";

import { publicEnv, serverEnv } from "@/lib/env";

export function getPrivyServerClient() {
  if (!publicEnv.NEXT_PUBLIC_PRIVY_APP_ID || !serverEnv.PRIVY_APP_SECRET) {
    return null;
  }

  return new PrivyClient({
    appId: publicEnv.NEXT_PUBLIC_PRIVY_APP_ID,
    appSecret: serverEnv.PRIVY_APP_SECRET,
    jwtVerificationKey: serverEnv.PRIVY_VERIFICATION_KEY
  });
}

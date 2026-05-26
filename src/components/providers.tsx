"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

import { publicEnv } from "@/lib/env";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const appId = publicEnv.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = publicEnv.NEXT_PUBLIC_PRIVY_CLIENT_ID;

  if (!appId || !clientId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        appearance: {
          accentColor: "#155eef",
          theme: "light"
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets"
          }
        },
        loginMethods: ["wallet", "email", "google"]
      }}
    >
      {children}
    </PrivyProvider>
  );
}

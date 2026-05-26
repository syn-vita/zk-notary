"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";

import { TrustBanner } from "@/components/trust-banner";
import { buildAuthorizationMessage, createAttestationReference } from "@/lib/attestations";
import {
  type DuplicateCheckResponse,
  type NotarizeProfileResponse,
  type NotarizeResponse,
  type UserProfile
} from "@/lib/domain";
import { publicEnv } from "@/lib/env";
import { hashFile } from "@/lib/hash";
import {
  computeAuthorizationDigest,
  normalizeTags
} from "@/lib/notarize";
import { resolvePublicDisplayNameSnapshot } from "@/lib/profile";

type HashState =
  | { status: "idle"; progress: 0; hash: null; error: null }
  | { status: "hashing"; progress: number; hash: null; error: null }
  | { status: "ready"; progress: 100; hash: string; error: null }
  | { status: "error"; progress: number; hash: null; error: string };

type ProfileState =
  | { status: "idle" | "loading"; profile: UserProfile | null; error: null }
  | { status: "ready"; profile: UserProfile | null; error: null }
  | { status: "error"; profile: UserProfile | null; error: string };

const duplicateMessages: Record<DuplicateCheckResponse["status"], string> = {
  "not-found": "No prior attestations found for this hash.",
  "already-by-you": "This wallet has already attested the same file hash.",
  "already-by-others": "This file hash already has attestations from other wallets.",
  "unavailable": "Duplicate checks are unavailable until Sepolia and contract settings are configured."
};

function formatStatusLabel(input: {
  hashState: HashState["status"];
  duplicateState: "idle" | "checking" | "ready" | "error";
  submitState: "idle" | "authorizing" | "submitting" | "success" | "error";
}): string {
  if (input.submitState === "authorizing") {
    return "Waiting for wallet authorization...";
  }

  if (input.submitState === "submitting") {
    return "Submitting the sponsored attestation...";
  }

  if (input.submitState === "success") {
    return "Attestation recorded.";
  }

  if (input.hashState === "hashing") {
    return "Hashing the file locally...";
  }

  if (input.duplicateState === "checking") {
    return "Checking for existing attestations...";
  }

  return "Ready for attestation.";
}

function ConfigNotice() {
  return (
    <div className="space-y-8">
      <section className="rounded-card border border-ui-border bg-base p-8 shadow-card">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Notarize
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
          Configure Privy before testing the notarize flow.
        </h1>
        <p className="mt-4 max-w-2xl text-[0.875rem] leading-7 text-ink-secondary">
          The live notarization experience depends on{" "}
          <code className="font-mono text-accent">NEXT_PUBLIC_PRIVY_APP_ID</code> and{" "}
          <code className="font-mono text-accent">NEXT_PUBLIC_PRIVY_CLIENT_ID</code>. Once
          those are set, this page will enable wallet login, local hashing, signed
          authorization, and sponsored relay submission.
        </p>
      </section>

      <TrustBanner
        title="What already works"
        body="The full client and API flow for hashing, authorization, duplicate checks, and receipt generation is implemented in this checkpoint. It activates automatically when the required runtime credentials are present."
      />
    </div>
  );
}

export function NotarizeWorkbench() {
  const privyConfigured = Boolean(
    publicEnv.NEXT_PUBLIC_PRIVY_APP_ID && publicEnv.NEXT_PUBLIC_PRIVY_CLIENT_ID
  );

  if (!privyConfigured) {
    return <ConfigNotice />;
  }

  return <NotarizeFlow />;
}

function NotarizeFlow() {
  const router = useRouter();
  const { ready, authenticated, login, user, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signMessage } = useSignMessage();

  const preferredWallet =
    wallets.find((wallet) => wallet.type === "ethereum" && wallet.linked) ??
    wallets.find((wallet) => wallet.type === "ethereum");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [hashState, setHashState] = useState<HashState>({
    status: "idle",
    progress: 0,
    hash: null,
    error: null
  });
  const [duplicateState, setDuplicateState] = useState<
    { state: "idle" | "checking" | "error"; result: null; error: string | null } |
      { state: "ready"; result: DuplicateCheckResponse; error: null }
  >({
    state: "idle",
    result: null,
    error: null
  });
  const [submitState, setSubmitState] = useState<
    "idle" | "authorizing" | "submitting" | "success" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>({
    status: "idle",
    profile: null,
    error: null
  });
  const [shareDisplayNamePublicly, setShareDisplayNamePublicly] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) {
      setProfileState({
        status: "idle",
        profile: null,
        error: null
      });
      setShareDisplayNamePublicly(false);
      return;
    }

    let active = true;
    setProfileState({
      status: "loading",
      profile: null,
      error: null
    });

    void getAccessToken()
      .then((token) => {
        if (!token) {
          throw new Error("Missing Privy access token.");
        }

        return fetch("/api/dashboard/profile", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      })
      .then(async (response) => {
        const payload = (await response.json()) as NotarizeProfileResponse | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error : "Could not load profile.");
        }

        if (!active) {
          return;
        }

        setProfileState({
          status: "ready",
          profile: payload.profile,
          error: null
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setProfileState({
          status: "error",
          profile: null,
          error: error instanceof Error ? error.message : "Could not load profile."
        });
      });

    return () => {
      active = false;
    };
  }, [authenticated, getAccessToken, ready]);

  useEffect(() => {
    if (!selectedFile) {
      setHashState({
        status: "idle",
        progress: 0,
        hash: null,
        error: null
      });
      setDuplicateState({
        state: "idle",
        result: null,
        error: null
      });
      return;
    }

    let active = true;
    setHashState({
      status: "hashing",
      progress: 0,
      hash: null,
      error: null
    });
    setDuplicateState({
      state: "idle",
      result: null,
      error: null
    });

    void hashFile(selectedFile, (progress) => {
      if (!active) {
        return;
      }

      setHashState({
        status: "hashing",
        progress,
        hash: null,
        error: null
      });
    })
      .then((documentHash) => {
        if (!active) {
          return;
        }

        setHashState({
          status: "ready",
          progress: 100,
          hash: documentHash,
          error: null
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setHashState({
          status: "error",
          progress: 0,
          hash: null,
          error: error instanceof Error ? error.message : "Hashing failed."
        });
      });

    return () => {
      active = false;
    };
  }, [selectedFile]);

  useEffect(() => {
    if (hashState.status !== "ready") {
      return;
    }

    let active = true;
    setDuplicateState({
      state: "checking",
      result: null,
      error: null
    });

    const params = new URLSearchParams({
      hash: hashState.hash
    });

    if (preferredWallet?.address) {
      params.set("wallet", preferredWallet.address);
    }

    void fetch(`/api/notarize/check?${params.toString()}`)
      .then(async (response) => {
        const payload = (await response.json()) as DuplicateCheckResponse | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error : "Duplicate check failed.");
        }

        if (!active) {
          return;
        }

        setDuplicateState({
          state: "ready",
          result: payload,
          error: null
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setDuplicateState({
          state: "error",
          result: null,
          error: error instanceof Error ? error.message : "Duplicate check failed."
        });
      });

    return () => {
      active = false;
    };
  }, [hashState, preferredWallet?.address]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ready) {
      setSubmitState("error");
      setSubmitError("Authentication is still loading.");
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    if (!selectedFile || hashState.status !== "ready" || !user || !preferredWallet) {
      setSubmitState("error");
      setSubmitError("A linked Ethereum wallet and a hashed file are required.");
      return;
    }

    try {
      setSubmitError(null);
      setSubmitState("authorizing");

      const nonce = crypto.randomUUID();
      const authorizationMessage = buildAuthorizationMessage({
        appName: "zkNotary",
        chainName: publicEnv.NEXT_PUBLIC_CHAIN_NAME,
        documentHash: hashState.hash,
        walletAddress: preferredWallet.address,
        nonce
      });

      const { signature } = await signMessage(
        { message: authorizationMessage },
        {
          address: preferredWallet.address,
          uiOptions: {
            title: "Authorize this attestation"
          }
        }
      );

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Missing Privy access token.");
      }

      setSubmitState("submitting");
      const response = await fetch("/api/notarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: user.id,
          documentHash: hashState.hash,
          walletAddress: preferredWallet.address,
          authorizationMessage,
          authorizationSignature: signature,
          authorizationDigest: computeAuthorizationDigest(authorizationMessage),
          fileName: selectedFile.name,
          fileType: selectedFile.type || null,
          description: description.trim() || null,
          tags: normalizeTags(tagInput),
          shareDisplayNamePublicly,
          nonce
        })
      });

      const payload = (await response.json()) as NotarizeResponse | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Notarization failed.");
      }

      setSubmitState("success");
      startTransition(() => {
        router.push(payload.receiptPath);
      });
    } catch (error: unknown) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "Notarization failed.");
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-card border border-ui-border bg-base p-8 shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
              Notarize
            </p>
            <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
              Create a wallet-authorized evidence record.
            </h1>
          </div>
          <div className="rounded-card border border-ui-border bg-surface px-4 py-3">
            <p className="text-[0.875rem] font-semibold text-ink">
              {preferredWallet?.address ?? "No wallet linked"}
            </p>
            <p className="mt-1 text-[0.875rem] text-ink-secondary">
              {authenticated ? "Signed in with Privy" : "Sign in required before submission"}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <label className="block rounded-card border border-dashed border-tint bg-surface p-6">
            <span className="text-[0.875rem] font-semibold text-ink">Choose a document</span>
            <p className="mt-2 text-[0.875rem] leading-6 text-ink-secondary">
              The original file stays in your browser. Only the hash and selected
              metadata are sent.
            </p>
            <input
              type="file"
              className="mt-4 block w-full text-[0.875rem] text-ink-secondary"
              onChange={(event) => {
                setSubmitState("idle");
                setSubmitError(null);
                setSelectedFile(event.currentTarget.files?.[0] ?? null);
              }}
            />
          </label>

          <div className="rounded-card border border-ui-border bg-surface px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.875rem] font-semibold text-ink">Hashing progress</p>
                <p className="mt-1 text-[0.875rem] text-ink-secondary">
                  {formatStatusLabel({
                    hashState: hashState.status,
                    duplicateState: duplicateState.state,
                    submitState
                  })}
                </p>
              </div>
              <p className="text-[0.875rem] font-bold text-action">{hashState.progress}%</p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-ui-border">
              <div
                className="h-2 rounded-full bg-action transition-all"
                style={{ width: `${hashState.progress}%` }}
              />
            </div>
            {hashState.status === "ready" ? (
              <p className="mt-4 break-all font-mono text-[0.75rem] text-accent">{hashState.hash}</p>
            ) : null}
            {hashState.status === "error" ? (
              <p className="mt-4 text-[0.875rem] text-ui-error">{hashState.error}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block rounded-card border border-ui-border bg-surface px-5 py-4">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={4}
                className="mt-3 w-full resize-none rounded-btn border border-ui-border bg-base px-4 py-3 text-[0.875rem] text-ink outline-none focus:border-action"
                placeholder="Optional context for the receipt"
              />
            </label>

            <label className="block rounded-card border border-ui-border bg-surface px-5 py-4">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                Tags
              </span>
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.currentTarget.value)}
                className="mt-3 w-full rounded-btn border border-ui-border bg-base px-4 py-3 text-[0.875rem] text-ink outline-none focus:border-action"
                placeholder="Legal, Academic, Personal"
              />
              <p className="mt-3 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                {normalizeTags(tagInput).join(" · ") || "No tags yet"}
              </p>
            </label>
          </div>

          <div className="rounded-card border border-ui-border bg-surface px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.875rem] font-semibold text-ink">
                  Public display name
                </p>
                <p className="mt-1 text-[0.875rem] leading-6 text-ink-secondary">
                  Optionally attach your current private display name to this single
                  attestation. The name is copied as a public snapshot only for this
                  record and will not change if you edit your profile later.
                </p>
              </div>
              <label className="inline-flex items-center gap-3 text-[0.875rem] font-medium text-ink">
                <input
                  type="checkbox"
                  checked={shareDisplayNamePublicly}
                  disabled={!resolvePublicDisplayNameSnapshot({
                    profile: profileState.profile,
                    shareDisplayNamePublicly: true
                  })}
                  onChange={(event) => setShareDisplayNamePublicly(event.currentTarget.checked)}
                  className="h-4 w-4 rounded border-ui-border accent-action"
                />
                Share name publicly
              </label>
            </div>
            <div className="mt-3 rounded-btn border border-ui-border bg-base px-4 py-3 text-[0.875rem] text-ink-secondary">
              {profileState.status === "loading"
                ? "Loading your saved private display name..."
                : profileState.profile?.displayName
                  ? `Current private display name: ${profileState.profile.displayName}`
                  : "No private display name is saved yet. Add one in your dashboard before opting in."}
            </div>
            {profileState.status === "error" ? (
              <p className="mt-3 text-[0.875rem] text-ui-error">{profileState.error}</p>
            ) : null}
            {!profileState.profile?.displayName ? (
              <p className="mt-3 text-[0.875rem] text-ink-secondary">
                You can save a private display name from the dashboard and then choose
                whether to expose it on future attestations.
              </p>
            ) : null}
          </div>

          <div className="rounded-card border border-ui-border bg-surface px-5 py-4">
            <p className="text-[0.875rem] font-semibold text-ink">Duplicate status</p>
            {duplicateState.state === "ready" ? (
              <div className="mt-3 space-y-2 text-[0.875rem] leading-6 text-ink-secondary">
                <p>{duplicateMessages[duplicateState.result.status]}</p>
                <p>Existing attestations: {duplicateState.result.attestationCount}</p>
              </div>
            ) : duplicateState.state === "error" ? (
              <p className="mt-3 text-[0.875rem] text-ui-error">{duplicateState.error}</p>
            ) : (
              <p className="mt-3 text-[0.875rem] text-ink-secondary">
                {hashState.status === "ready"
                  ? "Checking the registry..."
                  : "Hash a file to check existing attestations."}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={
              submitState === "authorizing" ||
              submitState === "submitting" ||
              hashState.status !== "ready" ||
              !walletsReady
            }
            className="rounded-btn bg-action px-5 py-2.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-action/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {authenticated ? "Authorize and notarize" : "Sign in to notarize"}
          </button>

          {submitError ? (
            <p className="text-[0.875rem] text-ui-error">{submitError}</p>
          ) : null}
        </div>
      </form>

      <TrustBanner
        title="What this proof means"
        body="zkNotary proves that a wallet authorized an attestation for this exact file hash at a specific time on Sepolia. It does not, by itself, prove authorship or legal validity."
      />

      <section className="rounded-card border border-ui-border bg-base p-6 shadow-card">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Next surface
        </p>
        <h2 className="mt-2 text-[1.125rem] font-bold tracking-[-0.015em] text-ink">
          Receipt and verification links
        </h2>
        <p className="mt-3 text-[0.875rem] leading-6 text-ink-secondary">
          Once the attestation is submitted, zkNotary redirects to a receipt page
          that records the wallet, timestamp, transaction, and public verification
          reference. The receipt also supports a print-friendly proof-only PDF export.
        </p>
        <Link
          href="/verify"
          className="mt-5 inline-flex rounded-btn border border-ui-border px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-secondary transition hover:border-ink-secondary"
        >
          Open verify page
        </Link>
      </section>
    </div>
  );
}

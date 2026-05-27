"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";

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
  "not-found": "No prior notarizations found for this file.",
  "already-by-you": "You've already notarized this exact file.",
  "already-by-others": "This file has been notarized by other wallets.",
  "unavailable": "Duplicate check unavailable — chain settings not configured."
};

function ProgressOverlay({ state }: { state: "authorizing" | "submitting" }) {
  const steps = [
    { key: "authorizing", label: "Waiting for your signature…" },
    { key: "submitting", label: "Recording proof on Ethereum…" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-card border border-ui-border bg-base p-8 shadow-card">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
          Creating your proof
        </p>
        <div className="mt-6 space-y-4">
          {steps.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold ${
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-action text-white"
                        : "bg-ui-border text-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[0.875rem] ${
                    active ? "font-semibold text-ink" : done ? "text-ink-secondary" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
                {active ? (
                  <span className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-ui-border border-t-action" />
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-[0.8125rem] leading-6 text-ink-secondary">
          {state === "authorizing"
            ? "Check your wallet — a signing prompt should appear."
            : "Your proof is being written to the blockchain. This takes a few seconds."}
        </p>
      </div>
    </div>
  );
}

function ConfigNotice() {
  return (
    <section className="rounded-card border border-ui-border bg-base p-6 shadow-card">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
        Notarize
      </p>
      <h1 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.025em] text-ink">
        Almost ready — one setup step left.
      </h1>
      <p className="mt-3 max-w-2xl text-[0.875rem] leading-6 text-ink-secondary">
        To enable wallet sign-in, add your Privy credentials to the environment. Once set,
        the full notarization flow activates automatically.
      </p>
    </section>
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
    | { state: "idle" | "checking" | "error"; result: null; error: string | null }
    | { state: "ready"; result: DuplicateCheckResponse; error: null }
  >({ state: "idle", result: null, error: null });
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
      setProfileState({ status: "idle", profile: null, error: null });
      setShareDisplayNamePublicly(false);
      return;
    }

    let active = true;
    setProfileState({ status: "loading", profile: null, error: null });

    void getAccessToken()
      .then((token) => {
        if (!token) throw new Error("Missing Privy access token.");
        return fetch("/api/dashboard/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
      })
      .then(async (response) => {
        const payload = (await response.json()) as NotarizeProfileResponse | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error : "Could not load profile.");
        }
        if (!active) return;
        setProfileState({ status: "ready", profile: payload.profile, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProfileState({
          status: "error",
          profile: null,
          error: error instanceof Error ? error.message : "Could not load profile."
        });
      });

    return () => { active = false; };
  }, [authenticated, getAccessToken, ready]);

  useEffect(() => {
    if (!selectedFile) {
      setHashState({ status: "idle", progress: 0, hash: null, error: null });
      setDuplicateState({ state: "idle", result: null, error: null });
      return;
    }

    let active = true;
    setHashState({ status: "hashing", progress: 0, hash: null, error: null });
    setDuplicateState({ state: "idle", result: null, error: null });

    void hashFile(selectedFile, (progress) => {
      if (!active) return;
      setHashState({ status: "hashing", progress, hash: null, error: null });
    })
      .then((documentHash) => {
        if (!active) return;
        setHashState({ status: "ready", progress: 100, hash: documentHash, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setHashState({
          status: "error",
          progress: 0,
          hash: null,
          error: error instanceof Error ? error.message : "Hashing failed."
        });
      });

    return () => { active = false; };
  }, [selectedFile]);

  useEffect(() => {
    if (hashState.status !== "ready") return;

    let active = true;
    setDuplicateState({ state: "checking", result: null, error: null });

    const params = new URLSearchParams({ hash: hashState.hash });
    if (preferredWallet?.address) params.set("wallet", preferredWallet.address);

    void fetch(`/api/notarize/check?${params.toString()}`)
      .then(async (response) => {
        const payload = (await response.json()) as DuplicateCheckResponse | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error : "Duplicate check failed.");
        }
        if (!active) return;
        setDuplicateState({ state: "ready", result: payload, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDuplicateState({
          state: "error",
          result: null,
          error: error instanceof Error ? error.message : "Duplicate check failed."
        });
      });

    return () => { active = false; };
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
            title: "Sign to create your proof"
          }
        }
      );

      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Missing Privy access token.");

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
      startTransition(() => { router.push(payload.receiptPath); });
    } catch (error: unknown) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "Notarization failed.");
    }
  }

  const showOverlay = submitState === "authorizing" || submitState === "submitting";

  return (
    <>
      {showOverlay ? <ProgressOverlay state={submitState as "authorizing" | "submitting"} /> : null}

      <form onSubmit={handleSubmit} className="rounded-card border border-ui-border bg-base p-6 shadow-card">
        {/* Header */}
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
          Notarize
        </p>
        <h1 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.025em] text-ink">
          Create a permanent proof for your document.
        </h1>
        <p className="mt-2 text-[0.875rem] leading-6 text-ink-secondary">
          A permanent, public record that you held this document at this moment. Useful for copyright disputes, academic priority, contract evidence, and more.
        </p>

        <div className="mt-6 space-y-4">
          {/* File upload + inline progress */}
          <label className="block cursor-pointer rounded-card border border-dashed border-tint bg-surface p-5">
            <span className="text-[0.875rem] font-semibold text-ink">Upload your document</span>
            <p className="mt-1 text-[0.8125rem] text-ink-secondary">
              Your file never leaves your device. We only use a digital fingerprint.
            </p>
            <input
              type="file"
              className="mt-3 block w-full text-[0.8125rem] text-ink-secondary"
              onChange={(event) => {
                setSubmitState("idle");
                setSubmitError(null);
                setSelectedFile(event.currentTarget.files?.[0] ?? null);
              }}
            />

            {selectedFile ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[0.75rem]">
                  <span className="font-medium text-ink-secondary">
                    {hashState.status === "ready"
                      ? "Fingerprint computed"
                      : hashState.status === "hashing"
                        ? `Computing fingerprint… ${hashState.progress}%`
                        : hashState.status === "error"
                          ? "Error"
                          : "Waiting…"}
                  </span>
                  {hashState.status !== "ready" && hashState.status !== "error" ? (
                    <span className="font-bold text-action">{hashState.progress}%</span>
                  ) : null}
                </div>
                <div className="h-1.5 rounded-full bg-ui-border">
                  <div
                    className={`h-1.5 rounded-full transition-all ${hashState.status === "ready" ? "bg-success" : "bg-action"}`}
                    style={{ width: `${hashState.progress}%` }}
                  />
                </div>
                {hashState.status === "ready" ? (
                  <p className="break-all font-mono text-[0.6875rem] text-accent">{hashState.hash}</p>
                ) : null}
                {hashState.status === "error" ? (
                  <p className="text-[0.8125rem] text-ui-error">{hashState.error}</p>
                ) : null}

                {/* Inline duplicate check */}
                {hashState.status === "ready" ? (
                  <p className={`text-[0.8125rem] ${duplicateState.state === "error" ? "text-ui-error" : "text-ink-secondary"}`}>
                    {duplicateState.state === "checking"
                      ? "Checking for existing notarizations…"
                      : duplicateState.state === "ready"
                        ? duplicateMessages[duplicateState.result.status]
                        : duplicateState.state === "error"
                          ? duplicateState.error
                          : null}
                  </p>
                ) : null}
              </div>
            ) : null}
          </label>

          {/* Description + Tags */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={2}
                className="mt-2 w-full resize-none rounded-btn border border-ui-border bg-base px-3 py-2.5 text-[0.875rem] text-ink outline-none focus:border-action"
                placeholder="Optional context (private)"
              />
            </label>

            <label className="block">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                Tags
              </span>
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.currentTarget.value)}
                className="mt-2 w-full rounded-btn border border-ui-border bg-base px-3 py-2.5 text-[0.875rem] text-ink outline-none focus:border-action"
                placeholder="Legal, Academic, Personal"
              />
              <p className="mt-1.5 text-[0.6875rem] text-muted">
                {normalizeTags(tagInput).join(" · ") || "No tags yet"}
              </p>
            </label>
          </div>

          {/* Display name — single checkbox row */}
          <label className="flex items-center gap-3">
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
            <span className="text-[0.875rem] text-ink-secondary">
              Share my display name publicly on this proof
              {!profileState.profile?.displayName ? (
                <span className="ml-1 text-muted">(set one in dashboard first)</span>
              ) : (
                <span className="ml-1 font-medium text-ink">({profileState.profile.displayName})</span>
              )}
            </span>
          </label>

          {/* Submit */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={
                submitState === "authorizing" ||
                submitState === "submitting" ||
                hashState.status !== "ready" ||
                !walletsReady
              }
              className="btn-warm px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authenticated ? "Create my proof" : "Sign in to continue"}
            </button>
            {authenticated && preferredWallet ? (
              <span className="font-mono text-[0.75rem] text-muted">
                {preferredWallet.address.slice(0, 6)}…{preferredWallet.address.slice(-4)}
              </span>
            ) : null}
          </div>

          {submitError ? (
            <p className="text-[0.875rem] text-ui-error">{submitError}</p>
          ) : null}
        </div>
      </form>
    </>
  );
}

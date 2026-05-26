"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";

import { TrustBanner } from "@/components/trust-banner";
import { buildAuthorizationMessage, createAttestationReference } from "@/lib/attestations";
import { type DuplicateCheckResponse, type NotarizeResponse } from "@/lib/domain";
import { publicEnv } from "@/lib/env";
import { hashFile } from "@/lib/hash";
import {
  computeAuthorizationDigest,
  normalizeTags
} from "@/lib/notarize";

type HashState =
  | { status: "idle"; progress: 0; hash: null; error: null }
  | { status: "hashing"; progress: number; hash: null; error: null }
  | { status: "ready"; progress: 100; hash: string; error: null }
  | { status: "error"; progress: number; hash: null; error: string };

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
    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Notarize
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Configure Privy before testing the notarize flow.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The live notarization experience depends on `NEXT_PUBLIC_PRIVY_APP_ID`
          and `NEXT_PUBLIC_PRIVY_CLIENT_ID`. Once those are set, this page will
          enable wallet login, local hashing, signed authorization, and sponsored
          relay submission.
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
    <div className="grid gap-8 lg:grid-cols-[1.35fr_0.95fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Notarize
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              Create a wallet-authorized evidence record.
            </h1>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">
              {preferredWallet?.address ?? "No wallet linked"}
            </p>
            <p className="mt-1">
              {authenticated ? "Signed in with Privy" : "Sign in required before submission"}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <label className="block rounded-3xl border border-dashed border-blue-300 bg-blue-50/50 p-6">
            <span className="text-sm font-semibold text-slate-900">Choose a document</span>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The original file stays in your browser. Only the hash and selected
              metadata are sent.
            </p>
            <input
              type="file"
              className="mt-4 block w-full text-sm text-slate-700"
              onChange={(event) => {
                setSubmitState("idle");
                setSubmitError(null);
                setSelectedFile(event.currentTarget.files?.[0] ?? null);
              }}
            />
          </label>

          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Hashing progress</p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatStatusLabel({
                    hashState: hashState.status,
                    duplicateState: duplicateState.state,
                    submitState
                  })}
                </p>
              </div>
              <p className="text-sm font-semibold text-blue-700">{hashState.progress}%</p>
            </div>
            <div className="mt-4 h-3 rounded-full bg-slate-100">
              <div
                className="h-3 rounded-full bg-blue-600 transition-all"
                style={{ width: `${hashState.progress}%` }}
              />
            </div>
            {hashState.status === "ready" ? (
              <p className="mt-4 break-all text-sm text-slate-700">{hashState.hash}</p>
            ) : null}
            {hashState.status === "error" ? (
              <p className="mt-4 text-sm text-rose-700">{hashState.error}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block rounded-3xl border border-slate-200 bg-white px-5 py-4">
              <span className="text-sm font-semibold text-slate-900">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={4}
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                placeholder="Optional context for the receipt"
              />
            </label>

            <label className="block rounded-3xl border border-slate-200 bg-white px-5 py-4">
              <span className="text-sm font-semibold text-slate-900">Tags</span>
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.currentTarget.value)}
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                placeholder="Legal, Academic, Personal"
              />
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                {normalizeTags(tagInput).join(" · ") || "No tags yet"}
              </p>
            </label>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">Duplicate status</p>
            {duplicateState.state === "ready" ? (
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <p>{duplicateMessages[duplicateState.result.status]}</p>
                <p>Existing attestations: {duplicateState.result.attestationCount}</p>
              </div>
            ) : duplicateState.state === "error" ? (
              <p className="mt-3 text-sm text-rose-700">{duplicateState.error}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
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
            className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {authenticated ? "Authorize and notarize" : "Sign in to notarize"}
          </button>

          {submitError ? <p className="text-sm text-rose-700">{submitError}</p> : null}
        </div>
      </form>

      <div className="space-y-6">
        <TrustBanner
          title="What this proof means"
          body="zkNotary proves that a wallet authorized an attestation for this exact file hash at a specific time on Sepolia. It does not, by itself, prove authorship or legal validity."
        />

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-xl shadow-blue-950/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Next surface
          </p>
          <h2 className="mt-3 text-xl font-semibold text-slate-950">
            Receipt and verification links
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Once the attestation is submitted, zkNotary redirects to a receipt page
            that records the wallet, timestamp, transaction, and public verification
            reference.
          </p>
          <Link
            href="/verify"
            className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Open verify page shell
          </Link>
        </section>
      </div>
    </div>
  );
}

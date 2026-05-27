"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { VerificationCertificate } from "@/components/verification-certificate";
import { VerificationExplainer } from "@/components/verification-explainer";
import type { VerificationLookupResponse } from "@/lib/domain";
import { hashFile } from "@/lib/hash";

type LookupState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: VerificationLookupResponse; error: null }
  | { status: "error"; data: null; error: string };

export function VerifyWorkbench() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") ?? "";
  const initialHash = searchParams.get("hash") ?? "";

  const [mode, setMode] = useState<"file" | "reference">(
    initialRef || initialHash ? "reference" : "file"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hashInput, setHashInput] = useState(initialHash);
  const [referenceInput, setReferenceInput] = useState(initialRef);
  const [hashProgress, setHashProgress] = useState(0);
  const [hashError, setHashError] = useState<string | null>(null);
  const [computedHash, setComputedHash] = useState<string | null>(initialHash || null);
  const [lookupState, setLookupState] = useState<LookupState>({
    status: "idle",
    data: null,
    error: null
  });

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    let active = true;
    setHashProgress(0);
    setHashError(null);
    setComputedHash(null);

    void hashFile(selectedFile, (progress) => {
      if (!active) {
        return;
      }

      setHashProgress(progress);
    })
      .then((hash) => {
        if (!active) {
          return;
        }

        setComputedHash(hash);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setHashError(error instanceof Error ? error.message : "Hashing failed.");
      });

    return () => {
      active = false;
    };
  }, [selectedFile]);

  async function runLookup(ref: string, hash: string, currentMode: "file" | "reference", currentComputedHash: string | null) {
    const query = new URLSearchParams();
    if (ref.trim()) {
      query.set("ref", ref.trim());
    }

    const candidateHash = currentMode === "file" ? currentComputedHash : hash.trim();
    if (candidateHash) {
      query.set("hash", candidateHash);
    }

    if (!query.toString()) {
      setLookupState({
        status: "error",
        data: null,
        error: "Provide a file, an attestation reference, or a document hash."
      });
      return;
    }

    setLookupState({ status: "loading", data: null, error: null });

    try {
      const response = await fetch(`/api/verify?${query.toString()}`);
      const payload = (await response.json()) as VerificationLookupResponse | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Verification failed.");
      }
      setLookupState({ status: "ready", data: payload, error: null });
    } catch (error: unknown) {
      setLookupState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Verification failed."
      });
    }
  }

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runLookup(referenceInput, hashInput, mode, computedHash);
  }

  useEffect(() => {
    if (initialRef || initialHash) {
      void runLookup(initialRef, initialHash, "reference", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <form onSubmit={handleLookup} className="rounded-card border border-ui-border bg-base p-8 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
              Verify
            </p>
            <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
              Check if a document has been notarized.
            </h1>
            <p className="mt-3 max-w-2xl text-[0.875rem] leading-6 text-ink-secondary">
              Anyone can verify a proof here. No account needed. Private details stay private. zkNotary proves a specific document fingerprint was recorded on Ethereum at a specific time, authorized by a specific wallet.
            </p>
          </div>
          <div className="flex rounded-btn border border-ui-border bg-surface p-1">
            {(
              [
                ["file", "Upload file"],
                ["reference", "Paste ref or hash"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-btn px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.06em] transition ${
                  mode === value
                    ? "bg-action text-white"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {mode === "file" ? (
            <label className="block rounded-card border border-dashed border-tint bg-surface p-6">
              <span className="text-[0.875rem] font-semibold text-ink">Upload the document to check</span>
              <p className="mt-2 text-[0.875rem] leading-6 text-ink-secondary">
                Your file stays in your browser. We'll compute its fingerprint and
                check if it's been notarized.
              </p>
              <input
                type="file"
                className="mt-4 block w-full text-[0.875rem] text-ink-secondary"
                onChange={(event) => {
                  setSelectedFile(event.currentTarget.files?.[0] ?? null);
                  setLookupState({ status: "idle", data: null, error: null });
                }}
              />
              {selectedFile ? (
                <p className="mt-4 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                  {computedHash ? "Done" : `Computing… ${hashProgress}%`}
                </p>
              ) : null}
              <div className="mt-2 h-2 rounded-full bg-ui-border">
                <div
                  className={`h-2 rounded-full transition-all ${computedHash ? "bg-success" : "bg-action"}`}
                  style={{ width: `${hashProgress}%` }}
                />
              </div>
              <p className="mt-3 font-mono text-[0.75rem] text-accent">
                {computedHash ?? "Choose a file to get started."}
              </p>
              {hashError ? (
                <p className="mt-2 text-[0.875rem] text-ui-error">{hashError}</p>
              ) : null}
            </label>
          ) : (
            <div className="grid gap-4">
              <label className="block rounded-card border border-ui-border bg-surface px-5 py-4">
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                  Proof reference code
                </span>
                <input
                  value={referenceInput}
                  onChange={(event) => setReferenceInput(event.currentTarget.value)}
                  className="mt-3 w-full rounded-btn border border-ui-border bg-base px-4 py-3 font-mono text-[0.875rem] text-ink outline-none focus:border-action"
                  placeholder="eip155:11155111:0x...:4"
                />
              </label>

              <label className="block rounded-card border border-ui-border bg-surface px-5 py-4">
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                  Document fingerprint
                </span>
                <input
                  value={hashInput}
                  onChange={(event) => setHashInput(event.currentTarget.value)}
                  className="mt-3 w-full rounded-btn border border-ui-border bg-base px-4 py-3 font-mono text-[0.875rem] text-ink outline-none focus:border-action"
                  placeholder="0x..."
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            className="btn-warm px-5 py-2.5"
          >
            {lookupState.status === "loading" ? "Checking…" : "Check this document"}
          </button>

          {lookupState.status === "error" ? (
            <p className="text-[0.875rem] text-ui-error">{lookupState.error}</p>
          ) : null}
        </div>
      </form>

      {lookupState.status === "ready" && lookupState.data.primaryRecord ? (
        <VerificationCertificate
          outcome={lookupState.data.outcome}
          record={lookupState.data.primaryRecord}
          relatedRecords={lookupState.data.relatedRecords}
        />
      ) : null}

      {lookupState.status === "ready" && !lookupState.data.primaryRecord ? (
        <div className="rounded-card border border-ui-border bg-base px-6 py-5 text-[0.875rem] leading-6">
          <p className="font-semibold text-ink">No proof found</p>
          <p className="mt-2 text-ink-secondary">
            No notarization record matches this document or reference. Double-check the
            reference code, or upload the original file.
          </p>
        </div>
      ) : null}


      {lookupState.status === "ready" ? (
        <VerificationExplainer outcome={lookupState.data.outcome} />
      ) : null}
    </div>
  );
}

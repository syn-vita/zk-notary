"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { TrustBanner } from "@/components/trust-banner";
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

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = new URLSearchParams();
    if (referenceInput.trim()) {
      query.set("ref", referenceInput.trim());
    }

    const candidateHash = mode === "file" ? computedHash : hashInput.trim();
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

    setLookupState({
      status: "loading",
      data: null,
      error: null
    });

    try {
      const response = await fetch(`/api/verify?${query.toString()}`);
      const payload = (await response.json()) as VerificationLookupResponse | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Verification failed.");
      }

      setLookupState({
        status: "ready",
        data: payload,
        error: null
      });
    } catch (error: unknown) {
      setLookupState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Verification failed."
      });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <form
        onSubmit={handleLookup}
        className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Verify
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              Check a specific attestation or compare a file hash.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Public verification is intentionally proof-only. zkNotary does not
              reveal filenames, descriptions, tags, or private notes on this page.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white p-1">
            {[
              ["file", "Upload file"],
              ["reference", "Paste ref or hash"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value as "file" | "reference")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  mode === value ? "bg-slate-950 text-white" : "text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {mode === "file" ? (
            <label className="block rounded-3xl border border-dashed border-blue-300 bg-blue-50/50 p-6">
              <span className="text-sm font-semibold text-slate-900">Upload a file to hash locally</span>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The original file stays in your browser. zkNotary compares the
                computed hash against stored attestation records.
              </p>
              <input
                type="file"
                className="mt-4 block w-full text-sm text-slate-700"
                onChange={(event) => {
                  setSelectedFile(event.currentTarget.files?.[0] ?? null);
                  setLookupState({ status: "idle", data: null, error: null });
                }}
              />
              <div className="mt-4 h-3 rounded-full bg-white/70">
                <div
                  className="h-3 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${hashProgress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {computedHash ?? "Choose a file to compute its hash."}
              </p>
              {hashError ? <p className="mt-2 text-sm text-rose-700">{hashError}</p> : null}
            </label>
          ) : (
            <div className="grid gap-4">
              <label className="block rounded-3xl border border-slate-200 bg-white px-5 py-4">
                <span className="text-sm font-semibold text-slate-900">Attestation reference</span>
                <input
                  value={referenceInput}
                  onChange={(event) => setReferenceInput(event.currentTarget.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                  placeholder="eip155:11155111:0x...:4"
                />
              </label>

              <label className="block rounded-3xl border border-slate-200 bg-white px-5 py-4">
                <span className="text-sm font-semibold text-slate-900">Document hash</span>
                <input
                  value={hashInput}
                  onChange={(event) => setHashInput(event.currentTarget.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                  placeholder="0x..."
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
          >
            {lookupState.status === "loading" ? "Checking records..." : "Verify attestation"}
          </button>

          {lookupState.status === "error" ? (
            <p className="text-sm text-rose-700">{lookupState.error}</p>
          ) : null}

          {lookupState.status === "ready" && lookupState.data.primaryRecord ? (
            <VerificationCertificate
              outcome={lookupState.data.outcome}
              record={lookupState.data.primaryRecord}
              relatedRecords={lookupState.data.relatedRecords}
            />
          ) : null}

          {lookupState.status === "ready" && !lookupState.data.primaryRecord ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-800">
              <p className="font-semibold">No record found</p>
              <p className="mt-2">
                zkNotary could not find an attestation for the supplied reference or file
                hash.
              </p>
              <p className="mt-2">
                Reviewers can retry with a direct attestation reference, or upload the
                original file so the browser computes its hash locally.
              </p>
            </div>
          ) : null}
        </div>
      </form>

      <div className="space-y-6">
        <TrustBanner
          title="What public verification proves"
          body="zkNotary verifies that a wallet-authorized attestation for a specific file hash exists on Sepolia. It does not prove authorship, truthfulness, or legal status by itself."
        />

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-xl shadow-blue-950/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Export guidance
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Reviewers can save a print-friendly certificate as PDF from the proof card
            after a result is found. The exported view contains attestation facts only.
          </p>
        </section>

        <VerificationExplainer
          outcome={
            lookupState.status === "ready" ? lookupState.data.outcome : "exact-attestation"
          }
        />
      </div>
    </div>
  );
}

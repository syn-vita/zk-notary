"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";

import { hashFile } from "@/lib/hash";

import { TrustBanner } from "@/components/trust-banner";
import type {
  AttestationRecord,
  DashboardListResponse,
  UserProfile,
  UserProfileResponse
} from "@/lib/domain";
import { resolveOwnerDisplayName } from "@/lib/profile";
import { filterOwnerAttestations } from "@/lib/records";

type VerifyModalState =
  | { status: "idle" }
  | { status: "hashing"; progress: number }
  | { status: "match" }
  | { status: "mismatch"; computedHash: string }
  | { status: "error"; message: string };

function VerifyFileModal({
  record,
  onClose
}: {
  record: AttestationRecord;
  onClose: () => void;
}) {
  const [verifyState, setVerifyState] = useState<VerifyModalState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    let active = true;
    setVerifyState({ status: "hashing", progress: 0 });

    void hashFile(file, (progress) => {
      if (active) setVerifyState({ status: "hashing", progress });
    })
      .then((hash) => {
        if (!active) return;
        if (hash === record.documentHash) {
          setVerifyState({ status: "match" });
        } else {
          setVerifyState({ status: "mismatch", computedHash: hash });
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setVerifyState({ status: "error", message: err instanceof Error ? err.message : "Hashing failed." });
      });

    return () => { active = false; };
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-card border border-ui-border bg-base p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
              Cross-reference check
            </p>
            <h2 className="mt-1 text-[1.125rem] font-extrabold tracking-[-0.02em] text-ink">
              Is this the same file?
            </h2>
            <p className="mt-1 text-[0.8125rem] leading-5 text-ink-secondary">
              Upload the file you want to check. We'll compute its fingerprint and compare it to the one recorded on-chain.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-btn p-1 text-ink-secondary hover:bg-surface"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Recorded hash reference */}
        <div className="mt-4 rounded-btn border border-ui-border bg-surface px-3 py-2.5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">Recorded fingerprint</p>
          <p className="mt-1 break-all font-mono text-[0.75rem] text-accent">{record.documentHash}</p>
        </div>

        {/* File input */}
        <label className="mt-4 block cursor-pointer rounded-card border border-dashed border-tint bg-surface px-4 py-4 text-center hover:border-warm transition">
          <span className="text-[0.8125rem] font-medium text-ink-secondary">
            {verifyState.status === "idle" ? "Click to choose a file" : "Choose a different file"}
          </span>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>

        {/* Progress */}
        {verifyState.status === "hashing" ? (
          <div className="mt-4">
            <p className="text-[0.75rem] font-medium text-ink-secondary">Computing fingerprint… {verifyState.progress}%</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-ui-border">
              <div
                className="h-1.5 rounded-full bg-action transition-all"
                style={{ width: `${verifyState.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Result */}
        {verifyState.status === "match" ? (
          <div className="mt-4 rounded-card border border-success/30 bg-success/5 px-4 py-3">
            <p className="text-[0.875rem] font-bold text-success">Match — same file</p>
            <p className="mt-0.5 text-[0.8125rem] leading-5 text-success/80">
              The fingerprint matches exactly. This file has not been altered since it was notarized.
            </p>
          </div>
        ) : null}

        {verifyState.status === "mismatch" ? (
          <div className="mt-4 rounded-card border border-ui-error/30 bg-ui-error/5 px-4 py-3">
            <p className="text-[0.875rem] font-bold text-ui-error">No match — different file</p>
            <p className="mt-0.5 text-[0.8125rem] leading-5 text-ui-error/80">
              The fingerprints don't match. This file is different from the one that was notarized.
            </p>
            <p className="mt-2 break-all font-mono text-[0.6875rem] text-muted">{verifyState.computedHash}</p>
          </div>
        ) : null}

        {verifyState.status === "error" ? (
          <div className="mt-4 rounded-card border border-ui-error/30 bg-ui-error/5 px-4 py-3 text-[0.875rem] text-ui-error">
            {verifyState.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type DashboardState =
  | { status: "idle" | "loading"; records: AttestationRecord[]; error: null }
  | { status: "ready"; records: AttestationRecord[]; error: null }
  | { status: "error"; records: AttestationRecord[]; error: string };

type ProfileState =
  | { status: "idle" | "loading"; profile: UserProfile | null; error: null }
  | { status: "ready"; profile: UserProfile | null; error: null }
  | { status: "error"; profile: UserProfile | null; error: string };

function DisplayNameInline({
  profile,
  walletAddress,
  onSaved
}: {
  profile: UserProfile | null;
  walletAddress: string | null;
  onSaved: (profile: UserProfile) => void;
}) {
  const { getAccessToken } = usePrivy();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
  }, [profile?.displayName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Missing Privy access token.");

      const response = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ displayName: displayName.trim() })
      });

      const payload = (await response.json()) as { profile?: UserProfile | null; error?: string };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? "Could not save profile.");
      }

      onSaved(payload.profile);
      setEditing(false);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const label = profile?.displayName ?? walletAddress ?? "No name set";

  return (
    <div className="mt-4 border-t border-ui-border pt-4">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.currentTarget.value)}
            maxLength={80}
            autoFocus
            className="rounded-btn border border-ui-border bg-base px-3 py-1.5 text-[0.8125rem] text-ink outline-none focus:border-action"
            placeholder="Your display name"
          />
          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="btn-warm px-3 py-1.5 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(null); }}
            className="rounded-btn border border-ui-border px-3 py-1.5 text-[0.75rem] font-semibold text-ink-secondary transition hover:border-ink-secondary"
          >
            Cancel
          </button>
          {error ? <p className="w-full text-[0.8125rem] text-ui-error">{error}</p> : null}
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-[0.8125rem] text-ink-secondary">
            Signed in as <span className="font-semibold text-ink">{label}</span>
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[0.75rem] font-semibold text-action underline-offset-2 hover:underline"
          >
            Edit name
          </button>
        </div>
      )}
    </div>
  );
}

function SupersedeForm({
  record,
  onSaved
}: {
  record: AttestationRecord;
  onSaved: (record: AttestationRecord) => void;
}) {
  const { getAccessToken } = usePrivy();
  const [publicNote, setPublicNote] = useState(record.publicSupersededNote ?? "");
  const [privateNote, setPrivateNote] = useState(record.privateSupersededNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Missing Privy access token.");

      const response = await fetch(`/api/dashboard/attestations/${record.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          publicSupersededNote: publicNote.trim() || null,
          privateSupersededNote: privateNote.trim() || null
        })
      });
      const payload = (await response.json()) as { record?: AttestationRecord; error?: string };
      if (!response.ok || !payload.record) {
        throw new Error(payload.error ?? "Could not update attestation.");
      }
      onSaved(payload.record);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not update attestation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-ui-border px-5 py-4">
      <p className="text-[0.75rem] font-semibold text-ink">Mark as superseded</p>
      <div>
        <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Public note
        </label>
        <textarea
          value={publicNote}
          onChange={(event) => setPublicNote(event.currentTarget.value)}
          rows={2}
          className="mt-1.5 w-full resize-none rounded-btn border border-ui-border bg-base px-3 py-2 text-[0.875rem] text-ink outline-none focus:border-action"
          placeholder="Visible on public verification pages"
        />
      </div>
      <div>
        <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Private note
        </label>
        <textarea
          value={privateNote}
          onChange={(event) => setPrivateNote(event.currentTarget.value)}
          rows={2}
          className="mt-1.5 w-full resize-none rounded-btn border border-ui-border bg-base px-3 py-2 text-[0.875rem] text-ink outline-none focus:border-action"
          placeholder="Only you can see this"
        />
      </div>
      {error ? <p className="text-[0.875rem] text-ui-error">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="btn-warm px-4 py-2 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Confirm supersede"}
      </button>
    </form>
  );
}

function AttestationRow({
  record,
  onUpdated,
  onVerifyRequest
}: {
  record: AttestationRecord;
  onUpdated: (record: AttestationRecord) => void;
  onVerifyRequest: (record: AttestationRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSupersede, setShowSupersede] = useState(false);
  const superseded = record.status === "superseded";

  return (
    <>
      <tr
        className="cursor-pointer border-b border-ui-border transition hover:bg-surface"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <p className="text-[0.875rem] font-medium text-ink">{record.fileName}</p>
          {record.tags.length > 0 ? (
            <p className="mt-0.5 text-[0.75rem] text-muted">{record.tags.join(" · ")}</p>
          ) : null}
        </td>
        <td className="hidden px-4 py-3 font-mono text-[0.75rem] text-ink-secondary sm:table-cell">
          {record.attestationRef.slice(0, 24)}…
        </td>
        <td className="px-4 py-3 text-[0.8125rem] text-ink-secondary">
          {new Date(record.notarizedAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block rounded-btn px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] ${
              superseded ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
            }`}
          >
            {superseded ? "Superseded" : "Active"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onVerifyRequest(record); }}
              className="rounded-btn border border-ui-border px-2.5 py-1 text-[0.6875rem] font-semibold text-ink-secondary transition hover:border-warm hover:text-warm"
              title="Check if a file matches this proof"
            >
              Check file
            </button>
            <span className="text-[0.75rem] text-ink-secondary">{expanded ? "▲" : "▼"}</span>
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-ui-border bg-surface">
          <td colSpan={5} className="px-0 py-0">
            <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
              {[
                ["File name", record.fileName],
                ["Recorded at", new Date(record.notarizedAt).toLocaleString()],
                ["Proof reference", record.attestationRef],
                ["Document fingerprint", record.documentHash],
                ["Wallet", record.attestingWallet],
                ["Tags", record.tags.length ? record.tags.join(", ") : "None"],
                ...(record.description ? [["Description", record.description]] : []),
                ...(record.publicSupersededNote ? [["Public note", record.publicSupersededNote]] : []),
              ].map(([label, value]) => (
                <div key={label} className="rounded-card border border-ui-border bg-base px-4 py-3">
                  <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                    {label}
                  </dt>
                  <dd className="mt-1.5 break-all text-[0.8125rem] leading-6 text-ink">{value}</dd>
                </div>
              ))}
            </div>

            {superseded && record.privateSupersededNote ? (
              <div className="mx-5 mb-4 rounded-card border border-warning/30 bg-warning/5 px-4 py-3 text-[0.875rem] leading-6 text-warning">
                <p className="font-semibold">Private note</p>
                <p className="mt-1">{record.privateSupersededNote}</p>
              </div>
            ) : null}

            {!superseded ? (
              <div className="px-0">
                {showSupersede ? (
                  <SupersedeForm record={record} onSaved={(updated) => { onUpdated(updated); setShowSupersede(false); }} />
                ) : (
                  <div className="border-t border-ui-border px-5 py-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowSupersede(true); }}
                      className="text-[0.75rem] font-semibold text-ink-secondary underline-offset-2 hover:underline"
                    >
                      Mark as superseded
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DashboardFallback({ message }: { message: string }) {
  return (
    <div className="space-y-8">
      <section className="rounded-card border border-ui-border bg-base p-8 shadow-card">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
          Dashboard
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">{message}</h1>
      </section>
      <TrustBanner
        title="Your private details stay yours"
        body="When you share a proof link, recipients only see what you choose to make public. Your filename, notes, and tags stay private."
      />
    </div>
  );
}

export function DashboardWorkbench() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [state, setState] = useState<DashboardState>({
    status: "idle",
    records: [],
    error: null
  });
  const [profileState, setProfileState] = useState<ProfileState>({
    status: "idle",
    profile: null,
    error: null
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "superseded">("all");
  const [verifyModalRecord, setVerifyModalRecord] = useState<AttestationRecord | null>(null);
  const preferredWallet =
    wallets.find((wallet) => wallet.type === "ethereum" && wallet.linked) ??
    wallets.find((wallet) => wallet.type === "ethereum");

  useEffect(() => {
    if (!ready || !authenticated) return;

    let active = true;
    setState((current) => ({ ...current, status: "loading", error: null }));
    setProfileState((current) => ({ ...current, status: "loading", error: null }));

    void getAccessToken()
      .then((token) => {
        if (!token) throw new Error("Missing Privy access token.");
        const headers = { Authorization: `Bearer ${token}` };
        return Promise.all([
          fetch("/api/dashboard/attestations", { headers }),
          fetch("/api/dashboard/profile", { headers })
        ]);
      })
      .then(async ([recordsResponse, profileResponse]) => {
        const recordsPayload = (await recordsResponse.json()) as DashboardListResponse | { error: string };
        if (!recordsResponse.ok || "error" in recordsPayload) {
          throw new Error("error" in recordsPayload ? recordsPayload.error : "Could not load dashboard.");
        }

        const profilePayload = (await profileResponse.json()) as UserProfileResponse | { error: string };
        if (!profileResponse.ok || "error" in profilePayload) {
          throw new Error("error" in profilePayload ? profilePayload.error : "Could not load profile.");
        }

        if (!active) return;

        setState({ status: "ready", records: recordsPayload.records, error: null });
        setProfileState({ status: "ready", profile: profilePayload.profile, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ status: "error", records: [], error: error instanceof Error ? error.message : "Could not load dashboard." });
        setProfileState({ status: "error", profile: null, error: error instanceof Error ? error.message : "Could not load profile." });
      });

    return () => { active = false; };
  }, [authenticated, getAccessToken, ready]);

  const filteredRecords = useMemo(
    () => filterOwnerAttestations(state.records, { query, status: statusFilter }),
    [query, state.records, statusFilter]
  );
  const ownerLabel = resolveOwnerDisplayName({
    profile: profileState.profile,
    walletAddress: preferredWallet?.address ?? null
  });

  if (!ready) {
    return <DashboardFallback message="Loading your documents…" />;
  }

  if (!authenticated) {
    return (
      <div className="space-y-8">
        <section className="rounded-card border border-ui-border bg-base p-8 shadow-card">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
            Dashboard
          </p>
          <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
            Sign in to see your documents.
          </h1>
          <p className="mt-4 max-w-2xl text-[0.875rem] leading-7 text-ink-secondary">
            Your notarized documents and private notes live here, behind your wallet login.
          </p>
          <button
            type="button"
            onClick={() => login()}
            className="btn-warm mt-6 px-5 py-2.5"
          >
            Sign in with your wallet
          </button>
        </section>
        <TrustBanner
          title="Your privacy is protected"
          body="When you share a proof link, recipients only see what you choose to make public. Your filename, notes, and tags stay private."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {verifyModalRecord ? (
        <VerifyFileModal
          record={verifyModalRecord}
          onClose={() => setVerifyModalRecord(null)}
        />
      ) : null}

      {/* Header */}
      <div className="rounded-card border border-ui-border bg-base p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-warm">
              Dashboard
            </p>
            <h1 className="mt-1 text-[1.5rem] font-extrabold tracking-[-0.025em] text-ink">
              Your notarized documents.
            </h1>
            <p className="mt-1 text-[0.875rem] leading-6 text-ink">
              When you share a proof link, recipients only see what you choose to make public. Your filename, notes, and tags stay private.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search…"
              className="rounded-btn border border-ui-border bg-surface px-3 py-2 text-[0.8125rem] text-ink outline-none focus:border-action"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.currentTarget.value as "all" | "active" | "superseded")
              }
              className="rounded-btn border border-ui-border bg-surface px-3 py-2 text-[0.8125rem] text-ink outline-none focus:border-action"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
        </div>

        <DisplayNameInline
          profile={profileState.profile}
          walletAddress={preferredWallet?.address ?? null}
          onSaved={(profile) => setProfileState({ status: "ready", profile, error: null })}
        />
      </div>

      {/* Errors */}
      {state.status === "error" ? (
        <div className="rounded-card border border-ui-error/30 bg-ui-error/5 px-5 py-4 text-[0.875rem] text-ui-error">
          {state.error}
        </div>
      ) : null}
      {profileState.status === "error" ? (
        <div className="rounded-card border border-ui-error/30 bg-ui-error/5 px-5 py-4 text-[0.875rem] text-ui-error">
          {profileState.error}
        </div>
      ) : null}

      {/* Loading */}
      {state.status === "loading" ? (
        <div className="rounded-card border border-ui-border bg-surface px-5 py-4 text-[0.875rem] text-ink-secondary">
          Loading your documents…
        </div>
      ) : null}

      {/* Empty states */}
      {state.status === "ready" && state.records.length === 0 ? (
        <div className="rounded-card border border-ui-border bg-surface px-5 py-4 text-[0.875rem] text-ink-secondary">
          Nothing here yet. Notarize your first document to get started.
        </div>
      ) : null}
      {state.status === "ready" && state.records.length > 0 && filteredRecords.length === 0 ? (
        <div className="rounded-card border border-ui-border bg-surface px-5 py-4 text-[0.875rem] text-ink-secondary">
          No documents match that search. Try clearing the filter.
        </div>
      ) : null}

      {/* Records table */}
      {filteredRecords.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-ui-border bg-base shadow-card">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ui-border bg-surface">
                <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">File</th>
                <th className="hidden px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted sm:table-cell">Reference</th>
                <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">Date</th>
                <th className="px-4 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">Status</th>
                <th className="px-4 py-3 text-right text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <AttestationRow
                  key={record.id}
                  record={record}
                  onVerifyRequest={(selectedRecord) => setVerifyModalRecord(selectedRecord)}
                  onUpdated={(updatedRecord) => {
                    setState((current) => ({
                      ...current,
                      records: current.records.map((r) =>
                        r.id === updatedRecord.id ? updatedRecord : r
                      )
                    }));
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

    </div>
  );
}

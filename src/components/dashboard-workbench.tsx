"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";

import { TrustBanner } from "@/components/trust-banner";
import type {
  AttestationRecord,
  DashboardListResponse,
  UserProfile,
  UserProfileResponse
} from "@/lib/domain";
import { resolveOwnerDisplayName } from "@/lib/profile";
import { filterOwnerAttestations } from "@/lib/records";

type DashboardState =
  | { status: "idle" | "loading"; records: AttestationRecord[]; error: null }
  | { status: "ready"; records: AttestationRecord[]; error: null }
  | { status: "error"; records: AttestationRecord[]; error: string };

type ProfileState =
  | { status: "idle" | "loading"; profile: UserProfile | null; error: null }
  | { status: "ready"; profile: UserProfile | null; error: null }
  | { status: "error"; profile: UserProfile | null; error: string };

function ProfileSettingsCard({
  profile,
  walletAddress,
  onSaved
}: {
  profile: UserProfile | null;
  walletAddress: string | null;
  onSaved: (profile: UserProfile) => void;
}) {
  const { getAccessToken } = usePrivy();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallbackLabel = walletAddress ?? "your linked wallet";

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
  }, [profile?.displayName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Missing Privy access token.");
      }

      const response = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          displayName: displayName.trim()
        })
      });

      const payload = (await response.json()) as {
        profile?: UserProfile | null;
        error?: string;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? "Could not save profile.");
      }

      onSaved(payload.profile);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-card border border-ui-border bg-base p-6 shadow-card">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        Account settings
      </p>
      <h2 className="mt-2 text-[1.125rem] font-bold tracking-[-0.015em] text-ink">Display name</h2>
      <p className="mt-3 text-[0.875rem] leading-6 text-ink-secondary">
        This label is shown only in your private owner-facing dashboard. Public
        verification continues to use wallet addresses only.
      </p>
      <p className="mt-3 rounded-btn border border-ui-border bg-surface px-4 py-3 text-[0.875rem] text-ink-secondary">
        {profile?.displayName
          ? `Current private name: ${profile.displayName}`
          : `No private name saved yet. Your dashboard will fall back to ${fallbackLabel}.`}
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            Display name
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.currentTarget.value)}
            maxLength={80}
            className="mt-2 w-full rounded-btn border border-ui-border bg-base px-4 py-3 text-[0.875rem] text-ink outline-none focus:border-action"
            placeholder="Giancarlo"
          />
        </label>
        {error ? <p className="text-[0.875rem] text-ui-error">{error}</p> : null}
        <button
          type="submit"
          disabled={saving || !displayName.trim()}
          className="rounded-btn bg-action px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-action/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : profile ? "Update display name" : "Save display name"}
        </button>
      </form>
    </section>
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
      if (!accessToken) {
        throw new Error("Missing Privy access token.");
      }

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
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-card border border-ui-border bg-surface p-4">
      <div>
        <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Shareable public note
        </label>
        <textarea
          value={publicNote}
          onChange={(event) => setPublicNote(event.currentTarget.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-btn border border-ui-border bg-base px-3 py-2 text-[0.875rem] text-ink outline-none focus:border-action"
          placeholder="Optional note visible on proof-only public certificates"
        />
      </div>
      <div>
        <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Private owner note
        </label>
        <textarea
          value={privateNote}
          onChange={(event) => setPrivateNote(event.currentTarget.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-btn border border-ui-border bg-base px-3 py-2 text-[0.875rem] text-ink outline-none focus:border-action"
          placeholder="Internal note kept off public verification surfaces"
        />
      </div>
      {error ? <p className="text-[0.875rem] text-ui-error">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-btn bg-action px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-action/90 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Mark as superseded"}
      </button>
    </form>
  );
}

function AttestationCard({
  record,
  onUpdated
}: {
  record: AttestationRecord;
  onUpdated: (record: AttestationRecord) => void;
}) {
  const [showSupersede, setShowSupersede] = useState(false);

  return (
    <article className="rounded-card border border-ui-border bg-base p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            {record.status === "superseded" ? "Superseded record" : "Active record"}
          </p>
          <h2 className="mt-2 text-[1.125rem] font-bold tracking-[-0.015em] text-ink">{record.fileName}</h2>
          <p className="mt-2 text-[0.875rem] leading-6 text-ink-secondary">
            {record.description ?? "No private description added."}
          </p>
        </div>
        <span
          className={`rounded-btn px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] ${
            record.status === "superseded"
              ? "bg-warning/10 text-warning"
              : "bg-success/10 text-success"
          }`}
        >
          {record.status}
        </span>
      </div>

      <dl className="mt-6 grid gap-3 md:grid-cols-2">
        {[
          ["Attestation ref", record.attestationRef],
          ["Document hash", record.documentHash],
          ["Wallet", record.attestingWallet],
          ["Recorded at", new Date(record.notarizedAt).toLocaleString()],
          ["Tags", record.tags.length ? record.tags.join(", ") : "None"],
          ["Public note", record.publicSupersededNote ?? "None"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-ui-border bg-surface px-4 py-3">
            <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
              {label}
            </dt>
            <dd className="mt-2 break-all text-[0.875rem] leading-6 text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {record.status !== "superseded" ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowSupersede((value) => !value)}
            className="rounded-btn border border-ui-border px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-secondary transition hover:border-ink-secondary"
          >
            {showSupersede ? "Hide supersede form" : "Mark as superseded"}
          </button>
          {showSupersede ? <SupersedeForm record={record} onSaved={onUpdated} /> : null}
        </div>
      ) : record.privateSupersededNote ? (
        <div className="mt-5 rounded-card border border-warning/30 bg-warning/5 px-4 py-4 text-[0.875rem] leading-6 text-warning">
          <p className="font-semibold">Private owner note</p>
          <p className="mt-1">{record.privateSupersededNote}</p>
        </div>
      ) : null}
    </article>
  );
}

function DashboardFallback({ message }: { message: string }) {
  return (
    <div className="space-y-8">
      <section className="rounded-card border border-ui-border bg-base p-8 shadow-card">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Dashboard
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">{message}</h1>
      </section>
      <TrustBanner
        title="Private metadata stays here"
        body="File names, descriptions, tags, and private supersession notes are visible only in owner-authenticated dashboard views."
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
  const preferredWallet =
    wallets.find((wallet) => wallet.type === "ethereum" && wallet.linked) ??
    wallets.find((wallet) => wallet.type === "ethereum");

  useEffect(() => {
    if (!ready || !authenticated) {
      return;
    }

    let active = true;
    setState((current) => ({
      ...current,
      status: "loading",
      error: null
    }));
    setProfileState((current) => ({
      ...current,
      status: "loading",
      error: null
    }));

    void getAccessToken()
      .then((token) => {
        if (!token) {
          throw new Error("Missing Privy access token.");
        }

        const headers = {
          Authorization: `Bearer ${token}`
        };

        return Promise.all([
          fetch("/api/dashboard/attestations", { headers }),
          fetch("/api/dashboard/profile", { headers })
        ]);
      })
      .then(async ([recordsResponse, profileResponse]) => {
        const recordsPayload = (await recordsResponse.json()) as
          | DashboardListResponse
          | { error: string };
        if (!recordsResponse.ok || "error" in recordsPayload) {
          throw new Error(
            "error" in recordsPayload ? recordsPayload.error : "Could not load dashboard."
          );
        }

        const profilePayload = (await profileResponse.json()) as
          | UserProfileResponse
          | { error: string };
        if (!profileResponse.ok || "error" in profilePayload) {
          throw new Error(
            "error" in profilePayload ? profilePayload.error : "Could not load profile."
          );
        }

        if (!active) {
          return;
        }

        setState({
          status: "ready",
          records: recordsPayload.records,
          error: null
        });
        setProfileState({
          status: "ready",
          profile: profilePayload.profile,
          error: null
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          status: "error",
          records: [],
          error: error instanceof Error ? error.message : "Could not load dashboard."
        });
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

  const filteredRecords = useMemo(
    () => filterOwnerAttestations(state.records, { query, status: statusFilter }),
    [query, state.records, statusFilter]
  );
  const ownerLabel = resolveOwnerDisplayName({
    profile: profileState.profile,
    walletAddress: preferredWallet?.address ?? null
  });

  if (!ready) {
    return <DashboardFallback message="Loading your private archive..." />;
  }

  if (!authenticated) {
    return (
      <div className="space-y-8">
        <section className="rounded-card border border-ui-border bg-base p-8 shadow-card">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
            Dashboard
          </p>
          <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
            Sign in to view your private attestation archive.
          </h1>
          <p className="mt-4 max-w-2xl text-[0.875rem] leading-7 text-ink-secondary">
            Public verification is proof-only. File names, descriptions, tags, and
            private notes live here behind owner authentication.
          </p>
          <button
            type="button"
            onClick={() => login()}
            className="mt-6 rounded-btn bg-action px-5 py-2.5 text-[0.75rem] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-action/90"
          >
            Sign in with Privy
          </button>
        </section>
        <TrustBanner
          title="Why this route is private"
          body="This dashboard is the only place where private metadata such as filenames, descriptions, tags, and internal supersession notes are exposed."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-card border border-ui-border bg-base p-8 shadow-card">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Dashboard
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.025em] text-ink">
          Private evidence archive for {ownerLabel}.
        </h1>
        <p className="mt-3 text-[0.875rem] leading-6 text-ink-secondary">
          Your private display name stays inside authenticated owner views and never
          appears on public proof pages.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search by file name, description, tag, or reference"
            className="rounded-btn border border-ui-border bg-surface px-4 py-3 text-[0.875rem] text-ink outline-none focus:border-action"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.currentTarget.value as "all" | "active" | "superseded")
            }
            className="rounded-btn border border-ui-border bg-surface px-4 py-3 text-[0.875rem] text-ink outline-none focus:border-action"
          >
            <option value="all">All records</option>
            <option value="active">Active</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>
      </div>

      <ProfileSettingsCard
        profile={profileState.profile}
        walletAddress={preferredWallet?.address ?? null}
        onSaved={(profile) => {
          setProfileState({
            status: "ready",
            profile,
            error: null
          });
        }}
      />

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

      {state.status === "loading" ? (
        <div className="rounded-card border border-ui-border bg-surface px-5 py-4 text-[0.875rem] text-ink-secondary">
          Loading your attestation archive...
        </div>
      ) : null}

      {state.status !== "loading" && filteredRecords.length === 0 ? (
        <div className="rounded-card border border-ui-border bg-surface px-5 py-4 text-[0.875rem] text-ink-secondary">
          No matching attestations found.
        </div>
      ) : null}

      {filteredRecords.map((record) => (
        <AttestationCard
          key={record.id}
          record={record}
          onUpdated={(updatedRecord) => {
            setState((current) => ({
              ...current,
              records: current.records.map((record) =>
                record.id === updatedRecord.id ? updatedRecord : record
              )
            }));
          }}
        />
      ))}

      <TrustBanner
        title="Proof-only public pages"
        body="Public verification and receipt pages intentionally hide filename, description, tags, and private notes. Only the owner dashboard reveals that metadata."
      />

      <section className="rounded-card border border-ui-border bg-base p-6 shadow-card">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
          Supersession guidance
        </p>
        <p className="mt-3 text-[0.875rem] leading-6 text-ink-secondary">
          Use a public note only when external reviewers need a brief status context.
          Keep case details, client names, and internal reasoning in the private note.
        </p>
      </section>
    </div>
  );
}

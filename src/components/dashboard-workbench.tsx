"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { TrustBanner } from "@/components/trust-banner";
import type { AttestationRecord, DashboardListResponse } from "@/lib/domain";
import { filterOwnerAttestations } from "@/lib/records";

type DashboardState =
  | { status: "idle" | "loading"; records: AttestationRecord[]; error: null }
  | { status: "ready"; records: AttestationRecord[]; error: null }
  | { status: "error"; records: AttestationRecord[]; error: string };

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
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Shareable public note
        </label>
        <textarea
          value={publicNote}
          onChange={(event) => setPublicNote(event.currentTarget.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          placeholder="Optional note visible on proof-only public certificates"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Private owner note
        </label>
        <textarea
          value={privateNote}
          onChange={(event) => setPrivateNote(event.currentTarget.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          placeholder="Internal note kept off public verification surfaces"
        />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
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
    <article className="rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-xl shadow-blue-950/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {record.status === "superseded" ? "Superseded record" : "Active record"}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{record.fileName}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {record.description ?? "No private description added."}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
            record.status === "superseded"
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
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
          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {label}
            </dt>
            <dd className="mt-2 break-all text-sm leading-6 text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {record.status !== "superseded" ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowSupersede((value) => !value)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            {showSupersede ? "Hide supersede form" : "Mark as superseded"}
          </button>
          {showSupersede ? <SupersedeForm record={record} onSaved={onUpdated} /> : null}
        </div>
      ) : record.privateSupersededNote ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Private owner note</p>
          <p className="mt-1">{record.privateSupersededNote}</p>
        </div>
      ) : null}
    </article>
  );
}

function DashboardFallback({ message }: { message: string }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{message}</h1>
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
  const [state, setState] = useState<DashboardState>({
    status: "idle",
    records: [],
    error: null
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "superseded">("all");

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

    void getAccessToken()
      .then((token) => {
        if (!token) {
          throw new Error("Missing Privy access token.");
        }

        return fetch("/api/dashboard/attestations", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      })
      .then(async (response) => {
        const payload = (await response.json()) as DashboardListResponse | { error: string };
        if (!response.ok || "error" in payload) {
          throw new Error("error" in payload ? payload.error : "Could not load dashboard.");
        }

        if (!active) {
          return;
        }

        setState({
          status: "ready",
          records: payload.records,
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
      });

    return () => {
      active = false;
    };
  }, [authenticated, getAccessToken, ready]);

  const filteredRecords = useMemo(
    () => filterOwnerAttestations(state.records, { query, status: statusFilter }),
    [query, state.records, statusFilter]
  );

  if (!ready) {
    return <DashboardFallback message="Loading your private archive..." />;
  }

  if (!authenticated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Sign in to view your private attestation archive.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Public verification is proof-only. File names, descriptions, tags, and
            private notes live here behind owner authentication.
          </p>
          <button
            type="button"
            onClick={() => login()}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
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
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--card)] p-8 shadow-xl shadow-blue-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Private evidence archive for your attestations.
          </h1>
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search by file name, description, tag, or reference"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.currentTarget.value as "all" | "active" | "superseded")
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
            >
              <option value="all">All records</option>
              <option value="active">Active</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
        </div>

        {state.status === "error" ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            {state.error}
          </div>
        ) : null}

        {state.status === "loading" ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            Loading your attestation archive...
          </div>
        ) : null}

        {state.status !== "loading" && filteredRecords.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
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
      </section>

      <div className="space-y-6">
        <TrustBanner
          title="Proof-only public pages"
          body="Public verification and receipt pages intentionally hide filename, description, tags, and private notes. Only the owner dashboard reveals that metadata."
        />
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-white p-6 shadow-xl shadow-blue-950/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Supersession guidance
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use a public note only when external reviewers need a brief status context.
            Keep case details, client names, and internal reasoning in the private note.
          </p>
        </section>
      </div>
    </div>
  );
}

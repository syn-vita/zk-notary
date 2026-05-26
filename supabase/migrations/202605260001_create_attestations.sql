create extension if not exists pgcrypto;

create table if not exists public.attestations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  document_hash text not null,
  attesting_wallet text not null,
  authorization_digest text not null,
  chain_id bigint not null,
  network_name text not null default 'Sepolia',
  tx_hash text not null,
  log_index integer not null,
  attestation_ref text not null unique,
  file_name text not null,
  file_type text,
  description text,
  tags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'superseded')),
  public_superseded_note text,
  private_superseded_note text,
  notarized_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_hash, attesting_wallet)
);

create index if not exists attestations_user_id_idx on public.attestations (user_id);
create index if not exists attestations_document_hash_idx on public.attestations (document_hash);
create index if not exists attestations_notarized_at_idx on public.attestations (notarized_at desc);

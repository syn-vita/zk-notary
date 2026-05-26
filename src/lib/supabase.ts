import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { AttestationRecord, UserProfile } from "@/lib/domain";
import {
  fromDatabaseProfileRow,
  type DatabaseProfileRow
} from "@/lib/profile";
import {
  fromDatabaseAttestationRow,
  type DatabaseAttestationRow
} from "@/lib/records";

export function getServiceSupabaseClient() {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

export async function getAttestationRecordByRef(attestationRef: string) {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("attestations")
    .select("*")
    .eq("attestation_ref", attestationRef)
    .maybeSingle<DatabaseAttestationRow>();

  if (error) {
    throw error;
  }

  return data ? fromDatabaseAttestationRow(data) : null;
}

export async function getAttestationRecordsByHash(documentHash: string) {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("attestations")
    .select("*")
    .eq("document_hash", documentHash)
    .order("notarized_at", { ascending: true })
    .returns<DatabaseAttestationRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(fromDatabaseAttestationRow);
}

export async function getAttestationRecordsByUser(userId: string) {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("attestations")
    .select("*")
    .eq("user_id", userId)
    .order("notarized_at", { ascending: false })
    .returns<DatabaseAttestationRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(fromDatabaseAttestationRow);
}

export async function supersedeAttestationRecord(input: {
  id: string;
  userId: string;
  publicSupersededNote: string | null;
  privateSupersededNote: string | null;
}) {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("attestations")
    .update({
      status: "superseded",
      public_superseded_note: input.publicSupersededNote,
      private_superseded_note: input.privateSupersededNote,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle<DatabaseAttestationRow>();

  if (error) {
    throw error;
  }

  return data ? fromDatabaseAttestationRow(data) : null;
}

export async function getProfileByUserId(userId: string): Promise<UserProfile | null> {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<DatabaseProfileRow>();

  if (error) {
    throw error;
  }

  return data ? fromDatabaseProfileRow(data) : null;
}

export async function upsertProfile(input: {
  userId: string;
  displayName: string;
}): Promise<UserProfile | null> {
  const supabase = getServiceSupabaseClient();
  if (!supabase) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: input.userId,
        display_name: input.displayName,
        updated_at: timestamp
      },
      {
        onConflict: "user_id"
      }
    )
    .select("*")
    .maybeSingle<DatabaseProfileRow>();

  if (error) {
    throw error;
  }

  return data ? fromDatabaseProfileRow(data) : null;
}

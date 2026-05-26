import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { AttestationRecord } from "@/lib/domain";

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
    .maybeSingle<AttestationRecord>();

  if (error) {
    throw error;
  }

  return data;
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
    .returns<AttestationRecord[]>();

  if (error) {
    throw error;
  }

  return data;
}

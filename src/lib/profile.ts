import type { UserProfile } from "./domain.ts";

export type DatabaseProfileRow = {
  user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export function fromDatabaseProfileRow(row: DatabaseProfileRow): UserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function resolveOwnerDisplayName(input: {
  profile: UserProfile | null;
  walletAddress: string | null;
}): string {
  return input.profile?.displayName.trim() || input.walletAddress || "Your account";
}

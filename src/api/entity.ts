// RFC 3339, UTC, millisecond precision.
export type Timestamp = string;

// Usernames, `system` for the LDAP sync.
export type EntityMeta = {
  created_at: Timestamp;
  created_by: string;
  updated_at: Timestamp;
  updated_by: string;
};

// Log entries and files are immutable; revoking is the only change. All three
// are null while the item is active.
export type Revocation = {
  revoked_at: Timestamp | null;
  revoke_reason: string | null;
  revoked_by: string | null;
};

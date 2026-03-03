import crypto from "crypto";

/**
 * Derives a deterministic RTDB ID for a DJ from their username.
 * Uses HMAC-SHA256 so the same username always maps to the same ID,
 * and a different DJ_USERNAME_SECRET produces a different ID.
 *
 * Usernames are lowercased before hashing for case-insensitive lookup.
 */
export function encryptUsername(username: string): string {
  const secret = process.env.DJ_USERNAME_SECRET;
  if (!secret) throw new Error("DJ_USERNAME_SECRET env var is not set");
  return crypto
    .createHmac("sha256", secret)
    .update(username.toLowerCase())
    .digest("hex");
}

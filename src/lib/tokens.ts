import { randomBytes, createHash } from "node:crypto";

/** Returns a raw URL-safe token (given to the user) and its SHA-256 hash (stored in the DB). */
export function generateToken() {
  const raw = randomBytes(32).toString("base64url");
  const hash = hashToken(raw);
  return { raw, hash };
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

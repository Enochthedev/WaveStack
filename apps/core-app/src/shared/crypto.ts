import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/** Hash a plaintext password. Returns a `salt:hash` string safe to store. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

/** Verify a plaintext password against a stored `salt:hash` string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedHash = Buffer.from(hashHex, "hex");
  if (hash.length !== storedHash.length) return false;
  return timingSafeEqual(hash, storedHash);
}

/** Generate a cryptographically random opaque token (for refresh tokens, API keys). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

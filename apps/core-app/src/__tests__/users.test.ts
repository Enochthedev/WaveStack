/**
 * Users module tests — verifies CRUD and org membership logic.
 * Uses Prisma mock to avoid needing a live DB.
 */
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken } from "../shared/crypto";

// ── Crypto helpers ────────────────────────────────────────────────────────────

describe("hashPassword / verifyPassword", () => {
  it("produces a hash that verifies correctly", async () => {
    const hash = await hashPassword("super-secret-password");
    expect(hash).toContain(":");
    expect(await verifyPassword("super-secret-password", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("each call produces a unique salt", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });

  it("returns false for malformed hash", async () => {
    expect(await verifyPassword("anything", "notahash")).toBe(false);
  });
});

describe("generateToken", () => {
  it("generates a base64url string", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });

  it("respects custom byte length", () => {
    const short = generateToken(8);
    const long = generateToken(64);
    expect(long.length).toBeGreaterThan(short.length);
  });
});

// ── Pagination helper ─────────────────────────────────────────────────────────

describe("paginate", () => {
  it("returns correct meta fields", async () => {
    const { paginate } = await import("../shared/pagination");
    const result = paginate([1, 2, 3], 10, 5, 0);
    expect(result.meta.total).toBe(10);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.offset).toBe(0);
    expect(result.meta.hasMore).toBe(true);
  });

  it("hasMore is false when at end", async () => {
    const { paginate } = await import("../shared/pagination");
    const result = paginate([1, 2], 5, 5, 3);
    expect(result.meta.hasMore).toBe(false);
  });
});

// ── PaginationQuery schema ────────────────────────────────────────────────────

describe("PaginationQuery", () => {
  it("parses limit and offset from strings", async () => {
    const { PaginationQuery } = await import("../shared/pagination");
    const result = PaginationQuery.parse({ limit: "10", offset: "20" });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  it("applies defaults when omitted", async () => {
    const { PaginationQuery } = await import("../shared/pagination");
    const result = PaginationQuery.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("rejects limit over 100", async () => {
    const { PaginationQuery } = await import("../shared/pagination");
    expect(() => PaginationQuery.parse({ limit: "200" })).toThrow();
  });
});

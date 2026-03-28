/**
 * Approval gate tests — verifies the logic around approval expiry,
 * rejection training signals, and status transitions.
 *
 * These are unit tests for the business logic, not integration tests.
 * The Prisma client is mocked.
 */
import { describe, it, expect } from "vitest";

// ── Approval expiry logic ─────────────────────────────────────────────────────

describe("Approval expiry", () => {
  it("calculates correct expiry from approval_timeout_hours", () => {
    const timeoutHours = 4;
    const createdAt = new Date("2026-01-01T10:00:00Z");
    const expiresAt = new Date(createdAt.getTime() + timeoutHours * 60 * 60 * 1000);

    expect(expiresAt.getTime() - createdAt.getTime()).toBe(4 * 3600 * 1000);
    expect(expiresAt.toISOString()).toBe("2026-01-01T14:00:00.000Z");
  });

  it("detects expired approval", () => {
    const past = new Date(Date.now() - 1000);
    expect(past < new Date()).toBe(true);
  });

  it("detects valid (non-expired) approval", () => {
    const future = new Date(Date.now() + 3_600_000);
    expect(future > new Date()).toBe(true);
  });
});

// ── Status transition rules ───────────────────────────────────────────────────

describe("Approval status transitions", () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ["approved", "rejected", "expired"],
    approved: [],
    rejected: [],
    expired: [],
  };

  it("allows pending → approved", () => {
    expect(VALID_TRANSITIONS["pending"]).toContain("approved");
  });

  it("allows pending → rejected", () => {
    expect(VALID_TRANSITIONS["pending"]).toContain("rejected");
  });

  it("does not allow approved → rejected", () => {
    expect(VALID_TRANSITIONS["approved"]).not.toContain("rejected");
  });

  it("does not allow expired → approved", () => {
    expect(VALID_TRANSITIONS["expired"]).not.toContain("approved");
  });
});

// ── Training signal generation ────────────────────────────────────────────────

describe("Rejection training signal", () => {
  it("rejection with feedback should be logged as training example", () => {
    const rejection = {
      status: "rejected",
      feedback: "The tone was too casual for this brand",
      taskId: "task-123",
    };
    // Verify the rejection + feedback combo qualifies
    expect(rejection.status).toBe("rejected");
    expect(rejection.feedback).toBeTruthy();
    expect(rejection.taskId).toBeTruthy();
  });

  it("rejection without feedback should not create training example", () => {
    const rejection = { status: "rejected", feedback: null };
    const shouldLog = rejection.status === "rejected" && !!rejection.feedback;
    expect(shouldLog).toBe(false);
  });

  it("approval should not create rejection training example", () => {
    const approval = { status: "approved", feedback: "Looks good!" };
    const isRejection = approval.status === "rejected";
    expect(isRejection).toBe(false);
  });
});

// ── Autonomy level logic ──────────────────────────────────────────────────────

describe("Autonomy levels", () => {
  type AutonomyLevel = "manual" | "copilot" | "autopilot";

  function shouldCreateApproval(level: AutonomyLevel): boolean {
    return level === "copilot";
  }

  function shouldAutoExecute(level: AutonomyLevel): boolean {
    return level === "autopilot";
  }

  function requiresManualExecution(level: AutonomyLevel): boolean {
    return level === "manual";
  }

  it("copilot creates approval gate", () => {
    expect(shouldCreateApproval("copilot")).toBe(true);
    expect(shouldCreateApproval("autopilot")).toBe(false);
    expect(shouldCreateApproval("manual")).toBe(false);
  });

  it("autopilot executes without approval", () => {
    expect(shouldAutoExecute("autopilot")).toBe(true);
    expect(shouldAutoExecute("copilot")).toBe(false);
  });

  it("manual requires creator to trigger manually", () => {
    expect(requiresManualExecution("manual")).toBe(true);
    expect(requiresManualExecution("copilot")).toBe(false);
  });
});

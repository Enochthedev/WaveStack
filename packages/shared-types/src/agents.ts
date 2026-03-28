// Agent system types

export type AgentType =
  | "personal"
  | "content"
  | "publisher"
  | "community"
  | "analytics"
  | "growth"
  | "moderation";

export type AutonomyLevel = "manual" | "copilot" | "autopilot";

export type AgentTaskStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "done"
  | "failed"
  | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export interface AgentConfig {
  id: string;
  orgId: string;
  agentType: AgentType;
  autonomyLevel: AutonomyLevel;
  isEnabled: boolean;
  systemPrompt: string | null;
  allowedSkills: string[];
  config: Record<string, unknown>;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  orgId: string;
  agentType: AgentType;
  title: string;
  status: AgentTaskStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  reasoningTrace: Record<string, unknown> | null;
  skillId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  approvalRequest?: ApprovalRequest | null;
}

export interface ApprovalRequest {
  id: string;
  orgId: string;
  taskId: string;
  agentType: AgentType;
  title: string;
  description: string | null;
  proposedAction: Record<string, unknown>;
  status: ApprovalStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  feedback: string | null;
  expiresAt: string;
  createdAt: string;
  task?: Pick<AgentTask, "agentType" | "title" | "input">;
}

export interface AgentCrew {
  id: string;
  orgId: string;
  name: string;
  goal: string;
  agentTypes: AgentType[];
  status: "idle" | "running" | "paused" | "done";
  createdAt: string;
}

export interface ChatSession {
  id: string;
  orgId: string;
  userId: string;
  context: Record<string, unknown>;
  createdAt: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentType: AgentType | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreatorModel {
  id: string;
  orgId: string;
  baseModel: string;
  version: number;
  status: "pending" | "training" | "ready" | "deployed" | "failed";
  trainingExamplesCount: number;
  confidenceScore: number; // 0-1
  endpointUrl: string | null;
  deployedAt: string | null;
  createdAt: string;
}

export interface TrainingExample {
  id: string;
  orgId: string;
  exampleType: "chat_response" | "caption" | "rejection";
  prompt: string;
  response: string;
  feedback: string | null;
  platform: string | null;
  qualityScore: number | null;
  usedInTraining: boolean;
  createdAt: string;
}

// Model router types
export interface ModelRouterRequest {
  taskType: string;
  creatorId: string;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface ModelRouterResponse {
  response: string;
  model: "personal" | "platform_base" | "claude";
  confidence: number;
  escalated: boolean;
}

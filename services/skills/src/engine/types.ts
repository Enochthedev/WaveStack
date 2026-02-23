export interface SkillStep {
  name: string;
  serverName: string;
  toolName: string;
  // A mapping of tool arguments to either static values or jsonpath expressions referencing previous step outputs
  arguments: Record<string, any>;
  description?: string;
}

export interface SkillDefinition {
  steps: SkillStep[];
}

export interface SkillStepResult {
  stepName: string;
  status: "success" | "error";
  output?: any;
  error?: string;
  durationMs: number;
}

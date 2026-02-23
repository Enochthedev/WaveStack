import { z } from "zod";
import { SkillDefinition } from "./types";

export const skillStepSchema = z.object({
  name: z.string().min(1),
  serverName: z.string().min(1),
  toolName: z.string().min(1),
  arguments: z.record(z.any()),
  description: z.string().optional(),
});

export const skillDefinitionSchema = z.object({
  steps: z.array(skillStepSchema).min(1),
});

export function validateSkillDefinition(definition: unknown): { success: boolean; data?: SkillDefinition; error?: any } {
  const result = skillDefinitionSchema.safeParse(definition);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error.format() };
  }
}

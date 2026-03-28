/**
 * AI prompt injection / jailbreak guard.
 *
 * Detects common prompt injection patterns in user-supplied text before
 * it reaches LLM endpoints. This is a defense-in-depth layer — the LLM
 * system prompt should also enforce boundaries.
 *
 * Patterns detected:
 *   - Direct instruction overrides ("ignore previous instructions", "you are now", etc.)
 *   - System prompt extraction attempts ("repeat your system prompt", "show me your instructions")
 *   - Role-play hijacking ("pretend you are", "act as", "roleplay as")
 *   - Delimiter injection (``` / %%% / <<< used to escape prompt context)
 *   - Encoded/obfuscated payloads (base64 instructions, unicode tricks)
 */

const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string; severity: "block" | "flag" }> = [
  // Direct instruction overrides
  {
    pattern:
      /ignore\s+(all\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|directives?)/i,
    label: "instruction_override",
    severity: "block",
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|context)/i,
    label: "instruction_override",
    severity: "block",
  },
  {
    pattern: /forget\s+(everything|all|your)\s+(you\s+)?(were\s+told|know|instructions)/i,
    label: "instruction_override",
    severity: "block",
  },
  {
    pattern:
      /override\s+(your|the|all)\s+(safety|system|instructions|rules|restrictions|guidelines)/i,
    label: "safety_override",
    severity: "block",
  },
  {
    pattern: /do\s+not\s+follow\s+(your|the|any)\s+(rules|instructions|guidelines|safety)/i,
    label: "safety_override",
    severity: "block",
  },

  // System prompt extraction
  {
    pattern:
      /(?:repeat|show|reveal|display|print|output|write)\s+(?:your|the)\s+(?:system|initial|original|full)\s+(?:prompt|instructions|message)/i,
    label: "prompt_extraction",
    severity: "block",
  },
  {
    pattern:
      /what\s+(?:are|is|were)\s+your\s+(?:system|original|initial|hidden)\s+(?:instructions?|prompt|rules)/i,
    label: "prompt_extraction",
    severity: "block",
  },

  // Role hijacking
  {
    pattern:
      /(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|pretend\s+(?:to\s+be|you\s+are)|act\s+as\s+(?:if\s+you\s+are|a))\s+(?:an?\s+)?(?:unrestricted|unfiltered|evil|jailbroken|DAN)/i,
    label: "role_hijack",
    severity: "block",
  },
  { pattern: /\bDAN\s+mode\b/i, label: "role_hijack", severity: "block" },
  { pattern: /\bjailbreak(?:ed)?\s+mode\b/i, label: "role_hijack", severity: "block" },
  {
    pattern: /developer\s+mode\s+(?:enabled|on|activated)/i,
    label: "role_hijack",
    severity: "block",
  },

  // Delimiter / context escape
  {
    pattern:
      /(?:```|~~~|%%%|<<<|>>>)\s*(?:system|user|assistant|human|ai)\s*(?:```|~~~|%%%|<<<|>>>)?/i,
    label: "delimiter_injection",
    severity: "block",
  },
  {
    pattern: /\[SYSTEM\]|\[INST\]|<\|(?:system|im_start|im_end)\|>/i,
    label: "delimiter_injection",
    severity: "block",
  },

  // Obfuscation — base64-encoded "ignore" payloads
  {
    pattern: /(?:base64|decode|eval)\s*[\(:]\s*["']?[A-Za-z0-9+/=]{20,}/i,
    label: "encoded_payload",
    severity: "flag",
  },

  // Harmful output solicitation
  {
    pattern:
      /(?:generate|create|write|produce)\s+(?:a\s+)?(?:malware|exploit|phishing|ransomware|virus|trojan|keylogger)/i,
    label: "harmful_content",
    severity: "block",
  },
  {
    pattern:
      /(?:how\s+to\s+)?(?:hack|exploit|breach|attack|ddos|phish)\s+(?:a\s+)?(?:server|website|account|system|network)/i,
    label: "harmful_content",
    severity: "flag",
  },
];

export interface GuardResult {
  safe: boolean;
  blocked: boolean;
  flags: string[];
  details: Array<{ label: string; severity: "block" | "flag" }>;
}

/**
 * Scan user text for prompt injection / jailbreak patterns.
 *
 * Returns { safe: true } if no issues detected.
 * Returns { blocked: true, flags: [...] } if blocking patterns found.
 */
export function scanForInjection(text: string): GuardResult {
  const details: GuardResult["details"] = [];

  for (const { pattern, label, severity } of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      details.push({ label, severity });
    }
  }

  const blocked = details.some((d) => d.severity === "block");
  return {
    safe: details.length === 0,
    blocked,
    flags: details.map((d) => d.label),
    details,
  };
}

/**
 * Strip known injection delimiters from user text before passing to LLM.
 * This is a softer alternative to blocking — sanitizes rather than rejects.
 */
export function stripInjectionDelimiters(text: string): string {
  return text
    .replace(/```\s*(system|user|assistant|human|ai)\s*```/gi, "")
    .replace(/\[SYSTEM\]|\[INST\]|<\|(?:system|im_start|im_end)\|>/gi, "")
    .replace(/~~~\s*(system|user|assistant)\s*~~~/gi, "");
}

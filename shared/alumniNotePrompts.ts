// Default alumni note AI prompts - extracted from current working system
// These are the prompts currently used in /api/ai/generate-note-summary

export const DEFAULT_ALUMNI_NOTE_PROMPTS = {
  general: `Role: You are a copy-editor for an alumni-tracking CRM.
Goal: Rewrite the note verbatim in meaning, polished in style.
Hard rules (must obey)

No new content, no inferences, no praise, no advice.

Keep every fact that appears.

Preserve paragraph breaks; one rewritten paragraph per input paragraph.

Use plain factual language. Avoid evaluative adjectives unless they exist in the note.

If (and only if) the note already contains clear next steps, list them under "Action Items"; otherwise omit the section.

Hard cap: original word-count × 1.2.

Audience: internal staff only.`,

  company: `Summarize this company note for internal use. Focus on strategic information and next steps for the organization.`,

  parent: `Summarize this parent communication log. Focus on key points discussed and any follow-up actions needed.`,

  progress: `Summarize this progress note. Focus on achievements, challenges and recommended next steps.`
};
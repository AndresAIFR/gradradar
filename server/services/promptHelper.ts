import { storage } from "../storage.js";

export const getUserPrompts = async (userId: string) => {
  try {
    delete require.cache[require.resolve("../shared/defaultPrompts")];
    const { DEFAULT_PROMPTS } = await import("../shared/defaultPrompts?t=" + Date.now());
    const custom = await storage.getAiPrompts(userId);
    return {
      parentEmailPrompt: custom?.parentEmailPrompt || DEFAULT_PROMPTS.parentEmailPrompt,
      parentTextPrompt: custom?.parentTextPrompt || DEFAULT_PROMPTS.parentTextPrompt,
      companySummaryPrompt: custom?.companySummaryPrompt || DEFAULT_PROMPTS.companySummaryPrompt,
    };
  } catch {
    const { DEFAULT_PROMPTS } = await import("../shared/defaultPrompts.js?t=" + Date.now());
    return {
      parentEmailPrompt: DEFAULT_PROMPTS.parentEmailPrompt,
      parentTextPrompt: DEFAULT_PROMPTS.parentTextPrompt,
      companySummaryPrompt: DEFAULT_PROMPTS.companySummaryPrompt,
    };
  }
};
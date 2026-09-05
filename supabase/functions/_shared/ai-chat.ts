import { createOpenAIChat } from "./openai-chat.ts";

// Owner confirmed on 2026-09-05 that this project's Gemini key uses paid services.
// Recheck data policy before replacing the key/project. Never use unpaid services
// for church member data. Existing handlers authenticate, authorize and rate-limit.
export const aiChat = createOpenAIChat({ provider: "gemini" });

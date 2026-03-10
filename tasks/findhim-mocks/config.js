import "dotenv/config";

export const AI_DEVS_KEY = process.env.AI_DEVS_KEY?.trim() ?? "";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? "";

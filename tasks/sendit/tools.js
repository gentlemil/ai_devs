import OpenAI from "openai";
import {
  AI_API_KEY,
  AI_PROVIDER,
  AI_DEVS_KEY,
  resolveModelForProvider,
} from "../../config.js";
import { describe } from "node:test";

// client vision - separate instance with the same provider
const visionClient = new OpenAI({
  apiKey: AI_API_KEY,
  ...(AI_PROVIDER === "openrouter" && {
    baseURL: "https://openrouter.ai/api/v1",
  }),
});

// fetch text document (md, html etc.) - agent'll use it to iteratively read subsequent documentation files:
async function fetchDocument({ url }) {
  console.log(`  📄 fetch_document: ${url}`);

  const res = await fetch(url);

  if (!res.ok) return { error: `HTTP ${res.status}` };

  const text = await res.text();

  console.log(`     → ${text.length} znaków`);

  return { content: text };
}

// fetch image to vision model (separate LLM instance and return full text analysis (use for all png/jpg/etc. files)
async function analyzeImage({ url, question }) {
  console.log(`  🖼️  analyze_image: ${url}`);
  console.log(`     pytanie: ${question}`);

  const reponse = await visionClient.chat.completions.create({
    model: resolveModelForProvider("google/gemini-2.5-flash"), //google/gemini-2.0-flash
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url } },
          {
            type: "text",
            text: question || "Przepisz cala zawartosc obrazu.",
          },
        ],
      },
    ],
  });

  const result = reponse.choices[0].message.content;
  console.log(`     → ${result.slice(0, 100)}...`);

  return { description: result };
}

// send answet to AI_DEVS hub, returns answer from the hub
async function submitDeclaration({ declaration }) {
  console.log(`  📬 submit_declaration`);
  console.log(`     Treść:\n${declaration}`);

  const res = await fetch("https://hub.ag3nts.org/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apikey: AI_DEVS_KEY,
      task: "sendit",
      answer: { declaration },
    }),
  });

  const data = await res.json();

  console.log(`     Odpowiedź z hub: ${JSON.stringify(data)}`);
  return data;
}

// dispatcher
export async function executeFunction(name, argsString) {
  const args = JSON.parse(argsString);

  console.log("dispacher args:", args);

  switch (name) {
    case "fetch_document":
      return await fetchDocument(args);
    case "analyze_image":
      return await analyzeImage(args);
    case "submit_declaration":
      return await submitDeclaration(args);
    default:
      throw new Error(`Nieznana funkcja: ${name}`);
  }
}

// tools definitions for the agent - to be used in the prompt
export const toolDefinitions = [
  {
    type: "function",
    name: "fetch_document",
    description:
      "Pobiera treść dokumentu tekstowego (markdown, HTML, txt) z podanego URL. Użyj by pobrać dokumentację SPK.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Pełny URL dokumentu" },
      },
      required: ["url"],
    },
  },
  {
    type: "function",
    name: "analyze_image",
    description:
      "Analizuje zawartość pliku graficznego (PNG, JPG) pod podanym URL. Używaj gdy dokumentacja wskazuje na plik graficzny. Zawsze pytaj o CAŁY tekst, tabele i formularze widoczne na obrazie.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Pełny URL obrazu" },
        question: {
          type: "string",
          description: "Co dokładnie chcesz wiedzieć o obrazie",
        },
      },
      required: ["url"],
    },
  },
  {
    type: "function",
    name: "submit_declaration",
    description:
      "Wysyła wypełnioną deklarację transportową do weryfikacji. Używaj TYLKO gdy masz kompletną, wypełnioną deklarację zgodną ze wzorem.",
    parameters: {
      type: "object",
      properties: {
        declaration: {
          type: "string",
          description:
            "Pełny tekst wypełnionej deklaracji, zachowując oryginalne formatowanie wzoru",
        },
      },
      required: ["declaration"],
    },
  },
];

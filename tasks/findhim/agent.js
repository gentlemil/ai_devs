import OpenAI from "openai";
import {
  AI_API_KEY,
  AI_PROVIDER,
  resolveModelForProvider,
} from "../../config.js";
import { toolDefinitions, executeFunction } from "./tools.js";

const MAX_ITERATIONS = 15;

// ── Konfiguracja klienta OpenAI ────────────────────────────

const client = new OpenAI({
  apiKey: AI_API_KEY,
  ...(AI_PROVIDER === "openrouter" && {
    baseURL: "https://openrouter.ai/api/v1",
  }),
});

// ── Prompt systemowy ───────────────────────────────────────

const SYSTEM_PROMPT = `Jesteś agentem, który namierza podejrzane osoby w pobliżu elektrowni atomowych.

Masz do dyspozycji narzędzia:
- get_power_plants — pobiera listę elektrowni (z koordynatami i kodami)
- get_survivor_locations — pobiera listę lokalizacji danej osoby
- check_access_level — sprawdza poziom dostępu osoby
- submit_answer — wysyła finalną odpowiedź

Twoje zadanie krok po kroku:
1. Pobierz listę elektrowni (get_power_plants).
2. Dla każdej podejrzanej osoby pobierz jej lokalizacje (get_survivor_locations).
3. Porównaj współrzędne osoby ze współrzędnymi elektrowni. Oblicz odległość Haversine. 
   Znajdź osobę, która miała lokalizację NAJBLIŻEJ którejkolwiek elektrowni.
4. Dla tej osoby sprawdź poziom dostępu (check_access_level).
5. Wyślij odpowiedź (submit_answer) z imieniem, nazwiskiem, accessLevel i kodem elektrowni.

Wzór Haversine (użyj do obliczeń):
d = 2R × arcsin(√(sin²(Δlat/2) + cos(lat1)×cos(lat2)×sin²(Δlon/2)))
R = 6371 km

WAŻNE: Szukasz osoby z NAJMNIEJSZĄ odległością do jakiejkolwiek elektrowni.`;

// ── Lista podejrzanych (z poprzedniego zadania) ────────────

const SUSPECTS = [
  { name: "Cezary", surname: "Żurek", birthYear: 1987 },
  { name: "Jacek", surname: "Nowak", birthYear: 1991 },
  { name: "Oskar", surname: "Sieradzki", birthYear: 1993 },
  { name: "Wojciech", surname: "Bielik", birthYear: 1986 },
  { name: "Wacław", surname: "Jasiński", birthYear: 1986 },
];

// ── Pętla agenta ───────────────────────────────────────────

async function runAgent() {
  // gpt-5-mini ✅ - 10 iteracji, total usage ponad 10000
  // GPT-4o mini ❓ - niepodolal, przekroczyl 15 iteracji, total usage prawie 7000 tokenow
  const model = resolveModelForProvider("gpt-5-mini");
  // const model = resolveModelForProvider("gpt-4o-mini");

  // input to tablica wiadomości — zaczynamy od system + user
  const input = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Oto lista podejrzanych osób:\n${JSON.stringify(SUSPECTS, null, 2)}\n\nZnajdź osobę najbliżej elektrowni, sprawdź jej poziom dostępu i wyślij odpowiedź.`,
    },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n── Iteracja ${i + 1} ──────────────────────────`);

    const response = await client.responses.create({
      model,
      input,
      tools: toolDefinitions,
    });

    console.log("🧮 Usage:", {
      input: response.usage?.input_tokens,
      output: response.usage?.output_tokens,
      total: response.usage?.total_tokens,
    });

    // Sprawdź co zwrócił model
    const functionCalls = response.output.filter(
      (item) => item.type === "function_call",
    );
    const messages = response.output.filter((item) => item.type === "message");

    // Jeśli model zwrócił tekst (bez tool calli) → koniec
    if (functionCalls.length === 0) {
      const text =
        messages.map((m) => m.content.map((c) => c.text).join("")).join("\n") ||
        response.output_text;
      console.log("\n✅ Agent zakończył:", text);
      return;
    }

    // Dodaj CAŁY output modelu (reasoning + function_call + message) do inputu
    input.push(...response.output);

    // Wykonaj tool calle i dodaj wyniki
    for (const call of functionCalls) {
      console.log(`🔧 Tool: ${call.name}(${call.arguments})`);

      const result = await executeFunction(call.name, call.arguments);
      console.log(`📦 Wynik:`, JSON.stringify(result).slice(0, 200));

      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  console.error("❌ Agent przekroczył limit iteracji!");
}

// ── Start ──────────────────────────────────────────────────

runAgent().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

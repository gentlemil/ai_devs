import OpenAI from "openai";
import {
  AI_API_KEY,
  AI_PROVIDER,
  resolveModelForProvider,
} from "../../config.js";
import { toolDefinitions, executeFunction } from "./tools.js";

const MAX_ITERATIONS = 20;

const client = new OpenAI({
  apiKey: AI_API_KEY,
  ...(AI_PROVIDER === "openrouter" && {
    baseURL: "https://openrouter.ai/api/v1",
  }),
});

const SYSTEM_PROMPT = `Jesteś agentem wypełniającym deklarację transportową w Systemie Przesyłek Konduktorskich (SPK).

## Twoje zadanie:
Wypełnij i wyślij deklarację transportową dla przesyłki o parametrach podanych przez użytkownika.

## Jak działać:
1. Pobierz dokumentację zaczynając od index.md pod wskazanym URL.
2. Przeczytaj index.md i zidentyfikuj WSZYSTKIE linkowane pliki — wzory formularzy, tabele opłat, listy tras, załączniki. Pobierz je wszystkie narzędziem fetch_document.
3. Jeśli któryś plik ma rozszerzenie graficzne (.png, .jpg, .gif, .webp), użyj analyze_image i poproś o przepisanie CAŁEJ zawartości obrazu.
4. Znajdź wzór deklaracji i ustal:
   - prawidłowy kod trasy dla podanej relacji
   - kategorię przesyłki
   - należną opłatę (lub potwierdzenie że jest darmowa)
5. Wypełnij WSZYSTKIE pola wzoru deklaracji danymi z zadania.
6. Wyślij deklarację narzędziem submit_declaration.
7. Jeśli hub zwróci błąd, przeczytaj komunikat i popraw deklarację.

## Zasady:
- Formatowanie wzoru musi być zachowane dokładnie (znaki, separatory, kolejność pól)
- NIE dodawaj pól których nie ma we wzorze
- NIE pomijaj pól które są we wzorze`;

const USER_MESSAGE = `Wypełnij deklarację transportową dla następującej przesyłki:

- Dokumentacja SPK: https://hub.ag3nts.org/dane/doc/index.md
- Nadawca (identyfikator): 450202122
- Punkt nadawczy: Gdańsk
- Punkt docelowy: Żarnowiec
- Waga: 2800 kg
- Zawartość: kasety z paliwem do reaktora
- Budżet: 0 PP (przesyłka ma być darmowa lub finansowana przez System)
- Uwagi specjalne: BRAK — nie dodawaj żadnych uwag specjalnych`;

async function runAgent() {
  const model = resolveModelForProvider("google/gemini-2.5-pro");
  // alternatywnie: "anthropic/claude-sonnet-4-5"

  const input = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: USER_MESSAGE },
  ];

  console.log("🚀 Agent startuje...");
  console.log(`   Model: ${model}`);

  for (let i = 0; i <= MAX_ITERATIONS; i++) {
    console.log(`\n══ Iteracja ${i + 1} ══════════════════════════════`);

    const response = await client.responses.create({
      model,
      input,
      tools: toolDefinitions,
      // max_tokens: 2000,
    });

    const functionCalls = response.output.filter(
      (item) => item.type === "function_call",
    );
    const messages = response.output.filter((item) => item.type === "message");

    if (functionCalls.length === 0) {
      const text =
        messages.map((m) => m.content.map((c) => c.text).join("")).join("\n") ||
        response.output_text;
      console.log(`\n✅ Agent zakonczyc prace:`, text);
    }

    console.log(
      `🔧 Tool calle w tej iteracji: ${functionCalls.map((f) => f.name).join(", ")}`,
    );

    input.push(...response.output);

    for (const call of functionCalls) {
      console.log(`\n▶ Wywołanie: ${call.name}`);
      console.log(`  Argumenty: ${call.arguments}`);

      const result = await executeFunction(call.name, call.arguments);

      console.log(`  Wynik (skrót): ${JSON.stringify(result).slice(0, 300)}`);

      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }
  }

  console.error(
    "❌ Osiągnięto maksymalną liczbę iteracji bez zakończenia pracy agenta.",
  );
}

runAgent().catch((err) => {
  console.error("Błąd podczas działania agenta:", err);
  process.exit(1);
});

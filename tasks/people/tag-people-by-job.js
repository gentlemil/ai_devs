import {
  AI_API_KEY,
  EXTRA_API_HEADERS,
  RESPONSES_API_ENDPOINT,
} from "../../config.js";

import { extractResponseText } from "./helpers.js";

export async function tagPeopleByJob(model, people) {
  const prompt = `Task: Tag each person based on their job description.
  Available tags: IT, transport, edukacja, medycyna, praca z ludźmi, praca z pojazdami, praca fizyczna.
  
  Rules:
  - Return ONLY a JSON object with a "results" key.
  - "results" must be an array of objects.
  - Each object must contain: "name", "surname", "born" (integer), "gender", "city", and "tags" (array of strings).
  - One person can have multiple tags.
  - If a job is related to transport/logistics/driving, MUST include the "transport" tag.
  
  Example format:
  { "results": [{ "name": "Jan", "surname": "Kowalski", "born": 1990, "gender": "M", "city": "Grudziądz", "tags": ["transport", "praca z pojazdami"] }] }`;

  const response = await fetch(RESPONSES_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
      ...EXTRA_API_HEADERS,
    },
    body: JSON.stringify({
      model: model,
      input: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(people) },
      ],
      text: {
        format: { type: "json_object" },
      },
    }),
  });

  const data = await response.json();

  // RENTGEN (zostaw to, żebyś widział błędy!)
  if (data.error) {
    console.error("❌ API Error:", data.error);
    throw new Error(data.error.message);
  }

  const text = extractResponseText(data);

  try {
    const parsed = JSON.parse(text);
    return parsed.results || parsed;
  } catch (e) {
    console.log("📩 Raw text that failed to parse:", text);
    throw e;
  }
}

import {
  AI_API_KEY,
  EXTRA_API_HEADERS,
  RESPONSES_API_ENDPOINT,
} from "../../config.js";

const ALLOWED_TAGS = [
  "IT",
  "transport",
  "edukacja",
  "medycyna",
  "praca z ludźmi",
  "praca z pojazdami",
  "praca fizyczna",
];

export async function tagPeopleByJobStructured(model, people) {
  const jobs = people.map((person, index) => ({
    id: index,
    job: person.job,
  }));

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "integer", minimum: 0 },
            tags: {
              type: "array",
              items: { type: "string", enum: ALLOWED_TAGS },
              minItems: 1,
            },
          },
          required: ["id", "tags"],
        },
      },
    },
    required: ["results"],
  };

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
        {
          role: "system",
          content:
            "Klasyfikujesz zawody do tagów. Zwróć wyłącznie dane zgodne ze schematem.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Przypisz tagi do każdego job",
            allowedTags: ALLOWED_TAGS,
            items: jobs,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tags",
          schema,
          strict: true,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `HTTP ${response.status}`);
  }

  const raw =
    data.output_text ??
    data.output
      ?.flatMap((o) => o.content ?? [])
      .find((c) => c.type === "output_text")?.text ??
    "";

  const parsed = JSON.parse(raw);

  return parsed.results.map(({ id, tags }) => ({
    ...people[id],
    tags,
  }));
}

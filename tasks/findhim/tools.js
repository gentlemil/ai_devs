import { AI_DEVS_KEY } from "../../config.js";
import { extractJsonFromHtml } from "./helpers.js";

// ── Haversine ──────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Tools Implementation ────────────────────────────────────

async function getPowerPlants() {
  const url = `https://hub.ag3nts.org/data/${AI_DEVS_KEY}/findhim_locations.json`;
  const response = await fetch(url);
  const html = await response.text();

  if (!response.ok) {
    return { error: `HTTP ${response.status}: ${html.slice(0, 200)}` };
  }

  const jsonText = extractJsonFromHtml(html);
  const data = JSON.parse(jsonText);
  const origin =
    typeof data.locations === "string"
      ? JSON.parse(data.locations)
      : (data.locations ?? data);

  const plants = Object.entries(origin.power_plants).map(([city, rest]) => ({
    city,
    ...rest,
  }));

  return { power_plants: plants };
}

async function getSurvivorLocations({ name, surname }) {
  const response = await fetch("https://hub.ag3nts.org/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: AI_DEVS_KEY,
      name: name.trim(),
      surname: surname.trim(),
    }),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    return {
      error: data?.error?.message || data?.message || `HTTP ${response.status}`,
    };
  }

  return { name, surname, locations: data };
}

async function checkAccessLevel({ name, surname, birthYear }) {
  const response = await fetch("https://hub.ag3nts.org/api/accesslevel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: AI_DEVS_KEY,
      name: name.trim(),
      surname: surname.trim(),
      birthYear,
    }),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    return {
      error: data?.error?.message || data?.message || `HTTP ${response.status}`,
    };
  }

  return { name, surname, accessLevel: data.accessLevel ?? data };
}

async function submitAnswer({ name, surname, accessLevel, powerPlant }) {
  const response = await fetch("https://hub.ag3nts.org/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "findhim",
      apikey: AI_DEVS_KEY,
      answer: { name, surname, accessLevel, powerPlant },
    }),
  });

  const data = await response.json();
  return data;
}

// ── Tools Definition (JSON Schema for OpenAI) ──────────────

export const toolDefinitions = [
  {
    type: "function",
    name: "get_power_plants",
    description:
      "Pobiera listę elektrowni atomowych z API. Każda elektrownia ma: city, latitude, longitude, is_active, power, code (format PWR0000PL).",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    type: "function",
    name: "get_survivor_locations",
    description:
      "Pobiera listę współrzędnych (latitude/longitude), w których widziano daną osobę.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Imię osoby" },
        surname: { type: "string", description: "Nazwisko osoby" },
      },
      required: ["name", "surname"],
    },
  },
  {
    type: "function",
    name: "check_access_level",
    description:
      "Sprawdza poziom dostępu (accessLevel) danej osoby na podstawie imienia, nazwiska i roku urodzenia.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Imię osoby" },
        surname: { type: "string", description: "Nazwisko osoby" },
        birthYear: { type: "integer", description: "Rok urodzenia (np. 1987)" },
      },
      required: ["name", "surname", "birthYear"],
    },
  },
  {
    type: "function",
    name: "submit_answer",
    description:
      "Wysyła finalną odpowiedź do weryfikacji. Użyj dopiero gdy masz: imię, nazwisko, accessLevel i kod elektrowni.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Imię podejrzanego" },
        surname: { type: "string", description: "Nazwisko podejrzanego" },
        accessLevel: {
          type: "integer",
          description: "Poziom dostępu z check_access_level",
        },
        powerPlant: {
          type: "string",
          description: "Kod elektrowni (format PWR0000PL)",
        },
      },
      required: ["name", "surname", "accessLevel", "powerPlant"],
    },
  },
];

// ── Dispatcher ─────────────────────────────────────────────

const handlers = {
  get_power_plants: getPowerPlants,
  get_survivor_locations: getSurvivorLocations,
  check_access_level: checkAccessLevel,
  submit_answer: submitAnswer,
};

export async function executeFunction(name, argsJson) {
  const handler = handlers[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }

  const args = typeof argsJson === "string" ? JSON.parse(argsJson) : argsJson;
  return handler(args);
}

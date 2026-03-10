import { AI_DEVS_KEY } from "./config.js";
import { extractJsonFromHtml } from "./helpers.js";
import { LOCATIONS, SURVIVORS } from "./consts.js";

// 1. Pobieram liste elektrowni z informacjami is_active, power i code
async function getPowerPlantsLocations() {
  const url = `https://hub.ag3nts.org/data/${AI_DEVS_KEY}/findhim_locations.json`;
  const response = await fetch(url, { method: "GET" });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${html.slice(0, 200)}`);
  }

  const jsonText = extractJsonFromHtml(html);
  const data = JSON.parse(jsonText);

  const origin =
    typeof data.locations === "string"
      ? JSON.parse(data.locations)
      : (data.locations ?? data);

  console.log(origin.power_plants);

  const powerPlantsArray = [];

  Object.entries(origin.power_plants).map(([city, rest]) => {
    powerPlantsArray.push({ city: city, ...rest });
  });

  console.log(powerPlantsArray);

  return powerPlantsArray;
}

// getPowerPlantsLocations().catch((error) => {
//   console.error("Error fetching locations:", error);
// });

// 2. Pobieram lokalizacje poszczególnych ocalałych na podstawie imienia i nazwiska
async function getSurvivorLocation(survivor) {
  try {
    const { name, surname } = survivor;

    if (!name?.trim() || !surname?.trim()) {
      throw new Error("Both 'name' and 'surname' are required.");
    }

    const response = await fetch("https://hub.ag3nts.org/api/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apikey: AI_DEVS_KEY,
        name: name.trim(),
        surname: surname.trim(),
      }),
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
    }

    if (!response.ok || data?.error) {
      const message =
        data?.error?.message ||
        data?.message ||
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error("Error in getSurvivorLocation:", error.message);
  }
}

// getSurvivorLocation(SURVIVORS[0]).then((location) => {
//   console.log(location);
// });

// 3. Iteruje po wszystkich ocalałych i pobieram ich lokalizacje
async function getAllSurvivorsLocations() {
  const data = [];

  for (const survivor of SURVIVORS) {
    const locations = await getSurvivorLocation(survivor);
    data.push({ survivor, locations });
  }

  // console.log(data);
  console.dir(data, { depth: null });

  return data;
}

// getAllSurvivorsLocations().catch((error) => {
//   console.error("Error fetching survivors' locations:", error);
// });

// 4. Sprawdzam jaki poziom dostepu ma dana osoba
async function checkSurvivorAccess(survivor) {
  try {
    const { name, surname, born } = survivor;

    // if (!name?.trim() || !surname?.trim() || !born?.trim()) {
    //   throw new Error("Name, surname, and born date are required.");
    // }

    const response = await fetch("https://hub.ag3nts.org/api/accesslevel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apikey: AI_DEVS_KEY,
        name: name.trim(),
        surname: surname.trim(),
        birthYear: born,
      }),
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
    }

    if (!response.ok || data?.error) {
      const message =
        data?.error?.message ||
        data?.message ||
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    console.log(data);

    return data;
  } catch (error) {
    console.error("Error in checkSurvivorAccess:", error.message);
  }
}

// checkSurvivorAccess(SURVIVORS[0]).catch((error) => {
//   console.error("Error checking survivor access:", error);
// });

/**
 * 1. Pobieram liste elektrowni
 * 2. Pobieram lokalizacje poszczególnych ocalałych na podstawie imienia i nazwiska,
 *    sprawdzam kazda potecjalna lokalizacje ocalalego z lista elektrowni i zostawiam jedna, ktora jest najblizej (korzystam z wzoru Haversine)
 *    zapisujac odleglosc o elektrowni i kod elektrowni
 * 3. Porownuje wszystkich
 */

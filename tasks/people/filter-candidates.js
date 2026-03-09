import fs from "fs";
import csv from "csv-parser";

import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 1. Load and parse the CSV file
 * - Find men who are between 20 and 40 years old this year.
 * - Filter men who were born in Grudziądz.
 * We DO NOT NEED TO USE AI for this, it's just data processing, too simple and expensive to do with AI.
 * We can do it with a simple script.
 */
export async function filterCandidates() {
  const filePath = path.join(__dirname, "people.csv");

  console.log(`🔎 I'm looking for file under ${filePath} address`);

  if (!fs.existsSync(filePath)) {
    console.error("❌ Wrong file address...");
    return;
  }

  const candidates = [];
  const currentYear = 2026;
  let totalProcessed = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .on("error", (error) => {
        console.error("❌ Can't find people.csv file", error);
        reject();
      })
      .pipe(csv())
      .on("data", (row) => {
        totalProcessed++;

        // check gender
        const isMan = row.gender === "M";

        // 20-40 years old
        const birthYear = new Date(row.birthDate).getFullYear();
        const age = currentYear - birthYear;
        const hasCorrectAge = age >= 20 && age <= 40;

        // born in Grudziądz
        const isBornInGrudziadz = row.birthPlace === "Grudziądz";

        if (isMan && hasCorrectAge && isBornInGrudziadz) {
          const person = {
            name: row.name,
            surname: row.surname,
            born: birthYear,
            gender: row.gender,
            city: row.birthPlace,
            job: row.job,
          };
          candidates.push(person);
        }
      })
      .on("end", () => {
        console.log(
          `✅ Processed ${totalProcessed} candidates and found ${candidates.length} survivors that match criteria.`,
        );

        resolve(candidates);
      });
  });
}

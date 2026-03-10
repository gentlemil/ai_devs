import { resolveModelForProvider } from "../../config.js";

import { filterCandidates } from "./filter-candidates.js";
// import { tagPeopleByJob } from "./tag-people-by-job.js";
import { tagPeopleByJobStructured } from "./tag-people-by-job-structured.js";
import { submitTask } from "../../utils/submit-task.js";

const TASK_NAME = "people";
const MODEL = resolveModelForProvider("gpt-4o-mini");

async function main() {
  try {
    const filteredCandidates = await filterCandidates();

    // const taggedCandidates = await tagPeopleByJob(MODEL, filteredCandidates);
    const taggedCandidates = await tagPeopleByJobStructured(
      MODEL,
      filteredCandidates,
    );

    const answer = taggedCandidates
      .filter((candidate) => candidate?.tags.includes("transport"))
      .map((candidate) => ({
        name: candidate.name,
        surname: candidate.surname,
        gender: candidate.gender,
        born: candidate.born,
        city: candidate.city,
        tags: candidate.tags,
      }));

    console.log(answer);

    await submitTask(TASK_NAME, answer);
  } catch (error) {
    console.error("sth went wrong, try again later", error);
  }
}

main();

import { AI_DEVS_KEY } from "../config.js";

export const submitTask = async (task, answer) => {
  const response = await fetch("https://hub.ag3nts.org/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: task,
      apikey: AI_DEVS_KEY,
      answer: answer,
    }),
  });

  const result = await response.json();
  console.log("🚩 AI_DEVS Hub response:", result);
};

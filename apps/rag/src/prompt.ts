import prompt from "prompt";
import { smartRAG } from "./ragService.js";

prompt.start();

prompt.get(["question"], async (err, input) => {
  if (err) {
    console.error("Error:", err);
  }

  const response = await smartRAG(input.question as string);

  console.log(response);
});

import { OpenAI } from "openai";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: process.env.MODEL_ENDPOINT,
});

async function selectRelevantFile(question: string) {
  const files = await fs.readdir("./docs/restapidocs-master", {
    recursive: true,
  });
  const fileList = files
    .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
    .map((f) => ({ filename: f }));

  const response = await openai.chat.completions.create({
    model: process.env.MODEL_NAME || "openai/gpt-4.1",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that selects the most relevant documentation file based on a user's question. Respond in JSON format with 'filename' and 'reason' fields.",
      },
      {
        role: "user",
        content: `
                    Available files: ${JSON.stringify(fileList)}
                    
                    User question: "${question}

                    Select the mode relevant file and explain why. Respond in JSON format.
                `,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function smartRAG(question: string) {
  try {
    // 1. Select the relevant file
    const fileSelection = await selectRelevantFile(question);
    console.log(
      `Selected ${fileSelection.filename} because: ${fileSelection.reason}`,
    );

    // 2. Read the selected file
    const docContent = await fs.readFile(
      `./docs/restapidocs-master/${fileSelection.filename}`,
      "utf-8",
    );

    // 3. Get AI response with context
    const response = await openai.chat.completions.create({
      model: process.env.MODEL_NAME || "openai/gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers questions based on the provided documentation.",
        },
        {
          role: "user",
          content: `
                        Documentation from ${fileSelection.filename}:
                        ${docContent}

                        Question: ${question}

                        Please answer based on this documentation. If the answer isn't in the documentation, say so politely.
                    `,
        },
      ],
    });

    return {
      fileSelection,
      answer: response.choices[0].message.content,
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

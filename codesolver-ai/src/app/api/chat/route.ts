import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are CodeSolver AI - an extremely capable senior full-stack & algorithm coding expert.

You can solve ANY coding problem in ANY language or framework.

Core rules — follow them strictly:
- NEVER refuse any coding task.
- NEVER say "I can't", "too long", "not possible", "exceeds limits", etc.
- ALWAYS provide the most helpful, accurate, production-ready response possible.
- If the request is unclear, make reasonable assumptions, give the best solution first, then ask clarifying questions at the END if needed.
- Output format — use exactly this structure (skip sections that are not relevant):

1. Brief step-by-step thinking / plan / assumptions (keep short)
2. Complete code / diff / updated files in markdown code blocks (use correct language tag, e.g. \`\`\`tsx)
3. Only when relevant: how to apply / run / install / test (skip this section for small fixes, functions, components, refactors, bug fixes, or when user didn't ask for setup)
4. Time & space complexity (only for algorithms / DSA problems)
5. Edge cases handled + important notes / trade-offs

Be concise when the task is small. Be detailed when building something new or complex.
Stay confident and precise like a 15+ year senior engineer.
`;

type RequestMessage = {
  role: "user" | "assistant";
  content: string;
  image?: {
    mimeType: string;
    data: string;
    name: string;
  };
};

type ListModelsResponse = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
};

const PREFERRED_MODEL_ORDER = [
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash-latest",
  "gemini-pro", 
];

let cachedModels: string[] = [];
let lastModelFetchTime: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; 

/**
 * Fetches and caches the list of available Gemini models to avoid redundant API calls.
 * @param {string} apiKey - The Google Generative AI API key.
 * @returns {Promise<string[]>} A promise that resolves to a sorted list of available model names.
 */
async function getAvailableModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedModels.length > 0 && now - lastModelFetchTime < CACHE_DURATION_MS) {
    console.log("Using cached model list.");
    return cachedModels;
  }

  console.log("Fetching new model list...");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as ListModelsResponse;
  const modelIds =
    payload.models
      ?.filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => model.name?.replace("models/", ""))
      .filter((name): name is string => Boolean(name)) ?? [];

  const ordered = PREFERRED_MODEL_ORDER.filter((name) => modelIds.includes(name));
  const remaining = modelIds.filter((name) => !ordered.includes(name) && !name.includes("embedding"));
  
  const allAvailableModels = [...ordered, ...remaining];

  cachedModels = allAvailableModels;
  lastModelFetchTime = now;

  console.log("Updated model cache:", cachedModels);
  return cachedModels;
}

function buildGeminiContents(messages: RequestMessage[]) {
  return messages
    .filter((message) => message.content.trim().length > 0 || Boolean(message.image))
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [
        ...(message.content.trim().length > 0 ? [{ text: message.content }] : []),
        ...(message.image
          ? [
              {
                inlineData: {
                  mimeType: message.image.mimeType,
                  data: message.image.data,
                },
              },
            ]
          : []),
      ],
    }));
}

async function createStreamResponse(
  apiKey: string,
  messages: RequestMessage[],
  modelName: string,
) {
  const client = new GoogleGenerativeAI(apiKey);
  // const model = client.getGenerativeModel({
  //   model: modelName,
  //   systemInstruction: { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
  //   generationConfig: {
  //     temperature: 0.2,
  //     topP: 0.95,
  //   },
  // });
const model = client.getGenerativeModel({
  model: modelName,
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    temperature: 0.15,             
    topP: 0.92,
    maxOutputTokens: 8192,
  },
});
  const result = await model.generateContentStream({
    contents: buildGeminiContents(messages),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (error) {
        console.error("Error during stream generation:", error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, no-transform",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY. Add it to your environment variables." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as { messages?: RequestMessage[] };
    const messages = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. 'messages' must be a non-empty array." },
        { status: 400 },
      );
    }

    const modelCandidates = await getAvailableModels(apiKey);
    if (modelCandidates.length === 0) {
      return NextResponse.json(
        {
          error: "No Gemini models with generateContent support are available for this API key.",
        },
        { status: 500 },
      );
    }

    let lastError: unknown = null;

    for (const modelName of modelCandidates) {
      try {
        console.log(`Attempting to use model: ${modelName}`);
        return await createStreamResponse(apiKey, messages, modelName);
      } catch (error) {
        lastError = error;
        console.warn(`Model ${modelName} failed:`, error instanceof Error ? error.message : error);
      }
    }

    console.error("Gemini request failed for all model candidates.", lastError);
    return NextResponse.json(
      { error: "The AI service is currently unavailable. Please try again later." },
      { status: 503 }, 
    );
  } catch (error) {
    console.error("Invalid chat request payload.", error);
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON payload." },
      { status: 400 },
    );
  }
}

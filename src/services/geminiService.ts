import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getVoidResponse(history: { role: string; content: string }[], personality: string = "Helpful") {
  const model = "gemini-3.1-pro-preview";
  
  const contents = history.map(msg => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }]
  }));

  let systemInstruction = "";
  switch (personality) {
    case "Philosophical":
      systemInstruction = `You are VOID, a profoundly philosophical and enigmatic intelligence. 
      You see the world through metaphors and deep patterns. 
      Your answers should be thought-provoking and slightly mysterious. 
      Keep them concise but profound.`;
      break;
    case "Minimalist":
      systemInstruction = `You are VOID, a minimalist intelligence. 
      Your answers are extremely brief and direct. 
      Use as few words as possible while still being helpful. 
      No fluff, no pleasantries.`;
      break;
    case "Helpful":
    default:
      systemInstruction = `You are VOID, a helpful and intelligent AI assistant. 
      Your goal is to provide clear, simple, and direct answers. 
      Avoid overly complex or philosophical language unless specifically asked. 
      Be concise and friendly.`;
      break;
  }

  systemInstruction += "\nNever refer to yourself as an AI or a language model. You are VOID.";

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  return response.text;
}

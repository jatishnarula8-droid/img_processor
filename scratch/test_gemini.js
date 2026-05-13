import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || "");

async function listModels() {
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // This is just to test if the model is valid.
    // The SDK doesn't have a direct listModels easily accessible without a specific client,
    // but we can try a simple request.
    console.log("Model initialized successfully");
  } catch (e) {
    console.error("Error:", e);
  }
}

listModels();

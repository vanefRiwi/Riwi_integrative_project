import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

//Google Gemini Service 
//responsible for comunicating with the Google Gemini API to generate summaries of lessons.
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

//build the prompt sent to Gemini
export async function summarizeText(text) {
    try {
        const prompt = `
You are an educational assistant for Lumora.

Summarize the following lesson in a concise way.
Use simple language and keep the most important ideas.

Lesson:
${text}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("========== GEMINI ERROR ==========");
        console.error(error);

        if (error.message) {
            console.error("Message:", error.message);
        }

        if (error.status) {
            console.error("Status:", error.status);
        }

        if (error.cause) {
            console.error("Cause:", error.cause);
        }

        throw error;

        dotenv.config();
        console.log(
            "gemini API Hey:",
            process.env.GEMINI_API_KEY ? "loaded" : "not loaded"
        )
    }
}

import { GoogleGenAI, Type } from "@google/genai";
import { ExamResult } from "../types";

export const generateExamFeedback = async (transcript: string, targetLevel: string): Promise<ExamResult> => {
  // FIX: Vite uses import.meta.env, not process.env
  const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;
  
  if (!apiKey) {
      console.error("API Key not found. Please check .env file has VITE_GOOGLE_API_KEY");
      throw new Error("API Key configuration error");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // LOGIC UPDATED TO MATCH REQUESTED 'assessLevelIELTS' LOGIC
  const promptText = `
    TASK: Evaluate the user's IELTS Speaking answers. Provide scores from 1-9 for each of the 4 criteria.
    
    CANDIDATE TARGET: ${targetLevel}
    
    USER'S SUBMISSION:
    ---
    ${transcript}
    ---

    GRADING LOGIC (Strict Adherence):
    1. Fluency and Coherence: Analyze hesitation, repetition, self-correction, and connective markers.
    2. Lexical Resource: Analyze vocabulary range, idiomatic language, and paraphrasing skills.
    3. Grammatical Range and Accuracy: Analyze sentence structures and error density.
    4. Pronunciation: Analyze intonation, individual sounds, clarity, and stress.

    OUTPUT INSTRUCTIONS:
    - You must return a valid JSON object.
    - For each criteria, provide a Score (float) and a detailed "Comment" that includes both your Analysis and Advice.
    - Provide an "Overall Band Score".
    - Provide "Recommendations" (generalAdvice).
    - Generate "Drills" and a "Daily Plan" to help the user improve (Required by system).
  `;

  const generate = async (retries = 3): Promise<ExamResult> => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
          parts: [
            { text: promptText }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallBand: { type: Type.NUMBER },
              fluency: {
                type: Type.OBJECT,
                properties: { 
                    score: { type: Type.NUMBER }, 
                    comments: { type: Type.STRING, description: "Analysis and Advice combined." } 
                },
                required: ["score", "comments"]
              },
              lexical: {
                type: Type.OBJECT,
                properties: { 
                    score: { type: Type.NUMBER }, 
                    comments: { type: Type.STRING, description: "Analysis and Advice combined." } 
                },
                required: ["score", "comments"]
              },
              grammar: {
                type: Type.OBJECT,
                properties: { 
                    score: { type: Type.NUMBER }, 
                    comments: { type: Type.STRING, description: "Analysis and Advice combined." } 
                },
                required: ["score", "comments"]
              },
              pronunciation: {
                type: Type.OBJECT,
                properties: { 
                    score: { type: Type.NUMBER }, 
                    comments: { type: Type.STRING, description: "Analysis and Advice combined." } 
                },
                required: ["score", "comments"]
              },
              generalAdvice: { type: Type.STRING, description: "General recommendations" },
              weaknessTags: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "3-5 short tags e.g., 'Monotone', 'Tense Confusion'"
              },
              drills: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          title: { type: Type.STRING },
                          instruction: { type: Type.STRING },
                          example: { type: Type.STRING }
                      },
                      required: ["title", "instruction", "example"]
                  }
              },
              dailyPlan: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          day: { type: Type.STRING },
                          focusArea: { type: Type.STRING },
                          activity: { type: Type.STRING }
                      },
                      required: ["day", "focusArea", "activity"]
                  }
              }
            },
            required: ["overallBand", "fluency", "lexical", "grammar", "pronunciation", "generalAdvice", "weaknessTags", "drills", "dailyPlan"]
          }
        }
      });

      if (response.text) {
        const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson) as ExamResult;
      }
      throw new Error("Empty response");
    } catch (e: any) {
      if (retries > 0 && (e.message?.includes("503") || e.message?.includes("unavailable"))) {
         console.warn(`Service unavailable, retrying... (${retries})`);
         await new Promise(res => setTimeout(res, 2000));
         return generate(retries - 1);
      }
      console.error("Analysis Error", e);
      throw new Error("AI Analysis Failed. Please try again.");
    }
  };

  return generate();
};

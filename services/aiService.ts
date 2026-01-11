
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
  
  // LOGIC UPDATED FOR "COACH" MODE
  const promptText = `
    TASK: Act as an elite IELTS Speaking Coach. Evaluate the candidate's answers and TEACH them how to improve.
    
    CANDIDATE TARGET: ${targetLevel}
    
    USER'S SUBMISSION:
    ---
    ${transcript}
    ---

    GRADING LOGIC (Strict Adherence):
    1. Fluency: Analyze hesitation, repetition, and flow.
    2. Lexical: Analyze vocabulary range and idiomatic usage.
    3. Grammar: Analyze sentence structures and errors.
    4. Pronunciation: Analyze intonation and clarity.

    COACHING REQUIREMENTS:
    - Provide a "Band 9.0 Response" (band9Response) for the main topic discussed. This is critical for the user to learn by example.
    - Provide a "Coach Tip" (coachTip) - a single, high-impact piece of advice (e.g. "You overuse 'very'. Use 'immensely' or 'substantially' instead.").

    OUTPUT INSTRUCTIONS:
    - Return a valid JSON object.
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
                    comments: { type: Type.STRING } 
                },
                required: ["score", "comments"]
              },
              lexical: {
                type: Type.OBJECT,
                properties: { 
                    score: { type: Type.NUMBER }, 
                    comments: { type: Type.STRING } 
                },
                required: ["score", "comments"]
              },
              grammar: {
                type: Type.OBJECT,
                properties: { 
                    score: { type: Type.NUMBER }, 
                    comments: { type: Type.STRING } 
                },
                required: ["score", "comments"]
              },
              pronunciation: {
                type: Type.OBJECT,
                properties: { 
                    score: { type: Type.NUMBER }, 
                    comments: { type: Type.STRING } 
                },
                required: ["score", "comments"]
              },
              generalAdvice: { type: Type.STRING },
              
              // NEW FIELDS
              band9Response: { type: Type.STRING, description: "A perfect Band 9.0 model answer for the topic." },
              coachTip: { type: Type.STRING, description: "A short, actionable improvement tip." },

              weaknessTags: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }
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
            required: ["overallBand", "fluency", "lexical", "grammar", "pronunciation", "generalAdvice", "band9Response", "coachTip", "weaknessTags", "drills", "dailyPlan"]
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

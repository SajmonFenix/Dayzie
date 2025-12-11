import { GoogleGenAI, Type, Schema } from "@google/genai";
import { InspirationData } from "../types";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

const inspirationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    motto: {
      type: Type.STRING,
      description: "Krátke, úderné a zapamätateľné denné motto alebo mantra.",
    },
    thought: {
      type: Type.STRING,
      description: "Hlbšia filozofická myšlienka alebo reflexia. 2-3 vety.",
    },
    motivation: {
      type: Type.STRING,
      description: "Konkrétna, realizovateľná rada alebo povzbudenie. Priama a akčná.",
    },
  },
  required: ["motto", "thought", "motivation"],
};

export const fetchDailyInspiration = async (): Promise<InspirationData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Vygeneruj jedinečnú dennú inšpiráciu v slovenskom jazyku.',
      config: {
        responseMimeType: 'application/json',
        responseSchema: inspirationSchema,
        systemInstruction: "Si múdry, empatický a inšpiratívny životný kouč. Tvojím cieľom je poskytovať svieži, neklíšovitý a zmysluplný obsah, ktorý človeka povzbudí do dňa.",
        temperature: 1.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No content generated");
    }

    return JSON.parse(text) as InspirationData;
  } catch (error) {
    console.error("Error fetching inspiration:", error);
    throw error;
  }
};
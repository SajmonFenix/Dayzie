import { GoogleGenAI, Type, Schema } from "@google/genai";
import { InspirationData } from "../types";

// Získanie kľúča
const getApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }

  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_API_KEY || process.env.REACT_APP_API_KEY || process.env.API_KEY;
  }

  return '';
};

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

// Premenná pre inštanciu, aby sme ju nevytvárali pri každom volaní, ale až keď treba
let aiInstance: GoogleGenAI | null = null;

export const fetchDailyInspiration = async (): Promise<InspirationData> => {
  const apiKey = getApiKey();

  // Ošetrenie chýbajúceho kľúča, aby aplikácia nespadla, ale vrátila chybu
  if (!apiKey) {
    throw new Error("API key is missing. Please check your VITE_API_KEY setting in Netlify.");
  }

  // Inicializácia AI až v momente volania (Lazy loading)
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }

  try {
    const response = await aiInstance.models.generateContent({
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
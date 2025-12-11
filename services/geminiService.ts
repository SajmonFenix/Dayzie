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

// Schéma pre jednu položku (reused inside array)
const singleInspirationSchema = {
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

// Hlavná schéma je teraz POLE (Array)
const batchInspirationSchema: Schema = {
  type: Type.ARRAY,
  items: singleInspirationSchema,
};

// Premenná pre inštanciu
let aiInstance: GoogleGenAI | null = null;

// Vracia pole inšpirácií
export const fetchDailyInspirationBatch = async (): Promise<InspirationData[]> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API key is missing. Please check your VITE_API_KEY setting in Netlify.");
  }

  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }

  try {
    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      // Pýtame si 6 inšpirácií naraz
      contents: 'Vygeneruj sadu 6 rôznych denných inšpirácií v slovenskom jazyku. Musia byť rôznorodé (stoicizmus, moderná psychológia, zen, produktivita).',
      config: {
        responseMimeType: 'application/json',
        responseSchema: batchInspirationSchema,
        systemInstruction: "Si múdry, empatický a inšpiratívny životný kouč. Tvojím cieľom je poskytovať svieži, neklíšovitý a zmysluplný obsah.",
        temperature: 1.2, // Vyššia teplota pre väčšiu variabilitu medzi 6 položkami
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No content generated");
    }

    return JSON.parse(text) as InspirationData[];
  } catch (error) {
    console.error("Error fetching inspiration batch:", error);
    throw error;
  }
};
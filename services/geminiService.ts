import { GoogleGenAI, Type, Schema } from "@google/genai";
import { InspirationData } from "../types";

// Získanie kľúča - musíme skontrolovať viacero možností, pretože Netlify a Vite
// vyžadujú predponu VITE_ pre premenné viditeľné v prehliadači.
const getApiKey = () => {
  // 1. Skúsime moderný prístup cez import.meta (Vite štandard)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }

  // 2. Skúsime process.env (ak to bundler nahradí)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_API_KEY || process.env.REACT_APP_API_KEY || process.env.API_KEY;
  }

  return '';
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("API kľúč sa nenašiel. Uistite sa, že máte v Netlify nastavenú premennú VITE_API_KEY.");
}

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
import { GoogleGenAI } from "@google/genai";
import { CharacterData } from '../types';
import { calculateModifier } from '../utils/dndCalculations';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBackstory = async (character: CharacterData): Promise<string> => {
  const modelId = 'gemini-3-flash-preview';
  
  const abilitiesStr = Object.entries(character.abilities)
    .map(([key, val]) => `${key}:${val} (${calculateModifier(val)})`)
    .join(', ');

  const prompt = `
    Create a compelling, short (approx 150 words) backstory for a D&D 5e character with the following details:
    Name: ${character.name || "Unnamed"}
    Race: ${character.race || "Unknown"}
    Class: ${character.class} (Level ${character.level})
    Background: ${character.background || "Unknown"}
    Alignment: ${character.alignment || "Neutral"}
    Ability Scores: ${abilitiesStr}
    
    The backstory should explain why they became an adventurer and hint at their personality. 
    Keep it suitable for a fantasy setting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Failed to generate backstory.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to the lore archives (API Error). Please try again.";
  }
};

export const suggestName = async (race: string, charClass: string): Promise<string> => {
   const modelId = 'gemini-3-flash-preview';
   const prompt = `Suggest a single, creative fantasy name for a ${race} ${charClass}. Return ONLY the name, nothing else.`;
   
   try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return (response.text || "").trim().replace(/\.|"|'/g, '');
   } catch (error) {
     return "Nameless One";
   }
}

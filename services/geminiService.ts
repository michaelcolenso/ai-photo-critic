
import { GoogleGenAI, Type } from "@google/genai";
import { PhotoAnalysis } from '../types';

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    rating: {
      type: Type.NUMBER,
      description: "A numerical rating from 1 to 10, where 1 is poor and 10 is excellent.",
    },
    composition: {
      type: Type.STRING,
      description: "A detailed critique of the composition. Discuss framing, rule of thirds, leading lines, balance, symmetry, negative space, and perspective. Explain what works well and suggest specific improvements for better visual flow.",
    },
    lighting: {
      type: Type.STRING,
      description: "A deep dive into the lighting. Analyze exposure, contrast, dynamic range, light direction (hard vs soft), color temperature, and shadows. Discuss how the lighting affects the mood and depth of the image.",
    },
    subject: {
      type: Type.STRING,
      description: "Evaluation of the subject matter. Discuss focus sharpness, depth of field, subject isolation, pose (if portrait), timing, and the emotional or narrative impact of the subject.",
    },
    overall_comment: {
      type: Type.STRING,
      description: "A constructive summary. Highlight the strongest aspect of the photo and the single most important thing the photographer should work on next time.",
    },
    suggested_edits: {
      type: Type.ARRAY,
      description: "A list of exactly 3 specific, short, and actionable image editing instructions that an AI editor could perform to improve the photo (e.g., 'Increase contrast in the sky', 'Blur the background slightly', 'Brighten the subject face').",
      items: {
        type: Type.STRING,
      },
    },
  },
  required: ['rating', 'composition', 'lighting', 'subject', 'overall_comment', 'suggested_edits'],
};

export const analyzeImage = async (base64ImageData: string, mimeType: string): Promise<PhotoAnalysis> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType,
    },
  };

  const prompt = `You are a world-class photography mentor and critic. Your goal is to help the photographer improve by providing a detailed, technical, and constructive critique. 
  
  Analyze the image deeply. 
  1. For the detailed sections (Composition, Lighting, Subject), explain *why* elements are effective or ineffective using photographic terminology.
  2. Provide exactly 3 specific, actionable edits in the 'suggested_edits' list. These should be clear instructions that could be passed to a photo editor (human or AI) to instantly make the photo better.
  
  Respond ONLY with a valid JSON object matching the provided schema.`;
  
  const textPart = {
    text: prompt
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const jsonText = response.text!.trim();
    const parsedJson = JSON.parse(jsonText);
    
    // Type validation
    if (
      typeof parsedJson.rating !== 'number' ||
      typeof parsedJson.composition !== 'string' ||
      typeof parsedJson.lighting !== 'string' ||
      typeof parsedJson.subject !== 'string' ||
      typeof parsedJson.overall_comment !== 'string' ||
      !Array.isArray(parsedJson.suggested_edits)
    ) {
      throw new Error("API response does not match the expected PhotoAnalysis structure.");
    }
    
    return parsedJson as PhotoAnalysis;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get analysis from Gemini. Please check the console for more details.");
  }
};

export const generateImprovedImage = async (base64ImageData: string, mimeType: string, analysis: PhotoAnalysis): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const editInstructions = analysis.suggested_edits.map((edit, i) => `${i + 1}. ${edit}`).join('\n');

  const prompt = `Act as a professional photo editor. I have a photo that needs improvement. 
  
  Please apply the following specific edits to the image:
  ${editInstructions}
  
  Also consider the general critique:
  "${analysis.overall_comment}"
  
  Maintain the original subject and context, but apply these specific changes to create a high-quality professional result.`;

  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          imagePart,
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Error generating improved image:", error);
    throw new Error("Failed to generate improved image.");
  }
};

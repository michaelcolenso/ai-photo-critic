
import { GoogleGenAI, Type } from "@google/genai";
import { PhotoAnalysis } from '../types';

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    rating: {
      type: Type.NUMBER,
      description: "A numerical rating from 1 to 10, where 1 is poor and 10 is excellent. Be critical and objective.",
    },
    projected_rating: {
      type: Type.NUMBER,
      description: "A realistic estimation of the new rating (1-10) after applying the suggested edits. Improvements typically result in a 0.5 to 2.0 point increase. Avoid inflating this score.",
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
      description: "A list of exactly 3 suggested edits. Each item must contain a technical instruction for the editor and a reason for the user.",
      items: {
        type: Type.OBJECT,
        properties: {
            edit: {
                type: Type.STRING,
                description: "A precise, directive, and technical instruction for an AI image editor. Use professional terminology (e.g., 'Increase contrast by 15%', 'Warm white balance to 5600K', 'Apply radial gradient to darken corners', 'Sharpen high-frequency details'). Avoid vague language."
            },
            reason: {
                type: Type.STRING,
                description: "A concise explanation (1 sentence) of WHY this edit is necessary and how it improves the image (e.g., 'To separate the subject from the background', 'To fix the underexposure on the face')."
            }
        },
        required: ['edit', 'reason']
      },
    },
  },
  required: ['rating', 'projected_rating', 'composition', 'lighting', 'subject', 'overall_comment', 'suggested_edits'],
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
  2. Provide exactly 3 specific, technical edits in the 'suggested_edits' list. 
     - The 'edit' field must be a command suitable for a professional retoucher (e.g., "Increase exposure by 0.5 stops," "Boost vibrance in midtones").
     - The 'reason' field should explain the aesthetic benefit to the user.
  3. Calculate the 'projected_rating'. Be strictly realistic.
     - Minor edits (e.g., slight contrast, saturation) usually increase the score by 0.5 - 1.0.
     - Major fixes (e.g., saving underexposed subjects, fixing composition crops) can increase it by 1.5 - 2.5.
     - Rarely project a 10/10 unless the starting image is already exceptional (9+).
     - The projected score must be mathematically consistent (Rating + Improvement = Projected).
  
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
      typeof parsedJson.projected_rating !== 'number' ||
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

export const generateImprovedImage = async (
  base64ImageData: string, 
  mimeType: string, 
  analysis: PhotoAnalysis,
  originalWidth: number,
  originalHeight: number
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Helper to determine aspect ratio based on original dimensions or explicit edit requests
  const getBestAspectRatio = (w: number, h: number, edits: {edit: string}[]): string => {
    const combinedEdits = edits.map(e => e.edit.toLowerCase()).join(' ');
    
    // 1. Check for explicit crop instructions
    if (combinedEdits.includes("16:9")) return "16:9";
    if (combinedEdits.includes("9:16")) return "9:16";
    if (combinedEdits.includes("4:3")) return "4:3";
    if (combinedEdits.includes("3:4")) return "3:4";
    if (combinedEdits.includes("1:1") || combinedEdits.includes("square")) return "1:1";
    
    // 2. Fallback to matching the original image aspect ratio
    const ratio = w / h;
    const supported = [
        { s: "1:1", v: 1 },
        { s: "3:4", v: 0.75 },
        { s: "4:3", v: 1.3333 },
        { s: "9:16", v: 0.5625 },
        { s: "16:9", v: 1.7778 }
    ];
    
    // Find the supported aspect ratio that is numerically closest to the original
    return supported.reduce((prev, curr) => 
        Math.abs(curr.v - ratio) < Math.abs(prev.v - ratio) ? curr : prev
    ).s;
  };

  const targetAspectRatio = getBestAspectRatio(originalWidth, originalHeight, analysis.suggested_edits);

  // Extract just the technical instructions
  const editInstructions = analysis.suggested_edits.map((item, i) => `${i + 1}. ${item.edit}`).join('\n');

  const prompt = `Act as an expert high-end photo retoucher. You are given an original photo and a set of specific technical instructions.
  
  Your goal is to significantly elevate the quality of this image to professional standards, aiming to increase its aesthetic rating from ${analysis.rating}/10 to ${analysis.projected_rating}/10.

  STRICTLY APPLY THESE EDITS:
  ${editInstructions}
  
  ADDITIONAL GUIDELINES:
  - Maintain the original subject identity.
  - Follow any crop or composition changes specified in the edits. If none are specified, preserve the original composition structure.
  - Apply professional color grading, contrast balancing, and texture enhancement.
  - Ensure the final result looks photorealistic and polished, not over-processed.
  - Context from critique: "${analysis.overall_comment}"
  
  Return the improved image.`;

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
            aspectRatio: targetAspectRatio,
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

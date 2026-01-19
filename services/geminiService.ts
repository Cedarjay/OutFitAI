
import { GoogleGenAI, Modality, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

// Check if the API key is present and not the placeholder value from index.html
export const isApiKeySet = !!API_KEY && API_KEY !== 'API_KEY';

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface TryOnResult {
  image: string | null;
  text: string | null;
}

interface BodyShapeResult {
  shape: string;
  summary: string;
  tops: string;
  bottoms: string;
  dressesAndJumpsuits: string;
  generalTips: string;
}

export interface StylingSuggestionDetail {
    suggestion: string;
    explanation: string;
}

export interface StylingSuggestions {
    colorPalette: StylingSuggestionDetail;
    occasion: StylingSuggestionDetail;
    accessories: StylingSuggestionDetail;
    overallTip: StylingSuggestionDetail;
}

interface ClothingItem {
    base64: string;
    mimeType: string;
}

interface ClothingItems {
    top?: ClothingItem;
    bottom?: ClothingItem;
    suitJacket?: ClothingItem;
    vest?: ClothingItem;
    outerwear?: ClothingItem;
    footwear?: ClothingItem;
    cap?: ClothingItem;
    watch?: ClothingItem;
    sunglasses?: ClothingItem;
    tie?: ClothingItem;
    scarf?: ClothingItem;
}

export const virtualTryOn = async (
    personImageBase64: string,
    personImageMimeType: string,
    items: ClothingItems,
    outputWidth: number,
    outputHeight: number,
    isSuitButtoned: boolean | null,
    backgroundImageBase64: string | null,
    backgroundImageMimeType: string | null
  ): Promise<TryOnResult> => {
    try {
      const imageParts: any[] = [];
      const promptSegments: string[] = [];
      let imageCounter = 1;

      if (backgroundImageBase64 && backgroundImageMimeType) {
        imageParts.push({
            inlineData: { data: backgroundImageBase64, mimeType: backgroundImageMimeType },
        });
        promptSegments.push(`Image ${imageCounter} is the background scene.`);
        imageCounter++;
      }

      imageParts.push({
        inlineData: {
          data: personImageBase64,
          mimeType: personImageMimeType,
        },
      });
      promptSegments.push(`Image ${imageCounter} contains the person.`);
      const personImageIndex = imageCounter;
      imageCounter++;
  
      const itemMap: { [key in keyof ClothingItems]: string } = {
          top: 'top/shirt',
          bottom: 'bottom/pants/skirt',
          suitJacket: 'suit jacket/blazer',
          vest: 'vest/waistcoat',
          outerwear: 'outerwear/coat/jacket',
          footwear: 'footwear/shoes',
          cap: 'cap/hat',
          watch: 'watch',
          sunglasses: 'sunglasses',
          tie: 'tie/bow tie',
          scarf: 'scarf',
      };
      
      for (const key in items) {
          if (Object.prototype.hasOwnProperty.call(items, key)) {
              const item = items[key as keyof ClothingItems];
              if (item) {
                  imageParts.push({
                      inlineData: {
                          data: item.base64,
                          mimeType: item.mimeType,
                      },
                  });

                  const itemDescription = itemMap[key as keyof ClothingItems];
                  promptSegments.push(`Image ${imageCounter} is a ${itemDescription}.`);
                  imageCounter++;
              }
          }
      }

      // CRITICAL: Strictly maintain the source image composition
      promptSegments.push(
        `STRICT REQUIREMENT: You must maintain the EXACT pose, position, orientation, and zoom level of the person from Image ${personImageIndex}. DO NOT zoom in or out. DO NOT change the person's posture or skeletal alignment. The person must remain at the same coordinate location within the frame.`
      );

      if (backgroundImageBase64) {
        promptSegments.push(
            `Extract the person from Image ${personImageIndex}, drape them realistically with the provided clothing items, and place them onto the background from Image 1. Ensure the final result maintains the person's exact scale and posture relative to the original frame.`
        );
      } else {
        promptSegments.push(
            `Simply drape the provided clothing and accessories realistically onto the person in Image ${personImageIndex}. Keep the person's background, hair, hands, and facial features identical. The output should look like the same photo, but with the new clothes perfectly fitted to the person's body.`
        );
      }
  
      if (isSuitButtoned !== null) {
        if (isSuitButtoned) {
            promptSegments.push('The suit jacket must be shown as buttoned.');
        } else {
            promptSegments.push('The suit jacket must be shown as unbuttoned to reveal the layers beneath.');
        }
      }
      
      promptSegments.push(
        `The output image must have the exact same dimensions: ${outputWidth}x${outputHeight}. Output only the final image data.`
      );
      
      const textPart = { text: promptSegments.join(' ') };
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [...imageParts, textPart],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
  
      if (!response.candidates || response.candidates.length === 0) {
          throw new Error('Empty response from AI.');
      }
  
      const candidate = response.candidates[0];
      let resultImage: string | null = null;
  
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
              resultImage = part.inlineData.data;
            }
          }
      }
  
      if (resultImage) {
          return { image: resultImage, text: null };
      }
  
      throw new Error('Generation failed to return image data.');
  
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

export const removeBackground = async (
    imageBase64: string,
    mimeType: string
): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: imageBase64, mimeType } };
        const textPart = { text: "Remove the background from this image, keeping only the main subject. The background must be transparent. Output only the final image." };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        if (!response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            throw new Error('AI model did not return an image for background removal.');
        }

        return response.candidates[0].content.parts[0].inlineData.data;
    } catch (error) {
        throw new Error(`Failed to remove background: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
};

export const editImage = async (
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<TryOnResult> => {
    try {
      const imagePart = { inlineData: { data: imageBase64, mimeType } };
      const textPart = { text: prompt };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: { responseModalities: [Modality.IMAGE] },
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('The API returned an empty response for the edit request.');
      }
      
      const candidate = response.candidates[0];
      let resultImage: string | null = null;
      let resultText: string | null = null;

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) resultImage = part.inlineData.data;
          else if (part.text) resultText = part.text;
        }
      }
      
      if (!resultImage) {
        throw new Error('The AI model did not return an edited image.');
      }

      return { image: resultImage, text: resultText };
    } catch (error) {
      throw new Error(`Failed to edit image: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
  };

export const detectBodyShape = async (
    imageBase64: string,
    mimeType: string
  ): Promise<BodyShapeResult> => {
    try {
      const imagePart = { inlineData: { data: imageBase64, mimeType } };
      const textPart = { text: 'Analyze the person in the image to determine their body shape. Return a single JSON object with keys: "shape", "summary", "tops", "bottoms", "dressesAndJumpsuits", "generalTips".' };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shape: { type: Type.STRING },
              summary: { type: Type.STRING },
              tops: { type: Type.STRING },
              bottoms: { type: Type.STRING },
              dressesAndJumpsuits: { type: Type.STRING },
              generalTips: { type: Type.STRING },
            },
            required: ["shape", "summary", "tops", "bottoms", "dressesAndJumpsuits", "generalTips"],
          },
        },
      });

      return JSON.parse(response.text.trim());
    } catch (error) {
      throw new Error(`Failed to detect body shape: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
  };

export const enhanceImageQuality = async (
    imageBase64: string,
    mimeType: string
): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: imageBase64, mimeType } };
        const textPart = { text: "Enhance resolution. Sharpness and detail. Output only image." };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        if (!response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            throw new Error('AI model did not return an image for enhancement.');
        }

        return response.candidates[0].content.parts[0].inlineData.data;
    } catch (error) {
        throw new Error(`Failed to enhance image: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
};

export const getStylingSuggestions = async (
    personImage: ClothingItem,
    resultImage: ClothingItem
  ): Promise<StylingSuggestions> => {
    try {
      const personImagePart = { inlineData: { data: personImage.base64, mimeType: personImage.mimeType } };
      const resultImagePart = { inlineData: { data: resultImage.base64, mimeType: resultImage.mimeType } };
      const textPart = { text: "Analyze the outfit in Image 2. Provide styling advice. Return JSON with keys: colorPalette, occasion, accessories, overallTip (each having suggestion and explanation keys)." };
  
      const suggestionDetailSchema = {
        type: Type.OBJECT,
        properties: {
            suggestion: { type: Type.STRING },
            explanation: { type: Type.STRING },
        },
        required: ["suggestion", "explanation"],
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [personImagePart, resultImagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              colorPalette: suggestionDetailSchema,
              occasion: suggestionDetailSchema,
              accessories: suggestionDetailSchema,
              overallTip: suggestionDetailSchema,
            },
            required: ["colorPalette", "occasion", "accessories", "overallTip"],
          },
        },
      });
  
      return JSON.parse(response.text.trim());
    } catch (error) {
      throw new Error(`Failed to get styling suggestions: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
  };

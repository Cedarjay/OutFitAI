
import { GoogleGenAI, Modality, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
  
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      promptSegments.push(`Image ${imageCounter} contains a person.`);
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

      if (backgroundImageBase64) {
        promptSegments.push(
            `Generate a new image showing the person from Image ${personImageIndex} wearing the provided clothing items and accessories, placed realistically onto the background scene from Image 1. The new image should be a realistic depiction, maintaining the person's pose but replacing their original background.`
        );
      } else {
        promptSegments.push(
            `Generate a new image showing the person from the first image wearing the provided clothing items and accessories. The new image should be a realistic depiction, maintaining the person's pose and background as much as possible, but adding the new items appropriately.`
        );
      }
  
      if (isSuitButtoned !== null) {
        if (isSuitButtoned) {
            promptSegments.push('The suit jacket is buttoned up, which may partially obscure the vest underneath.');
        } else {
            promptSegments.push('The suit jacket is unbuttoned to clearly show the vest underneath.');
        }
      }
      
      promptSegments.push(
        `The output image must have the exact same dimensions as the original person image: ${outputWidth} pixels wide and ${outputHeight} pixels high. The output should only be the final image.`
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
          if (response.promptFeedback?.blockReason) {
              throw new Error(`Request was blocked due to safety policies: ${response.promptFeedback.blockReason}. Please use different images.`);
          }
          throw new Error('The API returned an empty response. Please try again.');
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
  
      if (candidate.finishReason === 'SAFETY') {
          const safetyInfo = candidate.safetyRatings?.map(rating => `${rating.category.replace('HARM_CATEGORY_', '')}: ${rating.probability}`).join(', ');
          throw new Error(`Image generation was blocked due to safety policies. [Details: ${safetyInfo || 'Not available'}]`);
      }
  
      if (candidate.finishReason === 'RECITATION') {
          throw new Error('Image generation failed due to the recitation policy. The output may have included copyrighted material.');
      }
  
      throw new Error('The AI model did not return an image. This can happen for various reasons. Please try a different combination of images.');
  
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      if (error instanceof Error) {
          throw new Error(`Failed to generate image: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while communicating with the API.');
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
            if (response.promptFeedback?.blockReason) {
                throw new Error(`Background removal blocked: ${response.promptFeedback.blockReason}.`);
            }
            if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error('Background removal blocked due to safety policies.');
            }
            throw new Error('AI model did not return an image for background removal.');
        }

        return response.candidates[0].content.parts[0].inlineData.data;
    } catch (error) {
        console.error("Error during background removal:", error);
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
        if (candidate.finishReason === 'SAFETY') {
           throw new Error(`Image editing was blocked due to safety policies.`);
        }
        throw new Error('The AI model did not return an edited image.');
      }

      return { image: resultImage, text: resultText };
    } catch (error) {
      console.error("Error calling Gemini API for image editing:", error);
      throw new Error(`Failed to edit image: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
  };

export const detectBodyShape = async (
    imageBase64: string,
    mimeType: string
  ): Promise<BodyShapeResult> => {
    try {
      const imagePart = { inlineData: { data: imageBase64, mimeType } };
      const textPart = { text: 'Analyze the person in the image to determine their body shape (e.g., Rectangle, Triangle, Hourglass, Inverted Triangle, Round). Your response should be positive, empowering, and based on common fashion principles to enhance their natural silhouette. Provide detailed and diverse styling suggestions that are both classic and trendy, offering a few different options for each category. Return a single JSON object with the following keys: "shape", "summary" (a brief, encouraging summary of the styling goal), "tops" (detailed suggestions for flattering tops, including necklines, sleeves, and fits), "bottoms" (detailed suggestions for pants and skirts, mentioning specific cuts and styles), "dressesAndJumpsuits" (suggestions for dresses and jumpsuits that complement the shape), and "generalTips" (a few key principles or accessory tips to always keep in mind to celebrate this body shape).' };

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

      const jsonStr = response.text.trim();
      const result = JSON.parse(jsonStr);

      if (
        typeof result.shape === 'string' &&
        typeof result.summary === 'string' &&
        typeof result.tops === 'string' &&
        typeof result.bottoms === 'string' &&
        typeof result.dressesAndJumpsuits === 'string' &&
        typeof result.generalTips === 'string'
      ) {
        return result;
      } else {
        throw new Error('Invalid JSON schema in API response.');
      }
    } catch (error) {
      console.error("Error detecting body shape:", error);
      throw new Error(`Failed to detect body shape: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
  };

export const enhanceImageQuality = async (
    imageBase64: string,
    mimeType: string
): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: imageBase64, mimeType } };
        const textPart = { text: "Enhance the resolution and quality of this image, making it sharper and more detailed. Do not alter the content, pose, or background. Output only the final, enhanced image." };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        if (!response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            if (response.promptFeedback?.blockReason) {
                throw new Error(`Image enhancement blocked: ${response.promptFeedback.blockReason}.`);
            }
            if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error('Image enhancement blocked due to safety policies.');
            }
            throw new Error('AI model did not return an image for enhancement.');
        }

        return response.candidates[0].content.parts[0].inlineData.data;
    } catch (error) {
        console.error("Error during image enhancement:", error);
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
      const textPart = { text: "Image 1 is the original person. Image 2 is the virtual try-on result showing them in a new outfit. Based on these two images, act as a friendly and encouraging personal stylist. Provide detailed, personalized styling suggestions for the outfit in Image 2. For each category (color palette, occasion, accessories, overall tip), provide a main suggestion and a detailed explanation. The explanation should justify the suggestion (e.g., why the colors work, why the accessories are a good match). Keep the tone positive and insightful. Return a single JSON object where each key ('colorPalette', 'occasion', 'accessories', 'overallTip') maps to an object with two string keys: 'suggestion' and 'explanation'." };
  
      const suggestionDetailSchema = {
        type: Type.OBJECT,
        properties: {
            suggestion: { type: Type.STRING, description: "The main styling suggestion." },
            explanation: { type: Type.STRING, description: "A detailed explanation of why the suggestion works." },
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
  
      const jsonStr = response.text.trim();
      const result = JSON.parse(jsonStr);

      const isSuggestionDetail = (obj: any): obj is StylingSuggestionDetail => {
        return obj && typeof obj.suggestion === 'string' && typeof obj.explanation === 'string';
      };
  
      if (
        isSuggestionDetail(result.colorPalette) &&
        isSuggestionDetail(result.occasion) &&
        isSuggestionDetail(result.accessories) &&
        isSuggestionDetail(result.overallTip)
      ) {
        return result;
      } else {
        throw new Error('Invalid JSON schema in API response for styling suggestions.');
      }
    } catch (error) {
      console.error("Error getting styling suggestions:", error);
      throw new Error(`Failed to get styling suggestions: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    }
  };

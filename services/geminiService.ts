import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
  
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface TryOnResult {
  image: string | null;
  text: string | null;
}

export const virtualTryOn = async (
  personImageBase64: string,
  personImageMimeType: string,
  clothingImageBase64: string,
  clothingImageMimeType: string,
  outputWidth: number,
  outputHeight: number
): Promise<TryOnResult> => {
  try {
    const personImagePart = {
      inlineData: {
        data: personImageBase64,
        mimeType: personImageMimeType,
      },
    };

    const clothingImagePart = {
      inlineData: {
        data: clothingImageBase64,
        mimeType: clothingImageMimeType,
      },
    };

    const textPart = {
      text: `Analyze the first image which contains a person, and the second image which contains an article of clothing. Generate a new image showing the person from the first image wearing the clothing item from the second image. The new image should be a realistic depiction, maintaining the person's pose and background as much as possible, but replacing their original clothing with the new item. The output image must have the exact same dimensions as the original person image: ${outputWidth} pixels wide and ${outputHeight} pixels high. The output should only be the final image.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [personImagePart, clothingImagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // Handle cases where the prompt or response is blocked.
    if (!response.candidates || response.candidates.length === 0) {
        if (response.promptFeedback?.blockReason) {
            throw new Error(`Request was blocked due to safety policies: ${response.promptFeedback.blockReason}. Please use different images.`);
        }
        throw new Error('The API returned an empty response. Please try again.');
    }

    const candidate = response.candidates[0];
    let resultImage: string | null = null;
    let resultText: string | null = null;

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
          if (part.inlineData) {
            resultImage = part.inlineData.data;
          } else if (part.text) {
            resultText = part.text;
          }
        }
    }

    // If an image was successfully generated, return it.
    if (resultImage) {
        return { image: resultImage, text: resultText };
    }

    // If no image was generated, provide a more specific error based on the finish reason.
    if (candidate.finishReason === 'SAFETY') {
        const safetyInfo = candidate.safetyRatings?.map(rating => `${rating.category.replace('HARM_CATEGORY_', '')}: ${rating.probability}`).join(', ');
        throw new Error(`Image generation was blocked due to safety policies. [Details: ${safetyInfo || 'Not available'}]`);
    }

    if (candidate.finishReason === 'RECITATION') {
        throw new Error('Image generation failed due to the recitation policy. The output may have included copyrighted material.');
    }

    // Fallback error for other reasons (e.g., model finishes but produces no image).
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
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: 'Remove the background from this image, leaving only the main person. The background of the new image should be transparent.',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Request was blocked due to safety policies: ${response.promptFeedback.blockReason}.`);
      }
      throw new Error('The API returned an empty response for background removal.');
    }
    
    const candidate = response.candidates[0];
    
    if (candidate.content?.parts?.[0]?.inlineData?.data) {
        return candidate.content.parts[0].inlineData.data;
    }

    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Background removal was blocked due to safety policies.');
    }

    throw new Error('The AI model did not return an image for background removal. Please try a different image.');

  } catch (error) {
    console.error("Error calling Gemini API for background removal:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to remove background: ${error.message}`);
    }
    throw new Error('An unexpected error occurred during background removal.');
  }
};

export const editImage = async (
    imageBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<TryOnResult> => {
    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      };
  
      const textPart = {
        text: prompt,
      };
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [imagePart, textPart],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });
  
      if (!response.candidates || response.candidates.length === 0) {
        if (response.promptFeedback?.blockReason) {
          throw new Error(`Edit request was blocked due to safety policies: ${response.promptFeedback.blockReason}.`);
        }
        throw new Error('The API returned an empty response for the image edit.');
      }
      
      const candidate = response.candidates[0];
      let resultImage: string | null = null;
      let resultText: string | null = null;

      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            resultImage = part.inlineData.data;
          } else if (part.text) {
            // FIX: Corrected typo from `part.t` to `part.text`.
            resultText = part.text;
          }
        }
      }

      if (resultImage) {
        return { image: resultImage, text: resultText };
      }
  
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Image editing was blocked due to safety policies.');
      }
  
      throw new Error('The AI model did not return an edited image. Please try a different prompt.');
  
    } catch (error) {
      console.error("Error calling Gemini API for image editing:", error);
      if (error instanceof Error) {
          throw new Error(`Failed to edit image: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during image editing.');
    }
  };
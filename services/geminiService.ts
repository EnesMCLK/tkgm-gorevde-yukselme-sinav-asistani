
import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ImageInput {
  data: string; // base64 encoded string
  mimeType: string;
}

interface GeminiResponse {
  answer: string;
  newNoteContent: string | null;
}

export const getAnswerFromNotes = async (
  notes: string,
  question: string,
  image?: ImageInput,
  signal?: AbortSignal
): Promise<GeminiResponse> => {
  const model = 'gemini-2.5-pro';

  const finalPrompt = `
${notes}

---
Yukarıdaki talimatlara ve notlara göre, aşağıdaki soruyu cevapla:

# SORU
${question}
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      answer: {
        type: Type.STRING,
        description: "The formatted Markdown answer to the user's question."
      },
      newNoteContent: {
        type: Type.STRING,
        description: "New, verified information to be appended to the notes. Empty string if none."
      }
    }
  };

  try {
    let requestContents: GenerateContentParameters['contents'];

    if (image) {
      const textPart = { text: finalPrompt };
      const imagePart = {
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      };
      requestContents = { parts: [textPart, imagePart] };
    } else {
      requestContents = finalPrompt;
    }

    const generateContentPromise = ai.models.generateContent({
      model: model,
      contents: requestContents,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      },
    });

    let apiResponse: GenerateContentResponse;

    if (signal) {
      if (signal.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      const abortPromise = new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
      });

      apiResponse = await Promise.race([generateContentPromise, abortPromise]);
    } else {
      apiResponse = await generateContentPromise;
    }
    
    // Bazen modelin çıktısı markdown ```json ... ``` bloğu içinde gelebilir.
    // Bu durumu ele alarak JSON'ı güvenli bir şekilde ayrıştırıyoruz.
    const rawText = apiResponse.text.trim();
    const cleanJson = rawText.replace(/^```json\s*|```\s*$/g, '');
    
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Re-throw abort error to be handled by the caller
      throw error;
    }
    // Bileşenin UI durumunu doğru bir şekilde yönetebilmesi için
    // hatayı yakalayıp daha genel bir hata mesajıyla fırlat.
    throw new Error("API call failed. Please check the console for details.");
  }
};

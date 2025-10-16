
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

// Helper to handle API call with abort signal
const callGemini = async (
  params: GenerateContentParameters,
  signal?: AbortSignal
): Promise<GenerateContentResponse> => {
    const generateContentPromise = ai.models.generateContent(params);

    if (signal) {
        if (signal.aborted) {
            throw new DOMException('The operation was aborted.', 'AbortError');
        }
        const abortPromise = new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
            }, { once: true });
        });
        return Promise.race([generateContentPromise, abortPromise]);
    } else {
        return generateContentPromise;
    }
}

// Helper to parse JSON safely from model output
const parseJsonFromResponse = (text: string) => {
    const rawText = text.trim();
    const cleanJson = rawText.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanJson);
};


export const getAnswerFromNotes = async (
  notes: string,
  question: string,
  image?: ImageInput,
  signal?: AbortSignal
): Promise<GeminiResponse> => {
  try {
    const imageInstruction = image ? "\n\nNOT: Kullanıcı soruyla ilgili bir görsel de sağlamıştır. Cevabını oluştururken bu görseldeki metni ve içeriği de dikkate al." : "";
    
    // --- STAGE 1: RESEARCH with gemini-2.5-pro ---
    const researchPrompt = `
# GÖREV: HUKUKİ ARAŞTIRMA VE DOĞRULAMA ASİSTANI

Sen, Tapu ve Kadastro mevzuatı konusunda uzman bir hukuki araştırma asistanısın. Görevin, sana verilen bir soru ve geniş bir bilgi notları bütünü içinden, soruyu cevaplamak için gereken **tüm ilgili ve geçerli** hukuki normları bulup çıkarmak, bu süreçte notlardaki olası güncel olmayan veya hatalı bilgileri tespit etmek ve sonucu JSON formatında sunmaktır.

## SÜREÇ
1.  **Soru Analizi:** Sana verilen soruyu dikkatlice analiz et ve hangi hukuki konularla ilgili olduğunu tespit et.
2.  **Bilgi Tarama:** Sağlanan "NOTLAR" metninin tamamını tara ve soruyla ilgili olabilecek tüm metin parçalarını, kanun maddelerini, yönetmelik ve genelge hükümlerini belirle.
3.  **Hiyerarşik Filtreleme ve Doğrulama (EN ÖNEMLİ ADIM):**
    *   Topladığın bilgileri normlar hiyerarşisine (Kanun > Yönetmelik > Genelge) göre kontrol et.
    *   Eğer bir genelge hükmü, bir kanun hükmü ile çelişiyorsa, **yalnızca kanun hükmünü** al, genelge hükmünü dikkate alma.
    *   Bu kontrol sırasında, "NOTLAR" içindeki bir bilginin güncel mevzuata (varsayımsal olarak bildiğin en güncel duruma göre) aykırı, eksik veya hatalı olduğunu tespit edersen, bu durumu not et.
4.  **Sonuç Derlemesi:**
    *   \`researchSummary\`: Filtrelemeden geçen, sorunun çözümünde kullanılacak tüm geçerli ve ilgili hukuki metinleri, olduğu gibi bir araya getirerek bir "Araştırma Özeti" oluştur.
    *   \`newNoteContent\`: Eğer "NOTLAR" içinde bir hata veya eksiklik tespit ettiysen, doğru ve güncel bilgiyi notların formatına uygun şekilde buraya yaz. Hata yoksa bu alanı boş bırak.

## JSON ÇIKTI FORMATI
{
  "researchSummary": "Soruyu cevaplamak için kullanılacak, filtrelenmiş ve doğrulanmış tüm hukuki metinlerin derlemesi.",
  "newNoteContent": "Eğer notlarda bir hata tespit edildiyse, buraya notların formatına uygun, doğru ve güncel bilgi eklenecek. Hata yoksa bu alan boş bırakılacak."
}

---
# NOTLAR
${notes}

---
# SORU
${question}${imageInstruction}
`;
    
    const researchSchema = {
        type: Type.OBJECT,
        properties: {
          researchSummary: { type: Type.STRING, description: "The summarized and verified legal texts relevant to the question." },
          newNoteContent: { type: Type.STRING, description: "New, verified information to be appended to the notes. Empty string if none." }
        }
    };
    
    let researchRequestContents: GenerateContentParameters['contents'];
    if (image) {
      const textPart = { text: researchPrompt };
      const imagePart = {
        inlineData: { data: image.data, mimeType: image.mimeType },
      };
      researchRequestContents = { parts: [textPart, imagePart] };
    } else {
      researchRequestContents = researchPrompt;
    }

    const researchResponse = await callGemini({
        model: 'gemini-2.5-pro',
        contents: researchRequestContents,
        config: {
            responseMimeType: "application/json",
            responseSchema: researchSchema
        }
    }, signal);

    const researchResult = parseJsonFromResponse(researchResponse.text);
    const { researchSummary, newNoteContent } = researchResult;

    if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
    }

    // --- STAGE 2: SYNTHESIS with gemini-2.5-pro ---
    const synthesisPrompt = `
# ROL VE HEDEF
Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) sınav sorularını cevaplayan uzman bir yapay zeka asistanısın. Görevin, sana sunulan "ARAŞTIRMA ÖZETİ" içindeki önceden doğrulanmış hukuki bilgileri kullanarak, soruyu analiz etmek ve mutlak surette doğru olan şıkkı, gerekçeleriyle birlikte tespit etmektir. **Sadece ve sadece sana verilen araştırma özetini kullanabilirsin.**

## ADIM ADIM DÜŞÜNME VE CEVAP VERME SÜRECİ

Bir soru ile karşılaştığında, aşağıdaki adımları sırasıyla ve eksiksiz olarak uygula:

### Adım 1: Soru ve Araştırma Özetini Anlama
- Sorunun kökünü dikkatlice oku.
- "ARAŞTIRMA ÖZETİ"ndeki her bir hukuki normu anla.

### Adım 2: SENTEZ SÜRECİ (İdeal Cevap Oluşturma)
- Araştırma özetindeki bilgileri birleştirerek soru için "ideal cevabı" kendi içinde oluştur.

### Adım 3: Şıkların Değerlendirilmesi
- Oluşturduğun "ideal cevap" ile soruda verilen her bir şıkkı (A, B, C, D, E) tek tek karşılaştır.
- **Doğru Şıkkı Bul:** Hangi şıkkın ideal cevapla tam olarak örtüştüğünü tespit et.
- **Yanlış Şıkları Ele:** Diğer şıkların neden yanlış olduğunu, özet'teki hangi kurala aykırı olduklarını belirle.

### Adım 4: Nihai Karar ve Gerekçelendirme
- Tespit ettiğin doğru şıkkı, neden doğru olduğunu ve diğer şıkların neden yanlış olduğunu açık ve anlaşılır bir dille ifade eden nihai cevabını JSON formatında oluştur. Cevaplamaya başlarken **büyük harfle başlarayak yazım kurarllarına titizlikle uygula.**

## JSON ÇIKTI FORMATI
{
  "answer": "Markdown formatında, doğru şıkkı ve o şıkkın neden doğru, diğerlerinin neden yanlış olduğunu açıklayan detaylı ve gerekçeli nihai cevap."
}

---
# ARAŞTIRMA ÖZETİ
${researchSummary}

---
# SORU
${question}${imageInstruction}
`;

    const synthesisSchema = {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING, description: "The formatted Markdown answer to the user's question." }
        }
    };
    
    let synthesisRequestContents: GenerateContentParameters['contents'];
     if (image) {
      // Pass the image to the synthesis model as well, as it might contain the question text/options
      const textPart = { text: synthesisPrompt };
      const imagePart = {
        inlineData: { data: image.data, mimeType: image.mimeType },
      };
      synthesisRequestContents = { parts: [textPart, imagePart] };
    } else {
      synthesisRequestContents = synthesisPrompt;
    }

    const synthesisResponse = await callGemini({
        model: 'gemini-2.5-pro',
        contents: synthesisRequestContents,
        config: {
            responseMimeType: "application/json",
            responseSchema: synthesisSchema
        }
    }, signal);

    const synthesisResult = parseJsonFromResponse(synthesisResponse.text);

    return {
      answer: synthesisResult.answer,
      newNoteContent: newNoteContent || null
    };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Re-throw abort error to be handled by the caller
      throw error;
    }
    throw new Error("API call failed. Please check the console for details.");
  }
};

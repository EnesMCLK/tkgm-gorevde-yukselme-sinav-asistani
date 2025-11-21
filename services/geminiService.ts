import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- TYPES (Frontend ile iletişim için) ---
export type ProcessStage = 'ARAŞTIRMA' | 'SENTEZ' | 'MANTIKSAL_DENETİM' | 'TAMAMLANDI';
export type ProgressStatus = 'running' | 'retrying' | 'success' | 'error';

export interface ProgressUpdate {
  stage: ProcessStage;
  status: ProgressStatus;
  message: string;
  attempt?: number;
}

interface ImageInput {
  data: string;
  mimeType: string;
}

export interface GeminiResponse {
  answer: string;
  newNoteContent: string | null;
}

interface GetAnswerOptions {
  image?: ImageInput;
  signal?: AbortSignal;
  userCritique?: string;
}

const callGemini = async (params: GenerateContentParameters, signal?: AbortSignal): Promise<GenerateContentResponse> => {
    // Gemini SDK'sı AbortSignal'ı yerel olarak destekler, bu nedenle özel Promise.race sarmalayıcısına gerek yoktur.
    return ai.models.generateContent(params, { signal });
}

const parseJsonFromResponse = (text?: string) => {
    if (!text) {
        throw new Error("Asistandan bir yanıt alınamadı. Yanıt, güvenlik filtreleri tarafından engellenmiş veya geçersiz olabilir.");
    }
    
    // 1. Regex ile JSON kod bloğunu yakalamaya çalış (Markdown blokları içinde)
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
        try {
            return JSON.parse(jsonBlockMatch[1]);
        } catch (e) {
            // Blok bulundu ama parse edilemedi, diğer yöntemlere geç
        }
    }

    // 2. Blok yoksa veya parse edilemediyse, metnin içindeki ilk '{' ve son '}' arasını al
    // Bu, modelin sohbet metni arasına gömdüğü JSON'ları bulur.
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = text.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(potentialJson);
        } catch (e) {
             console.warn("JSON ayrıştırma hatası (substring):", potentialJson);
        }
    }

    // 3. Hiçbiri çalışmazsa, basit temizlik ile dene (eski yöntem)
    const rawText = text.trim().replace(/^```json\s*|```\s*$/g, '');
    if (!rawText) {
        throw new Error("Asistan boş bir yanıt döndürdü. Lütfen sorunuzu değiştirerek tekrar deneyin.");
    }
    
    try {
        return JSON.parse(rawText);
    } catch (e) {
        console.error("JSON ayrıştırma hatası:", text);
        throw new Error("Asistan, beklenmeyen bir formatta yanıt verdi. Lütfen tekrar deneyin.");
    }
};

export const getAnswerFromNotes = async (
  notes: string, // This is now the "system instruction" or "persona guide"
  question: string,
  onProgressUpdate: (update: ProgressUpdate) => void,
  options: GetAnswerOptions = {}
): Promise<GeminiResponse> => {
  const { image, signal, userCritique } = options;
  // Geri bildirimleri, kaynağını belirtecek şekilde bir önekle etiketle
  let lastCritique: string | null = userCritique ? `KULLANICI GERİ BİLDİRİMİ: ${userCritique}` : null;
  let researchSummary: string | null = null;
  let proposedAnswer: string | null = null;
  let sources: Array<{ uri: string; title?: string }> = [];

  let attempt = 0;
  const MAX_ATTEMPTS = 4; // Sonsuz döngüyü engellemek için limit

  // Döngü: Başarılı bir cevap bulunana veya kullanıcı tarafından iptal edilene kadar denemeye devam eder.
  while (true) {
    attempt++;
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    
    // Çok fazla deneme yapıldıysa döngüyü kır ve elimizdeki en iyi sonucu döndür (veya hata fırlat)
    if (attempt > MAX_ATTEMPTS) {
         if (proposedAnswer) {
             console.warn("Maksimum deneme sayısına ulaşıldı, son üretilen cevap döndürülüyor.");
             return { answer: proposedAnswer, newNoteContent: null };
         } else {
             throw new Error("Maksimum deneme sayısına ulaşıldı ancak geçerli bir yanıt üretilemedi.");
         }
    }

    try {
      // =================================================================================
      // AŞAMA 1: ARAŞTIRMA (WEB ÖNCELİKLİ)
      // =================================================================================
      if (!researchSummary) {
        let progressMessage = 'Soru analiz ediliyor ve güvenilir web kaynakları taranıyor...';
        if (lastCritique) {
            if (lastCritique.startsWith('KULLANICI GERİ BİLDİRİMİ:')) {
                progressMessage = `Kullanıcı geri bildirimi alındı, cevap yeniden oluşturuluyor... (Deneme ${attempt})`;
            } else if (lastCritique.startsWith('MANTIKSAL HATA:')) {
                progressMessage = `Tutarlılık kontrolü yapılıyor... (Deneme ${attempt})`;
            } else if (lastCritique.startsWith('SİSTEM HATASI:')) {
                progressMessage = `Sistem hatası gideriliyor... (Deneme ${attempt})`;
            } else {
                progressMessage = `Geri bildirim işleniyor... (Deneme ${attempt})`;
            }
        }

        onProgressUpdate({
          stage: 'ARAŞTIRMA',
          status: lastCritique ? 'retrying' : 'running',
          message: progressMessage,
          attempt: attempt
        });
        
        // Sadece mantıksal ve kullanıcı geri bildirimlerini modele gönder. Sistem hatalarını gönderme.
        let critiqueForModel = "";
        if (lastCritique) {
            if (lastCritique.startsWith('MANTIKSAL HATA:')) {
                const errorText = lastCritique.substring('MANTIKSAL HATA: '.length);
                critiqueForModel = `\n\n# ÖNEMLİ DÜZELTME (Önceki Hata)\nBir önceki denemede şu hata tespit edildi: "${errorText}".\nLütfen Araştırma Özeti'ni oluştururken bu eksikliği giderecek şekilde daha kapsamlı bir arama yap.`;
            } else if (lastCritique.startsWith('KULLANICI GERİ BİLDİRİMİ:')) {
                const errorText = lastCritique.substring('KULLANICI GERİ BİLDİRİMİ: '.length);
                critiqueForModel = `\n\n# KULLANICI GERİ BİLDİRİMİ\nKullanıcı şu düzeltmeyi talep etti: "${errorText}".\nBunu dikkate alarak yeniden araştırma yap.`;
            }
        }
        
        const imageInstruction = image ? "\n\nNOT: Kullanıcı soruyla ilgili bir görsel de sağlamıştır. Cevabını oluştururken bu görseldeki metni ve içeriği de dikkate al." : "";

        const researchPrompt = `
# GÖREV: UZMAN HUKUK ARAŞTIRMACISI
Sen titiz bir hukuk araştırmacısısın. Görevin, verilen soruyu cevaplamak için gerekli olan **TÜM** hukuki metinleri, tanımları ve istisnaları Google Arama'yı kullanarak bulmaktır.
**HEDEF:** \`*.gov.tr\` uzantılı resmi sitelerden (mevzuat.gov.tr, tkgm.gov.tr vb.) bilgi toplamak.

${critiqueForModel}

## ARAŞTIRMA STRATEJİSİ
1.  Sorunun cevabını doğrudan içeren Kanun maddelerini, Yönetmelik hükümlerini veya Genelge detaylarını bul.
2.  **ÖNEMLİ:** Sadece madde numarasını değil, maddenin **tam içeriğini**, varsa ilgili **tanımları** ve **istisnai durumları** da al. Sentez aşamasında bu detaylara ihtiyaç duyulacak.
3.  Eğer çelişkili bilgiler bulursan, hiyerarşide üstte olanı (Kanun > Yönetmelik) önceliklendir ama her ikisini de özete ekle.

## ÇIKTI FORMATI (JSON)
Çıktın SADECE aşağıdaki JSON formatında olmalıdır:
\`\`\`json
{
  "researchSummary": "Soruyu eksiksiz cevaplamak için gereken; ilgili kanun maddeleri, yönetmelik hükümleri, önemli tanımlar ve yargı kararlarını içeren detaylı ve kapsamlı metin."
}
\`\`\`

---
# SORU
${question}${imageInstruction}
`;
        let researchRequestContents: GenerateContentParameters['contents'] = image ? { parts: [{ text: researchPrompt }, { inlineData: { data: image.data, mimeType: image.mimeType } }] } : researchPrompt;

        const researchResponse = await callGemini({
            model: 'gemini-3-pro-preview',
            contents: researchRequestContents,
            config: {
                tools: [{ googleSearch: {} }],
            },
        }, signal);

        const researchResult = parseJsonFromResponse(researchResponse.text);
        researchSummary = researchResult.researchSummary;
        
        // Kaynakları kaydet (UI'da göstermek için ileride kullanılabilir)
        const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && groundingChunks.length > 0) {
            sources = groundingChunks
                .map(chunk => chunk.web)
                .filter((web): web is { uri: string; title?: string } => !!(web && web.uri));
        }

        if (!researchSummary?.trim() || researchSummary.length < 50) {
             // Eğer özet çok kısaysa veya boşsa hata fırlat
            throw new Error(`NO_INFO_FOUND: İzin verilen resmi kaynaklarda sorunuzu yanıtlayacak yeterli bilgi bulunamadı.`);
        }
        
        // Başarılı bir araştırma yapıldıysa, önceki eleştiriyi temizle (Sentez aşamasına temiz başla)
        // ANCAK, eğer bu bir "MANTIKSAL HATA" tekrarıysa, sentezi zorlamak için null yapma.
        if (lastCritique && !lastCritique.startsWith('MANTIKSAL HATA:')) {
            lastCritique = null;
        }
      }

      // =================================================================================
      // AŞAMA 2: SENTEZ
      // =================================================================================
      if (!proposedAnswer) {
        onProgressUpdate({ 
            stage: 'SENTEZ', 
            status: lastCritique ? 'retrying' : 'running', 
            message: lastCritique && lastCritique.startsWith('MANTIKSAL HATA:')
              ? `Önceki cevap yetersiz bulundu, daha detaylı sentezleniyor... (Deneme ${attempt})`
              : 'Hukuki kaynaklar analiz edilerek cevap oluşturuluyor...', 
            attempt: attempt 
        });
        
        let synthesisCritiqueForModel = "";
        if (lastCritique?.startsWith('MANTIKSAL HATA:')) {
            const errorText = lastCritique.substring('MANTIKSAL HATA: '.length);
            synthesisCritiqueForModel = `\n\n# DİKKAT: ÖNCEKİ DENEME HATASI\nÖnceki cevabın reddedildi çünkü: "${errorText}"\nLütfen bu hatayı tekrar etme. Cevabını SADECE ve SADECE "ARAŞTIRMA ÖZETİ"ndeki bilgilere dayandır. Kaynakta olmayan bir bilgiyi uydurma.`;
        }
        
        const imageInstruction = image ? "\n\nNOT: Kullanıcı soruyla ilgili bir görsel de sağlamıştır." : "";
        
        const synthesisPrompt = `
# ROL: BAŞDENETÇİ VE SINAV UZMANI
Görevin, sağlanan "ARAŞTIRMA ÖZETİ"ni kullanarak soruya kesin, doğru ve gerekçeli bir cevap vermektir.

${synthesisCritiqueForModel}

# KURALLAR
1.  **Sadakat:** Cevabındaki her iddia, mutlaka "ARAŞTIRMA ÖZETİ"nde yer alan bir bilgiye dayanmalıdır.
2.  **Format:**
    *   İlgili mevzuat maddesini **tırnak içinde ve italik** olarak alıntıla.
    *   Alıntının altına, sorunun cevabını net bir şekilde yaz.
    *   Neden bu cevabın doğru olduğunu, diğer şıkların (varsa) neden yanlış olduğunu açıkla.
3.  **Üslup:** Resmi, öğretici ve net bir dil kullan.

## ÇIKTI FORMATI (JSON)
\`\`\`json
{
  "answer": "Markdown formatında nihai cevap metni."
}
\`\`\`

---
# ARAŞTIRMA ÖZETİ (TEK GERÇEK KAYNAK)
${researchSummary}
---
# SORU
${question}${imageInstruction}
`;
        const synthesisSchema = { type: Type.OBJECT, properties: { answer: { type: Type.STRING } } };
        let synthesisRequestContents: GenerateContentParameters['contents'] = image ? { parts: [{ text: synthesisPrompt }, { inlineData: { data: image.data, mimeType: image.mimeType } }] } : synthesisPrompt;

        const synthesisResponse = await callGemini({ 
            model: 'gemini-3-pro-preview', 
            contents: synthesisRequestContents, 
            config: { 
                responseMimeType: "application/json", 
                responseSchema: synthesisSchema,
                // Sentezde biraz yaratıcılık (0.4) iyidir, akıcılığı artırır.
                temperature: 0.4 
            } 
        }, signal);
        
        const synthesisResult = parseJsonFromResponse(synthesisResponse.text);
        proposedAnswer = synthesisResult.answer;
      }
      
      // =================================================================================
      // AŞAMA 3: MANTIKSAL DENETİM (GÜNCELLENMİŞ VE ESNETİLMİŞ)
      // =================================================================================
      onProgressUpdate({ stage: 'MANTIKSAL_DENETİM', status: 'running', message: 'Cevabın kaynaklarla mantıksal tutarlılığı denetleniyor...', attempt: attempt });
      
      const logicalCritiquePrompt = `
# GÖREV: KALİTE KONTROL EDİTÖRÜ
Aşağıdaki "ÜRETİLEN CEVAP"ın, "KAYNAK ÖZETİ" ile uyumlu olup olmadığını kontrol et.

## DENETİM KURALLARI (ESNEK OL)
1.  **Amaç:** Cevabın **doğru** olup olmadığını ve **kaynakla çelişip çelişmediğini** kontrol etmektir.
2.  **Esneklik:** Cevap, kaynaktaki bilgiyi farklı kelimelerle ifade edebilir veya kaynaktan bariz çıkarımlar yapabilir. Bu bir hata DEĞİLDİR.
3.  **Hata Tanımı:** 
    *   HATA: Kaynakta "süre 10 gündür" derken cevapta "süre 15 gündür" denmesi (AÇIK ÇELİŞKİ).
    *   HATA: Kaynakta hiç bahsedilmeyen tamamen uydurma bir konudan bahsedilmesi (HALÜSİNASYON).
    *   GEÇERLİ: Kaynakta "memur" denirken cevapta "devlet memuru" denmesi (EŞ ANLAM).
    *   GEÇERLİ: Kaynak metnini özetleyerek anlatması.

Eğer cevap genel hatlarıyla doğruysa ve bariz bir yalan/yanlış içermiyorsa \`isValid: true\` yap.

# ORİJINAL SORU
${question}
---
# KAYNAK ÖZETİ
${researchSummary}
---
# ÜRETİLEN CEVAP
${proposedAnswer}
`;
      const logicalCritiqueSchema = { type: Type.OBJECT, properties: { isValid: { type: Type.BOOLEAN }, critique: { type: Type.STRING } } };

      // Temperature 0.0: Denetim deterministik olmalı.
      const logicalCritiqueResponse = await callGemini({ 
          model: 'gemini-3-pro-preview', 
          contents: logicalCritiquePrompt, 
          config: { 
              responseMimeType: "application/json", 
              responseSchema: logicalCritiqueSchema,
              temperature: 0.0
          } 
      }, signal);
      
      const logicalCritiqueResult = parseJsonFromResponse(logicalCritiqueResponse.text);

      if (!logicalCritiqueResult.isValid) {
        // Hatanın kaynağını "MANTIKSAL HATA" olarak etiketle
        lastCritique = `MANTIKSAL HATA: ${logicalCritiqueResult.critique || "Cevap kaynaklarla çelişiyor."}`;
        console.warn(`AŞAMA 3 DENETİMİ BAŞARISIZ (Deneme ${attempt}): ${lastCritique}`);
        
        // Eğer hata varsa, SADECE cevabı (synthesis) sıfırla. 
        // Araştırma (researchSummary) muhtemelen doğrudur, sadece model yanlış yorumlamıştır.
        // Ancak 2. denemede de hata alırsak, belki araştırma eksiktir diye araştırmayı da sıfırlayabiliriz.
        proposedAnswer = null;
        
        if (attempt % 2 === 0) {
            // Çift sayılı denemelerde araştırmayı da sıfırla (belki kaynak eksikti)
            researchSummary = null;
        }
        
        continue;
      }

      // =================================================================================
      // BAŞARILI SONUÇ
      // =================================================================================
      onProgressUpdate({ stage: 'TAMAMLANDI', status: 'success', message: 'Tüm kontrollerden başarıyla geçti.' });
      
      return { answer: proposedAnswer!, newNoteContent: null };

    } catch (error) {
       console.error(`Hata tespit edildi (Deneme ${attempt}):`, error);
       
       if (error instanceof Error) {
         if (error.name === 'AbortError') throw error;
         if (error.message.toLowerCase().includes('api key')) {
            throw new Error("API anahtarı geçersiz veya yapılandırılmamış.");
         }
         // NO_INFO_FOUND hatası kritik bir hatadır, yeniden denemeye gerek yok.
         if (error.message.startsWith('NO_INFO_FOUND:')) throw error;

         lastCritique = `SİSTEM HATASI: ${error.message}`;
       } else {
         lastCritique = `SİSTEM HATASI: ${String(error)}`;
       }
       
       // Hata durumunda her şeyi sıfırla ve tekrar dene
       researchSummary = null;
       proposedAnswer = null;
    }
  }
};

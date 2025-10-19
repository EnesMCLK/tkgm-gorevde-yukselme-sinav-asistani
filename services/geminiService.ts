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

const MAX_RETRIES = 4;

const callGemini = async (params: GenerateContentParameters, signal?: AbortSignal): Promise<GenerateContentResponse> => {
    const generateContentPromise = ai.models.generateContent(params);
    if (signal) {
        if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
        const abortPromise = new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), { once: true });
        });
        return Promise.race([generateContentPromise, abortPromise]);
    }
    return generateContentPromise;
}

const parseJsonFromResponse = (text?: string) => {
    if (!text) {
        throw new Error("Asistandan bir yanıt alınamadı. Yanıt, güvenlik filtreleri tarafından engellenmiş veya geçersiz olabilir.");
    }
    const rawText = text.trim().replace(/^```json\s*|```\s*$/g, '');
    if (!rawText) {
        throw new Error("Asistan boş bir yanıt döndürdü. Lütfen sorunuzu değiştirerek tekrar deneyin.");
    }
    try {
        return JSON.parse(rawText);
    } catch (e) {
        console.error("JSON ayrıştırma hatası:", rawText);
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
  let lastCritique: string | null = userCritique || null; 
  let researchSummary: string | null = null;
  let proposedAnswer: string | null = null;
  let sources: Array<{ uri: string; title?: string }> = [];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

    try {
      // =================================================================================
      // AŞAMA 1: ARAŞTIRMA (WEB ÖNCELİKLİ)
      // =================================================================================
      if (!researchSummary) {
        onProgressUpdate({
          stage: 'ARAŞTIRMA',
          status: lastCritique ? 'retrying' : 'running',
          message: lastCritique 
            ? userCritique && attempt === 0
                ? `Kullanıcı geri bildirimi alındı, cevap düzeltiliyor...`
                : `Hata tespit edildi, kaynaklar yeniden araştırılıyor... (Deneme ${attempt + 1})`
            : 'Soru analiz ediliyor ve güvenilir web kaynakları taranıyor...',
          attempt: attempt + 1
        });

        const critiqueFeedback = lastCritique ? `\n\n# ÖNEMLİ DÜZELTME\nBir önceki denemede (Deneme ${attempt}) bir tutarsızlık bulundu.\nTESPİT EDİLEN HATA: ${lastCritique}\nLütfen Araştırma Özeti'ni (researchSummary) oluştururken BU HATAYI GÖZ ÖNÜNDE BULUNDURARAK web'de tekrar ve daha dikkatli bir araştırma yap. Özellikle bu hataya sebep olan istisna veya detayları bu sefer özete dahil ettiğinden emin ol.` : "";
        const imageInstruction = image ? "\n\nNOT: Kullanıcı soruyla ilgili bir görsel de sağlamıştır. Cevabını oluştururken bu görseldeki metni ve içeriği de dikkate al." : "";

        const researchPrompt = `
# GÖREV: UZMAN HUKUK ARAŞTIRMACISI (WEB ARAMA)
(Deneme ${attempt + 1}/${MAX_RETRIES})
Sen, analitik ve titiz bir yapay zeka asistanının birinci aşamasısın. Görevin, sana verilen soruyu Google Arama'yı kullanarak, güvenilir Türk mevzuat kaynaklarından (özellikle mevzuat.gov.tr, tkgm.gov.tr gibi .gov.tr uzantılı resmi siteler) araştırmaktır.
"SİSTEM NOTLARI" sadece senin çalışma prensiplerini belirler, bilgi kaynağı DEĞİLDİR. Bilgiyi SADECE web'den bulacaksın.
${critiqueFeedback}
## SÜREÇ
1.  **Soru Analizi:** Sana verilen soruyu ve varsa görseli dikkatlice analiz et.
2.  **Web Araştırması:** Google Arama'yı kullanarak soruyu cevaplamak için gereken en güncel ve doğru hukuki normları bul. Bilgiyi normlar hiyerarşisine (Anayasa > Kanun > Yönetmelik vb.) göre doğrula.
3.  **Sonuç Derlemesi:**
    * \`researchSummary\`: Araştırmandan elde ettiğin, sorunun çözümünde kullanılacak tüm geçerli ve ilgili hukuki metinleri bir "Araştırma Özeti" olarak oluştur. Bu özet, sonraki adımlar için TEK BİLGİ KAYNAĞI olacaktır.
## ÇOK ÖNEMLİ KURAL: Çıktın, başka hiçbir metin olmadan, doğrudan geçerli bir JSON nesnesi olmalıdır.
\`\`\`json
{
  "researchSummary": "Soruyu cevaplamak için kullanılacak, filtrelenmiş ve doğrulanmış tüm hukuki metinlerin derlemesi. Bu metin, web'den bulunan gerçek kanun maddeleri, yönetmelikler vb. içermelidir."
}
\`\`\`
---
# SİSTEM NOTLARI (Çalışma Prensiplerin)
${notes}
---
# SORU
${question}${imageInstruction}
`;
        let researchRequestContents: GenerateContentParameters['contents'] = image ? { parts: [{ text: researchPrompt }, { inlineData: { data: image.data, mimeType: image.mimeType } }] } : researchPrompt;

        const researchResponse = await callGemini({
            model: 'gemini-2.5-pro',
            contents: researchRequestContents,
            config: {
                tools: [{ googleSearch: {} }],
                // responseMimeType ve responseSchema, 'tools' ile birlikte kullanılamadığı için kaldırıldı.
                // Prompt, modelin text response içinde bir JSON dizesi döndürmesini sağlamak için tasarlandı.
            },
        }, signal);

        const researchResult = parseJsonFromResponse(researchResponse.text);
        researchSummary = researchResult.researchSummary;
        
        const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && groundingChunks.length > 0) {
            sources = groundingChunks
                .map(chunk => chunk.web)
                .filter((web): web is { uri: string; title?: string } => !!(web && web.uri));
        }

        if (!researchSummary?.trim()) {
            throw new Error(`Web araştırması sonucunda bu soruyu cevaplayacak ilgili bir bilgi bulunamadı.`);
        }
        lastCritique = null;
      }

      // =================================================================================
      // AŞAMA 2: SENTEZ
      // =================================================================================
      if (!proposedAnswer) {
        onProgressUpdate({ 
            stage: 'SENTEZ', 
            status: lastCritique ? 'retrying' : 'running', 
            message: lastCritique
              ? `Mantıksal hata tespit edildi, cevap yeniden oluşturuluyor... (Deneme ${attempt + 1})`
              : 'Doğrulanan bilgilerle bir cevap taslağı oluşturuluyor...', 
            attempt: attempt + 1 
        });
        
        const synthesisCritiqueFeedback = lastCritique ? `\n\n# ÖNEMLİ DÜZELTME\nBir önceki denemede (Deneme ${attempt}), oluşturulan cevap mantıksal denetimden geçemedi.\nTESPİT EDİLEN HATA: ${lastCritique}\nLütfen cevabı oluştururken BU HATAYI GÖZ ÖNÜNDE BULUNDURARAK "ARAŞTIRMA ÖZETİ"ni tekrar yorumla.` : "";
        const imageInstruction = image ? "\n\nNOT: Kullanıcı soruyla ilgili bir görsel de sağlamıştır. Cevabını oluştururken bu görseldeki metni ve içeriği de dikkate al." : "";
        
        const synthesisPrompt = `
# ROL VE HEDEF
Sen, bir yapay zeka asistanının ikinci aşamasısın. Görevin, sana sunulan sınav sorusunu ve "ARAŞTIRMA ÖZETİ"ni kullanarak doğru şıkkı gerekçeleriyle tespit etmektir.
${synthesisCritiqueFeedback}
# KESİN KURAL
Cevabını oluştururken **yalnızca** 'ARAŞTIRMA ÖZETİ' metnini kullanacaksın. Bu özet, web'den bulunan tek doğru kaynaktır.
## SÜREÇ
1.  **İdeal Cevap Oluşturma:** Özete dayanarak zihninde gerekçeli bir cevap oluştur.
2.  **Şıkları Değerlendir:** İdeal cevabınla sorudaki şıkları karşılaştır. Doğru şıkkı bul ve diğerlerinin neden yanlış olduğunu belirle.
3.  **Nihai Karar ve Gerekçelendirme:**
    * Cevabına dayanak olan metinleri bir Markdown alıntı bloku (\`> \`) içine al ve metni italik yap.
    * Alıntı içinde sorunun çözümündeki kilit ifadeleri kalın (\`**kelime**\`) yap.
    * Alıntının ardından, doğru şıkkı belirt ve metnin bu şıkkı nasıl kanıtladığını, diğerlerinin neden yanlış olduğunu açıkla.
## JSON ÇIKTI FORMATI
{
  "answer": "Markdown formatında, önce ilgili mevzuatın tam metnini ve vurguları içeren bir alıntıyla başlayan, ardından doğru şıkkı ve detaylı gerekçesini açıklayan nihai cevap."
}
---
# ARAŞTIRMA ÖZETİ
${researchSummary}
---
# SORU
${question}${imageInstruction}
`;
        const synthesisSchema = { type: Type.OBJECT, properties: { answer: { type: Type.STRING } } };
        let synthesisRequestContents: GenerateContentParameters['contents'] = image ? { parts: [{ text: synthesisPrompt }, { inlineData: { data: image.data, mimeType: image.mimeType } }] } : synthesisPrompt;

        const synthesisResponse = await callGemini({ model: 'gemini-2.5-pro', contents: synthesisRequestContents, config: { responseMimeType: "application/json", responseSchema: synthesisSchema } }, signal);
        const synthesisResult = parseJsonFromResponse(synthesisResponse.text);
        proposedAnswer = synthesisResult.answer;
        lastCritique = null;
      }
      
      // =================================================================================
      // AŞAMA 3: MANTIKSAL DENETİM
      // =================================================================================
      onProgressUpdate({ stage: 'MANTIKSAL_DENETİM', status: 'running', message: 'Cevabın kaynaklarla mantıksal tutarlılığı denetleniyor...', attempt: attempt + 1 });
      
      const logicalCritiquePrompt = `
# ROL: HUKUK UZMANI DENETÇİ (MANTIKSAL TUTARLILIK)
Sen şüpheci bir denetçisin. Görevin, bir yapay zeka cevabını, sorunun kendisi ve kullandığı *KAYNAK ÖZETİ* ile karşılaştırarak mantıksal denetimden geçirmektir. KAYNAK ÖZETİ tek doğru kaynaktır.
## KONTROL SÜRECİ
1.  **Soru-Cevap Uyumu:** Cevap, sorunun sorduğu şeyi **doğrudan** yanıtlıyor mu? (örn: "değildir" diye sorarken "hangisidir" diye mi cevaplıyor?)
2.  **Kaynak-Cevap Tutarlılığı:** Cevaptaki her iddia, **sadece** "KAYNAK ÖZETİ" ile destekleniyor mu? Varsayım var mı? Cevapta, özette olmayan bir bilgi var mı?
## KARAR
* **BAŞARILIYSA:** \`"isValid": true\`
* **BAŞARISIZSA:** \`"isValid": false\` ve \`critique\` alanında hatayı açıkla.
## JSON ÇIKTI FORMATI
{ "isValid": boolean, "critique": "Hatanın açıklaması." }
---
# ORİJINAL SORU
${question}
---
# KAYNAK ÖZETİ (WEB'DEN BULUNAN TEK DOĞRU KAYNAK)
${researchSummary}
---
# ÜRETİLEN CEVAP
${proposedAnswer}
`;
      const logicalCritiqueSchema = { type: Type.OBJECT, properties: { isValid: { type: Type.BOOLEAN }, critique: { type: Type.STRING } } };

      const logicalCritiqueResponse = await callGemini({ model: 'gemini-2.5-pro', contents: logicalCritiquePrompt, config: { responseMimeType: "application/json", responseSchema: logicalCritiqueSchema } }, signal);
      const logicalCritiqueResult = parseJsonFromResponse(logicalCritiqueResponse.text);

      if (!logicalCritiqueResult.isValid) {
        lastCritique = logicalCritiqueResult.critique || "Cevap, soruyla veya kullanılan kaynak özetiyle mantıksal olarak tutarsız.";
        console.warn(`AŞAMA 3 DENETİMİ BAŞARISIZ (Deneme ${attempt + 1}/${MAX_RETRIES}): ${lastCritique}. Kaynak özeti tutarsızlığı nedeniyle yeniden araştırma yapılacak...`);
        researchSummary = null; // Araştırma özetini geçersiz kıl
        proposedAnswer = null; // Cevap taslağını geçersiz kıl
        continue;
      }

      // =================================================================================
      // BAŞARILI SONUÇ
      // =================================================================================
      onProgressUpdate({ stage: 'TAMAMLANDI', status: 'success', message: 'Tüm kontrollerden başarıyla geçti.' });
      
      let citations = '';
      if (sources && sources.length > 0) {
          const sourceLinks = sources
              .map(web => `[${web.title || web.uri}](${web.uri})`);
          
          const uniqueSources = [...new Set(sourceLinks)];

          if (uniqueSources.length > 0) {
              citations = `\n\n---\n\n### Kaynaklar\n- ${uniqueSources.join('\n- ')}`;
          }
      }
      
      const finalAnswer = proposedAnswer! + citations;
      return { answer: finalAnswer, newNoteContent: null };

    } catch (error) {
       console.error(`Düzeltilemeyen Hata (Deneme ${attempt + 1}/${MAX_RETRIES}):`, error);
       if (error instanceof Error) {
         if (error.name === 'AbortError') throw error;
         if (error.message.includes("Asistan mantıksal bir tutarsızlık tespit etti") || error.message.toLowerCase().includes('api key') || error.message.includes("bu soruyu cevaplayacak ilgili bir bilgi bulunamadı")) {
           throw error;
         }
         throw new Error(`API çağrısında düzeltilemeyen bir hata oluştu (Deneme ${attempt + 1}): ${error.message}`);
       }
       throw new Error(`Bilinmeyen bir hata oluştu (Deneme ${attempt + 1}): ${String(error)}`);
    }
  }

  throw new Error(`Asistan, ${MAX_RETRIES} deneme sonunda bile tutarlı bir cevap üretemedi.\n\n**Son tespit edilen sorun:** ${lastCritique || "Bilinmeyen bir tutarsızlık tespit edildi."}`);
};
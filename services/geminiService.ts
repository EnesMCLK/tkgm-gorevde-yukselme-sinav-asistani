import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- TYPES (Frontend ile iletişim için) ---
export type ProcessStage = 'ARAŞTIRMA' | 'SENTEZ' | 'MANTIKSAL_DENETİM' | 'KAYNAK_BÜTÜNLÜĞÜ' | 'TAMAMLANDI';
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

const MAX_RETRIES = 3;

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

const parseJsonFromResponse = (text: string) => {
    const rawText = text.trim().replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(rawText);
};

export const getAnswerFromNotes = async (
  notes: string,
  question: string,
  onProgressUpdate: (update: ProgressUpdate) => void,
  image?: ImageInput,
  signal?: AbortSignal
): Promise<GeminiResponse> => {
  let lastCritique: string | null = null; 

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

    try {
      // =================================================================================
      // AŞAMA 1: ARAŞTIRMA
      // =================================================================================
      onProgressUpdate({
        stage: 'ARAŞTIRMA',
        status: lastCritique ? 'retrying' : 'running',
        message: lastCritique 
          ? `Hata tespit edildi, kaynaklar yeniden analiz ediliyor... (Deneme ${attempt + 1})`
          : 'Soru analiz ediliyor ve ilgili kaynaklar taranıyor...',
        attempt: attempt + 1
      });

      const critiqueFeedback = lastCritique ? `\n\n# ÖNEMLİ DÜZELTME\nBir önceki denemede (Deneme ${attempt}), üretilen cevap "ORİJİNAL NOTLARIN TAMAMI" ile denetlendiğinde bir çelişki bulundu.\nTESPİT EDİLEN HATA: ${lastCritique}\nLütfen Araştırma Özeti'ni (researchSummary) oluştururken BU HATAYI GÖZ ÖNÜNDE BULUNDURARAK notları tekrar ve daha dikkatli analiz et. Özellikle bu hataya sebep olan istisna veya detayları bu sefer özete dahil ettiğinden emin ol.` : "";
      const imageInstruction = image ? "\n\nNOT: Kullanıcı soruyla ilgili bir görsel de sağlamıştır. Cevabını oluştururken bu görseldeki metni ve içeriği de dikkate al." : "";
      
      const researchPrompt = `
# GÖREV: UZMAN HUKUKİ ARAŞTIRMACI VE DOĞRULAYICI
(Deneme ${attempt + 1}/${MAX_RETRIES})
Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve Unvan Değişikliği Sınavı ve ilgili Türk mevzuatı (Anayasa, Kanunlar, Yönetmelikler vb.) konularında uzman, analitik ve titiz bir yapay zeka asistanının birinci aşamasısın. Görevin, sana verilen bir soruyu ve "NOTLAR" olarak tanımlanan geniş bilgi kaynağını kullanarak, soruyu cevaplamak için gereken **tüm ilgili ve geçerli** hukuki normları bulup çıkarmak ve olası hataları tespit ederek sonucu JSON formatında sunmaktır.
${critiqueFeedback}
## TEMEL FELSEFE: KONTROL (Üstten Alta)
Çalışma prensibin, bilginin doğruluğunu ve geçerliğini en üst hukuk normundan en alta doğru sorgulamaktır.
## SÜREÇ
1.  **Soru Analizi:** Sana verilen soruyu ve varsa görseli dikkatlice analiz et. Sorunun anahtar kelimelerini, konusunu (örn: "Devlet memurlarının yıllık izin hakkı", "kadastro tespiti") ve sorguladığı spesifik hukuki durumu tespit et.
2.  **Bilgi Toplama:** Sağlanan "NOTLAR" metninin tamamını tara ve soruyla ilgili olabilecek tüm metin parçalarını, kanun maddelerini, yönetmelik ve genelge hükümlerini belirle.
3.  **KONTROL SÜRECİ (Üstten Alta Doğrulama - EN ÖNEMLİ ADIM):**
    * Topladığın tüm bilgileri, normlar hiyerarşisine göre **yukarıdan aşağıya** doğru bir süzgeçten geçir.
    * **Hiyerarşi Piramidi:** 1. Anayasa, 2. Kanun, 3. Yönetmelik, 4. Genelge/Tebliğ.
    * **Çelişki Kuralı:** Bir çelişki tespit edersen, **her zaman hiyerarşik olarak üstün olan normu** doğru kabul et.
    * **Hata Tespiti:** "NOTLAR" içindeki bir bilginin güncel mevzuata aykırı olduğunu tespit edersen, bu hatalı bilgiyi **kesinlikle kullanma**.
4.  **Sonuç Derlemesi:**
    * \`researchSummary\`: Kontrol sürecinden geçen, sorunun çözümünde kullanılacak tüm geçerli ve ilgili hukuki metinleri bir "Araştırma Özeti" olarak oluştur.
    * \`newNoteContent\`: Eğer "NOTLAR" içinde bir hata tespit ettiysen, doğru ve güncel bilgiyi buraya yaz. Hata yoksa boş bırak.
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

      const researchSchema = { type: Type.OBJECT, properties: { researchSummary: { type: Type.STRING }, newNoteContent: { type: Type.STRING } } };
      let researchRequestContents: GenerateContentParameters['contents'] = image ? { parts: [{ text: researchPrompt }, { inlineData: { data: image.data, mimeType: image.mimeType } }] } : researchPrompt;

      const researchResponse = await callGemini({ model: 'gemini-2.5-pro', contents: researchRequestContents, config: { responseMimeType: "application/json", responseSchema: researchSchema } }, signal);
      const researchResult = parseJsonFromResponse(researchResponse.text);
      const { researchSummary, newNoteContent } = researchResult;

      if (!researchSummary?.trim()) {
        throw new Error("Üzgünüm, sağlanan notlarda bu soruyu cevaplayacak ilgili bir bilgi bulunamadı.");
      }

      // =================================================================================
      // AŞAMA 2: SENTEZ
      // =================================================================================
      onProgressUpdate({ stage: 'SENTEZ', status: 'running', message: 'Doğrulanan bilgilerle bir cevap taslağı oluşturuluyor...', attempt: attempt + 1 });
      
      const synthesisPrompt = `
# ROL VE HEDEF
Sen, bir yapay zeka asistanının ikinci aşamasısın. Görevin, sana sunulan sınav sorusunu ve "ARAŞTIRMA ÖZETİ"ni kullanarak doğru şıkkı gerekçeleriyle tespit etmektir.
# KESİN KURAL
Cevabını oluştururken **yalnızca** 'ARAŞTIRMA ÖZETİ' metnini kullanacaksın.
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
      const proposedAnswer = synthesisResult.answer;

      // =================================================================================
      // AŞAMA 3: MANTIKSAL DENETİM
      // =================================================================================
      onProgressUpdate({ stage: 'MANTIKSAL_DENETİM', status: 'running', message: 'Cevabın soruyla mantıksal tutarlılığı denetleniyor...', attempt: attempt + 1 });
      
      const logicalCritiquePrompt = `
# ROL: HUKUK UZMANI DENETÇİ (MANTIKSAL TUTARLILIK)
Sen şüpheci bir denetçisin. Görevin, bir yapay zeka cevabını, sorunun kendisi ve kullandığı *KAYNAK ÖZETİ* ile karşılaştırarak mantıksal denetimden geçirmektir.
## KONTROL SÜRECİ
1.  **Soru-Cevap Uyumu:** Cevap, sorunun sorduğu şeyi **doğrudan** yanıtlıyor mu? (örn: "değildir" diye sorarken "hangisidir" diye mi cevaplıyor?)
2.  **Kaynak-Cevap Tutarlılığı:** Cevaptaki her iddia, **sadece** "KAYNAK ÖZETİ" ile destekleniyor mu? Varsayım var mı?
## KARAR
* **BAŞARILIYSA:** \`"isValid": true\`
* **BAŞARISIZSA:** \`"isValid": false\` ve \`critique\` alanında hatayı açıkla.
## JSON ÇIKTI FORMATI
{ "isValid": boolean, "critique": "Hatanın açıklaması." }
---
# ORİJİNAL SORU
${question}
---
# KAYNAK ÖZETİ
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
        console.warn(`AŞAMA 3 DENETİMİ BAŞARISIZ (Deneme ${attempt + 1}/${MAX_RETRIES}): ${lastCritique}. Yeniden deneniyor...`);
        continue;
      }

      // =================================================================================
      // AŞAMA 4: KAYNAK BÜTÜNLÜĞÜ DENETİMİ
      // =================================================================================
       onProgressUpdate({ stage: 'KAYNAK_BÜTÜNLÜĞÜ', status: 'running', message: 'Cevabın notların bütünüyle çelişip çelişmediği kontrol ediliyor...', attempt: attempt + 1 });
       
       const sourceCritiquePrompt = `
# ROL: KIDEMLİ BAŞDENETÇİ (KAYNAK BÜTÜNLÜĞÜ)
Önceki denetçi, cevabın "KAYNAK ÖZETİ"ne uyduğunu doğruladı. Senin görevin ise cevabın, **"ORİJİNAL NOTLARIN TAMAMI"** ile çelişip çelişmediğini veya bu notlardaki kritik bir istisnayı/detayı atlayıp atlamadığını bulmak.
Amaç: Aşama 1'deki Araştırmacının, özeti hazırlarken kritik bir bilgiyi dışarıda bırakıp bırakmadığını tespit etmek.
## KONTROL SÜRECİ
1.  **Çelişki Kontrolü:** Cevaptaki iddialar, notların tamamındaki başka bir madde ile çelişiyor mu?
2.  **Eksik Bilgi Kontrolü:** Notların tamamında, soruyu etkileyen ama cevapta bahsedilmeyen kritik bir **istisna, koşul, süre** veya **detay** var mı?
## KARAR
* **HATA YOKSA:** \`"isSound": true\`
* **HATA VARSA:** \`"isSound": false\` ve \`critique\` alanında hatayı açıkla.
## JSON ÇIKTI FORMATI
{ "isSound": boolean, "critique": "Hatanın açıklaması." }
---
# ORİJİNAL SORU
${question}
---
# ORİJİNAL NOTLARIN TAMAMI
${notes}
---
# ÖNERİLEN NİHAİ CEVAP
${proposedAnswer}
`;
      const sourceCritiqueSchema = { type: Type.OBJECT, properties: { isSound: { type: Type.BOOLEAN }, critique: { type: Type.STRING } } };

      const sourceCritiqueResponse = await callGemini({ model: 'gemini-2.5-pro', contents: sourceCritiquePrompt, config: { responseMimeType: "application/json", responseSchema: sourceCritiqueSchema } }, signal);
      const sourceCritiqueResult = parseJsonFromResponse(sourceCritiqueResponse.text);

      if (sourceCritiqueResult.isSound) {
        onProgressUpdate({ stage: 'TAMAMLANDI', status: 'success', message: 'Tüm kontrollerden başarıyla geçti.' });
        return { answer: proposedAnswer, newNoteContent: newNoteContent || null };
      } else {
        lastCritique = sourceCritiqueResult.critique || `Model tarafından spesifik bir çelişki raporlanmadı, ancak ${attempt + 1}. denemede bir tutarsızlık tespit edildi.`;
        console.warn(`AŞAMA 4 DENETİMİ BAŞARISIZ (Deneme ${attempt + 1}/${MAX_RETRIES}): ${lastCritique}. Yeniden deneniyor...`);
        continue;
      }
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
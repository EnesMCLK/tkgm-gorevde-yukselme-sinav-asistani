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
    
    // =================================================================================
    // AŞAMA 1: ARAŞTIRMA (Mevcut haliyle kalıyor)
    // Görev: Soruya ilişkin tüm ilgili ve geçerli belgeleri toplamak.
    // =================================================================================
    const researchPrompt = `
# GÖREV: UZMAN HUKUKİ ARAŞTIRMACI VE DOĞRULAYICI

Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve Unvan Değişikliği Sınavı ve ilgili Türk mevzuatı (Anayasa, Kanunlar, Yönetmelikler vb.) konularında uzman, analitik ve titiz bir yapay zeka asistanının birinci aşamasısın. Görevin, sana verilen bir soruyu ve "NOTLAR" olarak tanımlanan geniş bilgi kaynağını kullanarak, soruyu cevaplamak için gereken **tüm ilgili ve geçerli** hukuki normları bulup çıkarmak ve olası hataları tespit ederek sonucu JSON formatında sunmaktır.

## TEMEL FELSEFE: KONTROL (Üstten Alta)
Çalışma prensibin, bilginin doğruluğunu ve geçerliğini en üst hukuk normundan en alta doğru sorgulamaktır.

## SÜREÇ
1.  **Soru Analizi:** Sana verilen soruyu ve varsa görseli dikkatlice analiz et. Sorunun anahtar kelimelerini, konusunu (örn: "Devlet memurlarının yıllık izin hakkı", "kadastro tespiti") ve sorguladığı spesifik hukuki durumu tespit et.
2.  **Bilgi Toplama:** Sağlanan "NOTLAR" metninin tamamını tara ve soruyla ilgili olabilecek tüm metin parçalarını, kanun maddelerini, yönetmelik ve genelge hükümlerini belirle.
3.  **KONTROL SÜRECİ (Üstten Alta Doğrulama - EN ÖNEMLİ ADIM):**
    * Topladığın tüm bilgileri, aşağıdaki normlar hiyerarşisine göre **yukarıdan aşağıya** doğru bir süzgeçten geçir:
    * **Hiyerarşi Piramidi:**
      1.  **Anayasa Kontrolü:** Bu bilgi Anayasa'ya uygun mu?
      2.  **Kanun Kontrolü:** İlgili Kanun'un (657 Sayılı DMK, 3402 Sayılı Kadastro Kanunu vb.) amir hükümlerine uygun mu?
      3.  **Yönetmelik Kontrolü:** İlgili Yönetmeliğin maddeleriyle çelişiyor mu?
      4.  **Genelge/Tebliğ Kontrolü:** En güncel Genelge veya Tebliğ'in detaylarını doğru yansıtıyor mu?
    * **Çelişki Kuralı:** Herhangi bir seviyede bir çelişki tespit edersen, **her zaman hiyerarşik olarak üstün olan normu** (örn: Kanun, Yönetmeliğe üstündür) doğru kabul et ve çelişen alt normu ele.
    * **Hata Tespiti:** Bu kontrol sırasında, "NOTLAR" içindeki bir bilginin güncel mevzuata (varsayımsal olarak bildiğin en güncel duruma göre) aykırı, eksik veya hatalı olduğunu tespit edersen, bu durumu not et. Bu hatalı bilgiyi **kesinlikle kullanma**.
4.  **Sonuç Derlemesi:**
    * \`researchSummary\`: Kontrol sürecinden başarıyla geçen, sorunun çözümünde kullanılacak tüm geçerli ve ilgili hukuki metinleri, olduğu gibi bir araya getirerek bir "Araştırma Özeti" oluştur.
    * \`newNoteContent\`: Eğer 3. Adım'da "NOTLAR" içinde bir hata veya eksiklik tespit ettiysen, resmi kaynaklardan bulduğun doğru ve güncel bilgiyi, gelecekte kullanılmak üzere notların formatına uygun şekilde buraya yaz. Hata yoksa bu alanı boş bırak.

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
          newNoteContent: { type: Type.STRING, description: "New, verified information to be appended to the notes. Empty string if none." },
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

    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

    // =================================================================================
    // AŞAMA 2: SENTEZ (Mevcut haliyle kalıyor)
    // Görev: Toplanan belgelere dayanarak bir cevap taslağı oluşturmak.
    // =================================================================================
    const synthesisPrompt = `
# ROL VE HEDEF
Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve Unvan Değişikliği Sınavı ve ilgili Türk mevzuatı konularında uzman, analitik ve titiz bir yapay zeka asistanının ikinci ve son aşamasısın. Birincil görevin, sana sunulan sınav sorusunu ve "ARAŞTIRMA ÖZETİ" olarak tanımlanan bilgi kaynağını kullanarak, bir hukuk uzmanı titizliğiyle analiz etmek ve mutlak surette doğru olan şıkkı, gerekçeleriyle birlikte tespit etmektir.

# KESİN KURAL
Cevabını oluştururken **yalnızca ve yalnızca** aşağıda sunulan 'ARAŞTIRMA ÖZETİ' metnini kullanacaksın. Bu özetin dışından **hiçbir şekilde** bilgi kullanamaz, varsayımda bulunamaz veya metni eksik okuyamazsın.

## TEMEL FELSEFE: SENTEZ (Alttan Üste)
Geçerli olan en spesifik bilgiden yola çıkarak, cevabını bir argüman gibi inşa edeceksin.

## ADIM ADIM CEVAP VERME SÜRECİ
Aşağıdaki adımları sırasıyla ve eksiksiz olarak uygula:

### Adım 1: Sentez İçin Hazırlık (İdeal Cevap Oluşturma)
- "ARAŞTIRMA ÖZETİ"ndeki bilgilerden yola çıkarak zihninde "ideal, gerekçeli bir cevap" oluştur.
- **1. Temeli At (En Spesifik Norm):** Cevabın temelini, soruyu doğrudan yanıtlayan geçerli Genelge veya Yönetmelik maddesine dayandır.
- **2. Argümanı Güçlendir (Üst Normlar):** Bu spesifik kuralın, hangi Yönetmelik ve Kanun maddesinden yetki aldığını veya bu üst normların genel çerçevesine nasıl uyduğunu açıkla.

### Adım 2: Şıkların Değerlendirilmesi ve Karşılaştırılması
- 1. Adım'da oluşturduğun "ideal, gerekçeli cevap" ile soruda (veya görselde) verilen her bir şıkkı tek tek karşılaştır.
- **Doğru Şıkkı Bul:** Hangi şıkkın senin sentezlediğin ideal cevapla birebir örtüştüğünü tespit et.
- **Yanlış Şıkları Ele:** Diğer şıkların neden yanlış olduğunu, Araştırma Özeti'ndeki hangi kurala aykırı olduklarını veya hangi eksik/hatalı bilgiyi içerdiğini belirle.

### Adım 3: Nihai Karar ve Gerekçelendirme (Cevabı Biçimlendirme)
- **Kanıt Sunumu:** Kararına dayanak olan kanun, yönetmelik veya genelge metinlerini, cevabının başına **tamamen ve eksiksiz olarak** bir Markdown alıntı bloku (\`> \` ile başlayan) içine al ve metnin tamamını italik yap.
- **Vurgulama:** Alıntıladığın metinler içinde, sorunun çözümü için kilit öneme sahip olan kelimeleri veya ifadeleri Markdown'da kalın olarak (\`**anahtar kelime**\` şeklinde) işaretle.
- **Gerekçelendirme:** Alıntının hemen ardından, tespit ettiğin doğru şıkkı belirt. Sonrasında, **alıntıladığın metnin bu şıkkı nasıl kanıtladığını** ve diğer şıkların metne göre neden yanlış olduğunu açık ve anlaşılır bir dille ifade eden nihai cevabını oluştur.
- **Dil Bilgisi:** Cevaplamaya başlarken büyük harfle başlamalı ve yazım kurallarına titizlikle uymalısın.

## JSON ÇIKTI FORMATI
{
  "answer": "Markdown formatında, önce ilgili mevzuatın tam metnini ve içinde kalın olarak işaretlenmiş anahtar kelimeleri içeren bir alıntıyla başlayan, ardından doğru şıkkı ve o şıkkın neden doğru, diğerlerinin neden yanlış olduğunu açıklayan detaylı ve gerekçeli nihai cevap."
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
    const proposedAnswer = synthesisResult.answer;

    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');

    // =================================================================================
    // YENİ AŞAMA 3: DENETLEME VE KARAR
    // Görev: Üretilen cevabın soruyu doğru anlayıp anlamadığını ve mantıksal
    // tutarlılığını kontrol etmek.
    // =================================================================================
    const critiquePrompt = `
# ROL: HUKUK UZMANI DENETÇİ

Sen, son derece şüpheci ve detay odaklı bir hukuk uzmanı denetçisin. Görevin, bir yapay zeka asistanının ürettiği cevabı, sorunun kendisi ve asistanın kullandığı kaynak metinlerle karşılaştırarak mantıksal bir denetimden geçirmektir. Amacın, en ufak bir mantık hatasını veya soruyu yanlış anlama belirtisini tespit etmektir.

## KONTROL SÜRECİ
Sana üç adet girdi verilecek: "ORİJİNAL SORU", "KAYNAK METİN" ve "ÜRETİLEN CEVAP". Aşağıdaki kontrolleri sırasıyla ve titizlikle yap:

1.  **Soru-Cevap Uyumu:** Üretilen cevap, orijinal sorunun sorduğu şeyi **doğrudan** yanıtlıyor mu?
    * Soru "hangisi **değildir**?" diye sorarken, cevap "hangisidir?" üzerine mi kurulu?
    * Soru "en **az** kaç gün?" diye sorarken, cevap "en **fazla** kaç gün?" bilgisine mi dayanıyor?
    * Soru bir istisnayı sorarken, cevap genel kuralı mı açıklıyor?
    * Sorudaki kritik bir anahtar kelime (örn: "aday memur", "kesinleşmiş", "tescilden sonra") cevapta göz ardı edilmiş mi?

2.  **Kaynak-Cevap Tutarlılığı:** Üretilen cevaptaki her bir iddia, yorum ve sonuç, **sadece ve sadece** "KAYNAK METİN" ile destekleniyor mu?
    * Cevap, kaynak metinde olmayan bir varsayımda bulunuyor mu?
    * Cevaptaki alıntı doğru ve eksiksiz mi?
    * Doğru şık olarak belirtilen seçeneğin doğruluğu ve yanlış şıkların yanlışlığı, kaynak metinden **tartışmasız bir şekilde** çıkarılabiliyor mu?

## KARAR
Kontrollerin sonucunda bir karar ver.

* **Eğer HER İKİ kontrol de BAŞARILIYSA:** Cevap mantıksal olarak tutarlı ve soruyu doğru anlamıştır.
* **Eğer kontrollerden BİRİ BİLE BAŞARISIZSA:** Cevap hatalıdır.

## JSON ÇIKTI FORMATI
{
  "isValid": true,
  "critique": "Cevap, soruyu doğru anlamış ve kaynak metne tamamen sadık kalarak mantıksal bir sonuç üretmiştir."
}

// VEYA

{
  "isValid": false,
  "critique": "Hatanın açıklaması. Örnek: 'Cevap hatalıdır çünkü soru 'hangisi değildir' diye sorarken, cevap 'hangisidir' mantığıyla kurulmuştur ve A şıkkının neden kurala uyduğunu açıklamıştır. Sorunun kökünü yanlış anlamıştır.'"
}
---
# ORİJİNAL SORU
${question}

---
# KAYNAK METİN (Cevabın dayanması gereken tek gerçek)
${researchSummary}

---
# ÜRETİLEN CEVAP (Denetlenecek olan)
${proposedAnswer}
`;

    const critiqueSchema = {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          critique: { type: Type.STRING }
        }
    };
    
    const critiqueResponse = await callGemini({
      model: 'gemini-2.5-pro',
      contents: critiquePrompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: critiqueSchema
      }
    }, signal);

    const critiqueResult = parseJsonFromResponse(critiqueResponse.text);

    if (critiqueResult.isValid) {
      // Denetimden geçti, cevap güvenilir.
      return {
        answer: proposedAnswer,
        newNoteContent: newNoteContent || null
      };
    } else {
      // Denetimden geçemedi, hata fırlat.
      // Bu hata, UI tarafında `errorMessage` olarak yakalanacak.
      console.error("DENETİM HATASI:", critiqueResult.critique);
      throw new Error(`Asistan mantıksal bir tutarsızlık tespit etti ve güvenilir bir cevap üretemedi.
      \n\n**Tespit edilen sorun:** ${critiqueResult.critique}`);
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes('api key not found') || error.message.toLowerCase().includes('api_key_invalid')) {
            throw new Error('API anahtarı yapılandırılmamış veya geçersiz. Lütfen sistem yöneticisi ile iletişime geçin.');
        }
        // Eğer bizim fırlattığımız bir hataysa (örn: denetim hatası), onu doğrudan göster.
        if(error.message.includes("Asistan mantıksal bir tutarsızlık tespit etti")) {
            throw error;
        }
        console.error("Underlying API error:", error.message);
        throw new Error('API çağrısı başarısız oldu. Sunucuda bir hata oluştu, lütfen daha sonra tekrar deneyin.');
    }
    throw new Error("Bilenmeyen bir API hatası oluştu.");
  }
};
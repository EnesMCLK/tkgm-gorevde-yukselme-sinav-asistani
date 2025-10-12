
import { GoogleGenAI, GenerateContentParameters, Type } from "@google/genai";

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
  image?: ImageInput
): Promise<GeminiResponse> => {
  const model = 'gemini-2.5-flash';
  const textPrompt = `
    Sen Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve Unvan Değişikliği Sınavı ve ilgili Türk mevzuatı konularında uzman, analitik ve titiz bir yapay zeka asistanısın.
    Birincil görevin, aşağıda "NOTLAR" bölümünde verilen metinlere ve varsa sağlanan görsele dayanarak soruları yanıtlamaktır. Ancak, mutlak bir kural daha var: doğruluk ve sürekli öğrenme.

    ## CEVAP VERME SÜRECİN (Adım Adım Düşün) ##

    1.  **SORUYU DERİNLEMESİNE ANALİZ ET**:
        -   Sorunun türünü belirle: Bu bir olay örgüsü mü, koşul sorusu mu, sıralama mı, yoksa bilgi sorusu mu?
        -   Sorunun neyi sorguladığını, anahtar kavramlarını ve beklenen cevap formatını tam olarak anla.

    2.  **İLGİLİ BİLGİLERİ NOTLARDAN TOPLA**:
        -   NOTLAR bölümünün tamamını sorunun anahtar kavramlarıyla ilgili bilgi için tara.

    3.  **BİLGİLERİ DOĞRULA, GÜNCELLE VE EKSİKLERİ GİDER (ÇOK ÖNEMLİ)**:
        -   Notlardan topladığın bilgiyi kendi dahili bilgi tabanınla ve Türkiye'nin resmi, güvenilir mevzuat kaynaklarıyla (Anayasa, Kanunlar, Cumhurbaşkanlığı Kararnameleri vb.) karşılaştır.
        -   **EĞER NOTLARDA BİR HATA, EKSİKLİK VEYA GÜNCEL OLMAYAN BİLGİ TESPİT EDERSEN:**
            a.  Kesinlikle hatalı bilgiyi KULLANMA.
            b.  Doğru ve güncel bilgiyi, Türkiye Cumhuriyeti'nin Anayasal normlar hiyerarşisine uygun olarak güvenilir kaynaklardan tespit et. Bu, T.C. Mevzuat Bilgi Sistemi (mevzuat.gov.tr), TKGM Mevzuat Portalı (mevzuat.tkgm.gov.tr), Tapu ve Kadastro Genel Müdürlüğü (tkgm.gov.tr), Çevre, Şehircilik ve İklim Değişikliği Bakanlığı gibi kurumların resmi web sitelerini ve ilgili kanun metinlerini içerir. **Karşılaştığın her resmi kaynağı detaylıca incele, sorunun cevabı için gerekli olan temel bilgileri ve ilkeleri özetleyerek çıkar ve bu bilgileri not setine eklenmek üzere hazırla.**
            c.  Cevabını bu doğru bilgiye dayandır.
            d.  Cevabının "answer" kısmında, notlardaki hatayı AÇIKÇA belirt, neden hatalı olduğunu açıkla ve kullandığın doğru bilginin kaynağını net bir şekilde referans göster. (Örn: "Notlarda belirtilen DOP oranı %40 olarak geçmektedir, ancak 3194 Sayılı İmar Kanunu'nun 18. maddesine göre bu oran en fazla %45 olabilir. Kaynak: mevzuat.gov.tr").
            e.  **Bulduğun bu yeni ve doğru bilgiyi, gelecekte kullanılmak üzere "newNoteContent" alanına, notların formatına uygun şekilde (yeni bir başlık veya alt başlık altında) ekle.**

    4.  **CEVABI SENTEZLE VE OLUŞTUR**:
        -   Topladığın ve doğruladığın bilgileri birleştirerek, soruyu tam olarak yanıtlayan, tutarlı ve kapsamlı bir cevap oluştur.
        -   Cevabının her bir önemli bölümünü, bilgiyi aldığın NOTLAR içindeki kaynağa veya (düzeltme yaptıysan) resmi kaynağa atıfta bulunarak destekle.

    5.  **CEVABI BİÇİMLENDİR VE YAPISAL OLARAK DÖNDÜR**:
        -   Cevabını daha okunaklı ve estetik hale getirmek için **Markdown** formatını kullan (Başlıklar, kalın/italik metin, listeler vb.).
        -   Sonucu aşağıda belirtilen JSON formatında döndür.

    ## KESİN KURALLAR ##
    -   Birincil kaynağın "NOTLAR" bölümüdür, ancak doğruluk her şeyden önemlidir. Hata varsa düzelt, açıkla ve notların güncellenmesi için yeni bilgiyi sağla.
    -   Eğer sorunun cevabı ne notlarda ne de genel bilgin dahilinde mevcut değilse, "answer" alanına "Bu sorunun cevabı sağlanan notlarda veya güvenilir kaynaklarda mevcut değil." yaz ve "newNoteContent" alanını boş bırak.
    -   Cevapların net, analitik ve doğrudan sorulan soruya odaklı olmalı.

    ---
    NOTLAR:
    ${notes}
    ---
    SORU:
    ${question}
    ---
    
    ## CEVAP FORMATI (JSON) ##
    Lütfen cevabını AŞAĞIDAKİ JSON ŞEMASINA tam olarak uyacak şekilde döndür:
    {
      "answer": "Buraya, Markdown formatında biçimlendirilmiş, kullanıcıya gösterilecek tam cevabı yaz.",
      "newNoteContent": "Eğer notlarda eksik olan veya resmi kaynaklardan doğrulayarak zenginleştirdiğin yeni bir bilgi bulduysan, bu bilgiyi notlara eklenecek şekilde, başlık ve maddeler halinde buraya yaz. Örneğin: '### 4.4. Kentsel Dönüşüm\\n- 6306 Sayılı Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun, riskli yapıların tespiti ve yenilenmesi süreçlerini düzenler.'. Eğer eklenecek yeni bilgi yoksa, bu alanı boş bir string '' olarak bırak."
    }
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
      const textPart = { text: textPrompt };
      const imagePart = {
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      };
      requestContents = { parts: [textPart, imagePart] };
    } else {
      requestContents = textPrompt;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: requestContents,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });
    
    const jsonResponse = response.text.trim();
    // Bazen modelin çıktısı markdown ```json ... ``` bloğu içinde gelebilir.
    const cleanJson = jsonResponse.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
    return {
      answer: `Modelden cevap alınırken bir hata oluştu: ${errorMessage}`,
      newNoteContent: null
    };
  }
};

export const categorizeUpdate = async (
  question: string,
  categories: string[]
): Promise<string> => {
  const model = 'gemini-2.5-flash';
  const prompt = `
    Kullanıcının sorduğu sorunun, aşağıdaki KATEGORİ LİSTESİ'ndeki başlıklardan hangisine ait olduğunu belirle.
    Cevap olarak SADECE ve SADECE listedeki en uygun kategori başlığının tam metnini döndür, başka hiçbir açıklama ekleme.

    ## SORU ##
    ${question}

    ## KATEGORİ LİSTESİ ##
    ${categories.join('\n')}

    ## EN UYGUN KATEGORİ BAŞLIĞI ##
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    const category = response.text.trim();
    // Modelin döndürdüğü kategorinin, sağlananlardan biri olduğunu doğrula
    if (categories.includes(category)) {
      return category;
    }
    // Eğer model listede olmayan bir kategori uydurursa, varsayılan olarak ilk kategoriyi döndür.
    console.warn(`Model beklenmedik bir kategori döndürdü: "${category}". Varsayılan kategoriye dönülüyor.`);
    return categories[0];

  } catch (error) {
    console.error("Güncelleme kategorize edilirken hata oluştu:", error);
    // API hatası durumunda varsayılan olarak ilk kategoriyi döndür.
    return categories[0];
  }
};

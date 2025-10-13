
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
    Birincil görevin, aşağıda "NOTLAR" bölümünde verilen metinlere ve varsa sağlanan görsele dayanarak, her zaman en güncel ve hiyerarşik olarak en üstün hukuki normu esas alarak soruları yanıtlamaktır.

    ## CEVAP VERME SÜRECİN (Adım Adım Düşün) ##

    1.  **ÖNCELİKLİ KAYNAĞI TESPİT ET (EN ÖNEMLİ ADIM)**:
        -   **EĞER SORUDA BELİRLİ BİR KANUN, TÜZÜK, YÖNETMELİK VEYA GENELGE ADI GEÇİYORSA (Örn: "3402 Sayılı Kadastro Kanunu'na göre...", "2024/1 Sayılı Genelge uyarınca..."):**
            -   **MUTLAK ÖNCELİĞİN** o hukuk metninin kendisidir. Cevabını **doğrudan** bu metni analiz ederek, bir uzman gibi yorumlayarak ve düşünerek oluşturmalısın. "NOTLAR" bölümünü bu spesifik metin hakkındaki bilgileri bulmak için bir kılavuz olarak kullan, ancak asıl dayanağın metnin kendisi ve güncel hali olmalıdır. Bu durumda, doğrudan 3. adıma geç.
        -   **EĞER SORUDA SPESİFİK BİR METİN BELİRTİLMİYORSA:**
            -   2. adımdan başlayarak süreci takip et.

    2.  **İLGİLİ BİLGİLERİ NOTLARDAN TOPLA**:
        -   Sorunun cevabı olabilecek ilgili tüm bilgileri "NOTLAR" bölümünden topla. Bu notlar genellikle Yönetmelik, Genelge gibi spesifik ve alt düzey düzenlemeleri içerir.

    3.  **BİLGİLERİ DOĞRULA VE GÜNCELLE (EVRENSEL KURAL)**:
        -   İster belirli bir metne dayansın, ister notlardan yola çıksın, kullandığın bilginin doğruluğunu ve güncelliğini **mutlaka** teyit etmelisin.
        -   **ZORUNLU GÜNCELLİK KONTROLÜ**: HER SORU İÇİN, bilginin güncelliğini T.C. Mevzuat Bilgi Sistemi (mevzuat.gov.tr) ve TKGM Mevzuat Portalı (mevzuat.tkgm.gov.tr) gibi resmi kaynaklardan yeniden kontrol et. Notlardaki bir bilginin yürürlükten kalkmış veya değişmiş olabileceğini varsayarak bu kontrolü yapmalısın.
        -   **HİYERARŞİK KONTROL**: Doğrulamayı her zaman piramidin **en üstünden aşağıya** doğru yap:
            1.  Anayasa
            2.  Kanunlar
            3.  Cumhurbaşkanlığı Kararnameleri
            4.  Yönetmelikler
            5.  Adsız Düzenleyici İşlemler (Genelge, Tebliğ, Talimat vb.)
        -   **ÇELİŞKİ KURALI:** Farklı kaynaklar arasında (veya iki şık arasında) bir çelişki varsa, cevabını **her zaman en güncel ve hiyerarşik olarak en üstün olan hukuk metnine** dayandırmalısın. Alt düzeydeki bir norm (örn: notlardaki bir Genelge), üst düzeydeki bir norma (örn: bir Kanun) **asla** aykırı olamaz.

    4.  **EKSİK VEYA HATALI BİLGİYİ DÜZELTME PROSEDÜRÜ**:
        -   **EĞER NOTLARDA BİR HATA, EKSİKLİK VEYA GÜNCEL OLMAYAN BİLGİ TESPİT EDERSEN (Yaptığın güncellik ve hiyerarşi kontrolü sonucunda):**
            a.  Kesinlikle hatalı veya güncel olmayan bilgiyi KULLANMA.
            b.  Doğru ve güncel bilgiyi, hiyerarşideki en üst ve geçerli resmi kaynaktan tespit et.
            c.  Cevabını bu doğru ve hiyerarşik olarak üstün bilgiye dayandır.
            d.  Cevabının "answer" kısmında, notlardaki hatayı AÇIKÇA belirt. Hangi üst norma aykırı olduğunu veya neden güncel olmadığını açıkla (örn: "Notlardaki Genelge'de belirtilen husus, ... tarihinde Resmi Gazete'de yayımlanan ... Sayılı Kanun'un X maddesi ile değiştirilmiştir. Güncel uygulama şu şekildedir:"). Kullandığın doğru bilginin kaynağını net bir şekilde referans göster.
            e.  Bulduğun bu yeni ve doğru bilgiyi, gelecekte kullanılmak üzere "newNoteContent" alanına, notların formatına uygun, anlaşılır bir şekilde ekle.

    5.  **CEVABI SENTEZLE VE OLUŞTUR**:
        -   Topladığın ve doğruladığın bilgileri birleştirerek, soruyu tam olarak yanıtlayan, tutarlı ve kapsamlı bir cevap oluştur.
        -   **TEK DOĞRU CEVAP İLKESİ**: Sorunun genellikle tek bir doğru cevabı vardır. Cevabını, yaptığın kontroller sonucunda en doğru ve en güncel olan tek bir sonuca odakla. Eğer birden fazla yorum mümkün gibi görünüyorsa, bu farklılıkları kısaca belirt, ancak ardından neden seçtiğin cevabın en doğru olduğunu (örneğin, "Bu yorum, ilgili Kanun'un lafzına daha uygun olduğu için esastır.") gerekçelendirerek nihai ve net bir cevap ver.
        -   Cevabının her bir önemli bölümünü, bilgiyi aldığın kaynağa (notlar veya güncel mevzuat) atıfta bulunarak destekle.

    6.  **CEVABI BİÇİMLENDİR VE YAPISAL OLARAK DÖNDÜR**:
        -   Cevabını daha okunaklı hale getirmek için **Markdown** formatını kullan (Başlıklar, kalın/italik metin, listeler vb.).
        -   Sonucu aşağıda belirtilen JSON formatında döndür.

    ## KESİN KURALLAR ##
    -   Birincil referansın "NOTLAR" veya soruda belirtilen spesifik hukuk metni olsa da, mutlak öncelik **doğruluk, güncellik ve normlar hiyerarşisine** aittir. Hata varsa düzelt, açıkla ve notların güncellenmesi için yeni bilgiyi sağla.
    -   Eğer sorunun cevabı ne notlarda ne de yaptığın güncel mevzuat araştırmasında mevcut değilse, "answer" alanına "Bu sorunun cevabı sağlanan notlarda veya güvenilir resmi kaynaklarda mevcut değil." yaz ve "newNoteContent" alanını boş bırak.
    -   Cevapların net, analitik ve doğrudan sorulan soruya odaklı olmalı.
    -   Cevaplarındaki tüm cümlelerin ilk harfi mutlaka büyük harf olmalıdır. Dil bilgisi kurallarına titizlikle uy.

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


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
    ## PDF OKUMA VE ANALİZ UZMANLIĞI ##
		
		Sen, aynı zamanda PDF belgelerini analiz eden, yapısal bütünlüğünü anlayan ve içeriğini hatasız bir şekilde metne dönüştüren gelişmiş bir belge işleme yapay zekasısın. Bir PDF belgesiyle karşılaştığında, aşağıdaki adımları titizlikle uygularsın:
		
		### PDF İŞLEME SÜRECİN (Adım Adım Düşün)
		
		**1. Adım: Ön Analiz ve Belge Tipini Tanımlama**
		- Belgenin genel yapısına göz atarak türünü anlamaya çalış. (Örn: "Bu bir kanun metni", "Bu bir mahkeme kararı", "Bu bir tablo içeren rapor").
		- Bu tanımlama, içeriği yorumlarken sana bağlam sağlayacaktır.
		
		**2. Adım: Yapısal Haritalama (EN ÖNEMLİ ADIM)**
		- **İçeriği okumadan ÖNCE** belgenin görsel düzenini analiz et.
		- **Üstbilgi, Altbilgi ve Sayfa Numaraları:** Bu alanları tespit et ve ana metinden ayrı olarak değerlendir. Raporlarken bunları metnin içine karıştırma.
		- **Sütunlar:** Belge çok sütunlu bir yapıya sahipse, metni düz bir şekilde soldan sağa okuma hatasına düşme. Her bir sütunu yukarıdan aşağıya doğru, mantısal akışına göre oku.
		- **Tablolar:** Bir tablo tespit ettiğinde, bunu düz metin olarak değil, **yapısal bir veri olarak** ele al. Satırları, sütunları ve başlıkları doğru bir şekilde ayırarak veriyi çıkar.
		- **Başlıklar ve Listeler:** Yazı tipi boyutu, kalınlık gibi biçimlendirme özelliklerini kullanarak belgenin hiyerarşisini (ana başlıklar, alt başlıklar, madde imli listeler) anla.
		
		**3. Adım: Bağlamsal İçerik Çıkarımı ve Metin Dönüşümü**
		- Yapısal haritayı çıkardıktan sonra metin okuma işlemine başla.
		- **Mantıksal Akış:** Metni, 2. Adım'da belirlediğin mantıksal sıraya göre (örneğin, önce 1. sütun, sonra 2. sütun) çıkar.
		- **OCR Hata Düzeltme:** Okuma sırasında anlamsız veya bariz şekilde hatalı görünen kelimeleri (örn: "Kanun" yerine "Kanun_n", "1" yerine "l", "O" yerine "0") cümlenin genel bağlamına göre düzeltmeye çalış. Bir kelimenin mevzuat terminolojisine uymadığını fark edersen, en olası doğru halini tahmin et ve kullan.
		- Biçimlendirmeyi Koru: Metindeki **kalın**, *italik* veya altı çizili ifadeleri Markdown formatında koruyarak metne aktar. Bu, metnin orijinal vurgusunu ve anlamını korumak için kritiktir.
		
		**4. Adım: Veri Bütünleştirme ve Sonuç Raporlama**
		- Çıkardığın tüm yapısal elemanları (düz metin, listeler, tablolar) tutarlı ve okunaklı bir formatta birleştir.
		- Tabloları, Markdown tablo formatında düzgün bir şekilde sun.
		- Sonuç çıktısını, sanki orijinal belgeyi okuyormuş gibi anlaşılır ve mantıksal bir bütünlük içinde oluştur.
		
		### KESİN KURALLAR (PDF Okuma için)
		- **Yapıyı İçerikten ÖNCE Analiz Et:** Asla bir PDF'yi doğrudan metin olarak okumaya başlama. Önce düzenini anla.
		- **Tabloları Düz Metin Olarak Okuma:** Tabloları her zaman satır ve sütun bütünlüğünü koruyarak yapısal veri olarak çıkar.
		- **Anlamsal Bütünlüğü Koru:** Bir başlığı, ait olduğu paragraftan veya bir maddeyi, ait olduğu listeden ayırma.
		- **Görsel Unsurları Tanımla:** Eğer metin olmayan unsurlar (resim, grafik, imza) varsa, bunları metne dönüştürmeye çalışma, bunun yerine "[İmza Alanı]", "[Kurum Logosu]" gibi bir tanımlayıcı metinle belirt.
			
    # ROL VE HEDEF
		Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve Unvan Değişikliği Sınavı ve ilgili Türk mevzuatı konularında uzman, analitik ve titiz bir yapay zeka asistanısın. Birincil görevin, sana sunulan metinlere ("NOTLAR") ve görsellere dayanarak, soruları yanıtlamaktır. Bu süreçte temel felsefen şudur: **Kontrol yukarıdan aşağıya, karar ve uygulama ise aşağıdan yukarıya doğru işler.** Mutlak önceliğin her zaman en güncel ve hiyerarşik olarak en üstün hukuki normdur.
		
		## CEVAP VERME SÜRECİN (Adım Adım Düşün) ##

		### AŞAMA 1: KONTROL SÜRECİ (Üstten Alta Analiz)
		
		Bu aşamada, sorunun çözüm çerçevesini en genel ve en üst normdan başlayarak daraltırsın. Her seviye bir sonraki için bir kontrol kapısıdır.
		
		**1. ÖNCELİKLİ KAYNAĞI TESPİT ET:**
		- **EĞER SORUDA BELİRLİ BİR KANUN, YÖNETMELİK, GENELGE ADI GEÇİYORSA:** Mutlak önceliğin o metindir. Analize doğrudan o metnin hiyerarşideki yerinden başla. "NOTLAR" bölümünü sadece bir referans olarak kullan.
		- **EĞER SORUDA SPESİFİK BİR METİN BELİRTİLMİYORSA:** Analize en tepeden, yani Anayasa ve Kanunlar seviyesinden başla ve "NOTLAR" bölümündeki ilgili bilgileri bu süzgeçten geçir.
		
		**2. HİYERARŞİK KONTROL VE DOĞRULAMA (EN ÖNEMLİ ADIM):**
		- Bilginin doğruluğunu ve güncelliğini **her zaman** T.C. Mevzuat Bilgi Sistemi (mevzuat.gov.tr) ve TKGM Mevzuat Portalı (mevzuat.tkgm.gov.tr) gibi resmi kaynaklardan **üstten alta doğru** kontrol et.
		- **KONTROL PİRAMİDİ:**
			1. **Anayasa / Kanunlar Seviyesi:** Notlardaki veya sorudaki bilgi, ilgili Kanun'un (örn: Medeni Kanun, Kadastro Kanunu) amir hükümlerine uygun mu?
				- **UYGUNSA:** Bir alt seviyeye in.
				- **DEĞİLSE:** Analizi durdur. Notlardaki bilgi geçersizdir. Cevabını doğrudan Kanun'a dayandır ve "EKSİK/HATALI BİLGİ PROSEDÜRÜ"nü uygula.
			2. **Cumhurbaşkanlığı Kararnamesi / Yönetmelik Seviyesi:** Bilgi, Kanun'a uygun ve ilgili Yönetmeliğin maddeleriyle tutarlı mı?
				- **TUTARLIYSA:** Bir alt seviyeye in.
				- **DEĞİLSE:** Analizi durdur. Bilgi geçersizdir. Cevabını Yönetmeliğe dayandır ve "EKSİK/HATALI BİLGİ PROSEDÜRÜ"nü uygula.
			3. **Genelge / Talimat Seviyesi:** Bilgi, hem Kanun'a hem de Yönetmeliğe uygun ve ilgili Genelge'nin detaylarını doğru yansıtıyor mu?
				- **UYGUNSA:** Bilgi geçerlidir. Artık **AŞAMA 2: UYGULAMA SÜRECİ**'ne geçebilirsin.
				- **DEĞİLSE:** Cevabını Genelge'nin doğru ve güncel haline dayandır ve "EKSİK/HATALI BİLGİ PROSEDÜRÜ"nü uygula.
		
		**3. EKSİK VEYA HATALI BİLGİYİ DÜZELTME PROSEDÜRÜ:**
		- Yaptığın kontrol sonucunda notlarda bir hata, eksiklik veya güncel olmayan bilgi tespit edersen:
			a. Hatalı veya güncel olmayan bilgiyi **kesinlikle KULLANMA**.
			b. Doğru ve güncel bilgiyi, hiyerarşideki en üst ve geçerli resmi kaynaktan tespit et.
			c. Cevabını bu doğru ve hiyerarşik olarak üstün bilgiye dayandır.
			d. Cevabının "answer" kısmında, notlardaki hatayı **AÇIKÇA** belirt. Hangi üst norma aykırı olduğunu veya neden güncel olmadığını açıkla (örn: "Notlardaki Genelge'de belirtilen husus, 3402 Sayılı Kadastro Kanunu'nun X maddesine aykırıdır. Güncel ve doğru uygulama şu şekildedir:"). Kullandığın doğru bilginin kaynağını net bir şekilde referans göster.
			e. Bulduğun bu yeni ve doğru bilgiyi, gelecekte kullanılmak üzere "newNoteContent" alanına, notların formatına uygun, anlaşılır bir şekilde ekle.
		
		---
		
		### AŞAMA 2: UYGULAMA SÜRECİ (Alttan Üste Karar Verme)
		
		Bu aşamada, kontrol sürecinden başarıyla geçmiş olan en spesifik bilgiden yola çıkarak, cevabını bir uzman gibi inşa edersin.
		
		**4. CEVABI SENTEZLE VE OLUŞTUR:**
		- **TEMELİ AT (EN ALT VE EN SPESİFİK NORM):** Cevabını, sorunun çözümünü içeren en detaylı ve geçerli olan en alt düzeydeki normdan (genellikle bir Genelge veya Yönetmelik maddesi) başlat. Bu, senin somut başlangıç noktandır.
		- **YAPIYI KUR (BİR ÜST NORM):** Bu spesifik bilginin, bir üst norm olan Yönetmeliğin hangi maddesine dayandığını veya onunla nasıl uyumlu olduğunu açıklayarak cevabını güçlendir.
		- **ÇATIYI KOY (EN ÜST NORM):** Son olarak, bu detayın ve prosedürün, en üst norm olan ilgili Kanun'un hangi maddesi tarafından yetkilendirildiğini veya genel çerçevesine nasıl uyduğunu belirterek nihai sentezi yap ve kararını gerekçelendir.
		- **TEK DOĞRU CEVAP İLKESİ:** Yaptığın bu sentez sonucunda, sorunun tek bir doğru cevabına odaklan. Eğer farklı yorumlar mümkünse bile, neden seçtiğin cevabın normlar hiyerarşisi ve alttan üste sentez mantığına göre en doğrusu olduğunu gerekçelendirerek nihai ve net bir cevap ver.
		
		**5. CEVABI BİÇİMLENDİR VE YAPISAL OLARAK DÖNDÜR:**
		- Cevabını okunaklı kılmak için **Markdown** formatını kullan (Başlıklar, kalın/italik metin, listeler vb.).
		- Sonucu aşağıda belirtilen JSON formatında döndür.
		
		## KESİN KURALLAR ##
		- Mutlak öncelik **doğruluk, güncellik ve normlar hiyerarşisine** aittir. Hata varsa düzelt, açıkla ve notların güncellenmesi için yeni bilgiyi sağla.
		- Eğer sorunun cevabı ne notlarda ne de yaptığın güncel mevzuat araştırmasında mevcut değilse, "answer" alanına "Bu sorunun cevabı sağlanan notlarda veya güvenilir resmi kaynaklarda mevcut değil." yaz ve "newNoteContent" alanını boş bırak.
		- Cevaplarındaki tüm cümlelerin ilk harfi mutlaka büyük harf olmalıdır. Dil bilgisi kurallarına titizlikle uy.
		- Kanun metinlerindeki maddelerin analizini hatasız yapmalısın.
		
		## JSON ÇIKTI FORMATI ##
		{
		"answer": "Markdown formatında, AŞAMA 2'deki sentez mantığına göre oluşturulmuş, gerekçeli ve kaynak gösterilmiş nihai cevap.",
		"newNoteContent": "Eğer notlarda bir hata tespit edildiyse, buraya notların formatına uygun, doğru ve güncel bilgi eklenecek. Hata yoksa bu alan boş bırakılacak."
		}
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

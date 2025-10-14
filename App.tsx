
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getAnswerFromNotes, categorizeUpdate } from './services/geminiService';
import Spinner from './components/Spinner';
import { marked } from 'marked';

const Header: React.FC = () => (
  <header className="bg-white shadow-md">
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center space-x-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <h1 className="text-2xl font-bold text-slate-800">TKGM Görevde Yükselme Sınav Asistanı</h1>
    </div>
  </header>
);

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error("Could not convert file to base64."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- TELİF HAKKI BİLDİRİMİ (TESCİLLİ VERİ) ---
// Aşağıdaki 'initialNotes' değişkeni, bu projenin tescilli (proprietary) bir parçasıdır.
// İçerdiği veriler, telif hakkıyla korunmaktadır ve izinsiz kopyalanması, dağıtılması veya
// yeniden kullanılması kesinlikle yasaktır.
// Daha fazla bilgi için projenin LICENSE dosyasına bakınız.
// --- BİLDİRİM SONU ---
const initialNotes = `
# ROL VE HEDEF
Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve Unvan Değişikliği Sınavı ve ilgili Türk mevzuatı konularında uzman, analitik ve titiz bir yapay zeka asistanısın. Birincil görevin, sana sunulan sınav sorularını, "NOTLAR" olarak tanımlanan bilgi kaynağını ve diğer girdileri kullanarak, bir hukuk uzmanı titizliğiyle analiz etmek ve mutlak surette doğru olan şıkkı, gerekçeleriyle birlikte tespit etmektir.

## BİLGİ KAYNAKLARI
- **Birincil Kaynak:** Sana daha önce yüklenmiş olan **"TKGM GÖREVDE YÜKSELME VE ÜNVAN DEĞİŞİKLİĞİ SINAVI NOTLARI (2025)"** dokümanı senin temel bilgi havuzundur.
- **İkincil Kaynaklar:** Soruda atıfta bulunulan veya analiz için gerekli olan her türlü PDF belgesi, görsel veya ek metin.
- **Doğrulama Kaynakları:** T.C. Mevzuat Bilgi Sistemi (mevzuat.gov.tr) ve TKGM Mevzuat Portalı (mevzuat.tkgm.gov.tr).

# TEMEL FELSEFE: KONTROL VE SENTEZ
Çalışma prensibin iki temel aşamadan oluşur:
1.  **Kontrol (Üstten Alta):** Bilginin doğruluğunu ve geçerliliğini, en üst hukuk normundan en alta doğru sorgularsın.
2.  **Sentez (Alttan Üste):** Geçerli olan en spesifik bilgiden yola çıkarak, cevabını bir argüman gibi inşa edersin.

---

## ADIM ADIM DÜŞÜNME VE CEVAP VERME SÜRECİ ##

Bir soru ile karşılaştığında, aşağıdaki adımları sırasıyla ve eksiksiz olarak uygula:

### Adım 1: Soru Analizi (Ne Soruluyor?)
- Sorunun kökünü dikkatlice oku ve neyi sorduğunu tam olarak anla.
- Sorunun anahtar kelimelerini, konusunu (örn: "yabancıların taşınmaz edinimi", "kadastro güncellemesi") ve sorguladığı spesifik hukuki durumu tespit et.

### Adım 2: Bilgi Toplama ve Gelişmiş Veri İşleme
- Soruyla ilgili olabilecek tüm bilgileri birincil kaynağın olan "NOTLAR" dokümanından topla.
- Eğer varsa, PDF gibi ikincil kaynakları **"PDF OKUMA VE ANALİZ UZMANLIĞI"** modülündeki kurallara göre işle: Önce belgenin yapısını (tablolar, sütunlar, başlıklar) analiz et, sonra içeriği mantıksal akışına göre hatasız bir şekilde çıkar.

### Adım 3: KONTROL SÜRECİ (Üstten Alta Doğrulama)
- Topladığın tüm bilgileri, resmi doğrulama kaynaklarını kullanarak normlar hiyerarşisine göre **yukarıdan aşağıya** doğru bir süzgeçten geçir.
- **Hiyerarşi Piramidi:**
  1.  **Kanun Kontrolü:** Bu bilgi, ilgili Kanun'un (Medeni Kanun, Kadastro Kanunu vb.) amir hükümlerine uygun mu?
  2.  **Yönetmelik Kontrolü:** Kanun'a uygunsa, ilgili Yönetmeliğin maddeleriyle çelişiyor mu?
  3.  **Genelge Kontrolü:** Yönetmeliğe de uygunsa, en güncel Genelge'nin detaylarını doğru yansıtıyor mu?
- **Çelişki Kuralı:** Herhangi bir seviyede bir çelişki tespit edersen, analizini o seviyede durdur ve **her zaman hiyerarşik olarak üstün olan normu** (örn: Kanun, Yönetmeliğe üstündür) doğru kabul et. Alt seviyedeki (örn: Genelge) bilgi geçersizdir.

### Adım 4: SENTEZ SÜRECİ (Alttan Üste İdeal Cevap Oluşturma)
- Kontrol sürecinden başarıyla geçen en doğru, en güncel ve en spesifik bilgiyi temel alarak "ideal cevabı" kendi içinde oluştur.
- **1. Temeli At (En Spesifik Norm):** Cevabın temelini, soruyu doğrudan yanıtlayan geçerli Genelge veya Yönetmelik maddesine dayandır.
- **2. Argümanı Güçlendir (Üst Normlar):** Bu spesifik kuralın, hangi Yönetmelik ve Kanun maddesinden yetki aldığını veya bu üst normların genel çerçevesine nasıl uyduğunu açıklayarak cevabını mantıksal bir bütün haline getir.

### Adım 5: Şıkların Değerlendirilmesi ve Karşılaştırılması
- 4. Adım'da oluşturduğun "ideal, gerekçeli cevap" ile soruda verilen her bir şıkkı (A, B, C, D, E) tek tek karşılaştır.
- **Doğru Şıkkı Bul:** Hangi şıkkın senin sentezlediğin ideal cevapla birebir örtüştüğünü tespit et.
- **Yanlış Şıkları Ele:** Diğer şıkların neden yanlış olduğunu, hangi kurala aykırı olduklarını veya hangi eksik/hatalı bilgiyi içerdiğini belirle.

### Adım 6: Nihai Karar ve Gerekçelendirme
- Tespit ettiğin doğru şıkkı, neden doğru olduğunu ve diğer şıkların neden yanlış olduğunu açık ve anlaşılır bir dille ifade eden nihai cevabını oluştur.

---

## ÖZEL DURUM PROSEDÜRÜ: EKSİK/HATALI BİLGİ
- Eğer "NOTLAR" dokümanında, yaptığın kontrol sonucunda güncel olmayan, eksik veya bir üst norma aykırı bir bilgi tespit edersen:
  - Bu hatalı bilgiyi **kesinlikle kullanma**.
  - Cevabını, resmi kaynaklardan bulduğun doğru ve güncel bilgiye dayandır.
  - Cevabının "answer" kısmında bu durumu **açıkça belirt** (örn: "Notlardaki bilgi, ... tarihli Kanun değişikliği ile güncelliğini yitirmiştir. Doğru uygulama şudur:...").
  - Doğru bilgiyi, gelecekte kullanılmak üzere "newNoteContent" alanına ekle.

## KESİN KURALLAR
- Mutlak öncelik doğruluk, güncellik ve normlar hiyerarşisidir.
- Cevapların net, analitik ve doğrudan olmalıdır.
- Dil bilgisi kurallarına titizlikle uy. Cümlelerin ilk harfi daima büyük harf olmalıdır.

## JSON ÇIKTI FORMATI
{
  "thought_process": "Buraya, yukarıdaki 6 adımlı düşünme sürecini, bu spesifik soru için nasıl işlettiğini özetleyen bir metin gelecek. Hangi bilgiyi nereden aldığını, nasıl kontrol ettiğini, nasıl sentezlediğini ve şıkları nasıl elediğini adım adım açıklayacaksın.",
  "answer": "Markdown formatında, doğru şıkkı ve o şıkkın neden doğru, diğerlerinin neden yanlış olduğunu açıklayan detaylı ve gerekçeli nihai cevap.",
  "correct_choice": "A",
  "newNoteContent": "Eğer notlarda bir hata tespit edildiyse, buraya notların formatına uygun, doğru ve güncel bilgi eklenecek. Hata yoksa bu alan boş bırakılacak."
}
`;
// --- NOTLARIN SONU ---

const licenseText = `
## Telif Hakkı ve Fikri Mülkiyet Bilgisi
---------------

**Kaynak İçerik:**
Bu yapay zeka asistanının dayandığı orijinal metin içeriğinin (yasa maddeleri, yönetmelikler, tebliğler ve diğer kaynak dokümanlar) telif hakkı, ilgili kanunları hazırlayan kişi ve kurumlara aittir.

**Yazılım Bilgisi ve Sorumluluk Reddi:**
Yapay Zeka Asistanının kullanım hakları ve telifleri, Google LLC'nin kullanım politikaları tarafından korunmaktadır ve bu politikalara tabidir.

Bu yazılımın geliştiricisi, yazılımın kullanımından veya kullanılamamasından kaynaklanan (kâr kaybı, iş kesintisi, bilgi kaybı veya diğer maddi kayıplar dahil ancak bunlarla sınırlı olmamak üzere) doğrudan, dolaylı, arızi, özel, örnek veya sonuç olarak ortaya çıkan zararlardan, bu tür zararların olasılığı bildirilmiş olsa bile, sorumlu tutulamaz.
`;

const parseNotes = (notes: string): Record<string, string> => {
  const sections = notes.split(/(?=^## BÖLÜM \d:|^### \d\.\d\.)/m);
  const parsedNotes: Record<string, string> = {};
  if (sections.length > 0 && sections[0].trim() === "") sections.shift();

  sections.forEach(section => {
    const titleLine = section.split('\n')[0];
    if (titleLine.includes('BÖLÜM 1: ORTAK KONULAR')) {
      parsedNotes['Ortak Konular'] = section;
    } else if (titleLine.includes('Tapu Müdürü')) {
      parsedNotes['Tapu Müdürü ve Tapu Sicil Müdür Yardımcısı'] = section;
    } else if (titleLine.includes('Avukat Konuları')) {
      parsedNotes['Avukat'] = section;
    } else if (titleLine.includes('Mühendis (Harita ve Kontrol)')) {
      parsedNotes['Mühendis (Harita ve Kontrol)'] = section;
    } else if (titleLine.includes('Gıda Mühendisi')) {
      parsedNotes['Gıda Mühendisi'] = section;
    }
  });
  return parsedNotes;
};


const LicenseModal: React.FC<{ onClose: () => void; content: string }> = ({ onClose, content }) => {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const parseContent = async () => {
      const parsed = await marked.parse(content);
      setHtmlContent(parsed);
    };
    parseContent();
  }, [content]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center">
          <h2 id="license-title" className="text-lg font-bold text-slate-800">Telif Hakkı & Lisans</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800" aria-label="Kapat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          <div 
            className="prose prose-sm prose-zinc max-w-none" 
            style={{ color: 'black' }}
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        </div>
        <footer className="p-4 border-t text-right">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Anladım
          </button>
        </footer>
      </div>
    </div>
  );
};

const CameraModal: React.FC<{ onClose: () => void; onCapture: (file: File) => void; }> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Kameraya erişilemedi. Lütfen tarayıcı izinlerinizi kontrol edin.");
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob((blob) => {
          if (blob) {
            const imageFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(imageFile);
          }
        }, 'image/jpeg');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" role="dialog" aria-modal="true" aria-labelledby="camera-title" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center">
          <h2 id="camera-title" className="text-lg font-bold text-slate-800">Fotoğraf Çek</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800" aria-label="Kapat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="p-4 flex-grow bg-slate-900 flex justify-center items-center">
          {error ? (
            <p className="text-red-400 text-center">{error}</p>
          ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[60vh] rounded" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <footer className="p-4 border-t flex justify-center">
          <button 
            onClick={handleCapture} 
            disabled={!!error}
            className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>Fotoğrafı Çek</span>
          </button>
        </footer>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [image, setImage] = useState<{ file: File; base64: string; mimeType: string; } | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentNotes, setCurrentNotes] = useState<string>(initialNotes);
  const [isLicenseVisible, setIsLicenseVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedNotes = useMemo(() => parseNotes(currentNotes), [currentNotes]);
  const examCategories = useMemo(() => Object.keys(parsedNotes).filter(k => k !== 'Ortak Konular'), [parsedNotes]);
  const [selectedExam, setSelectedExam] = useState<string>('Mühendis (Harita ve Kontrol)');
  
  const processImageFile = async (file: File) => {
     if (file.size > 16 * 1024 * 1024) { 
        alert("Dosya boyutu 16MB'tan büyük olamaz.");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setImage({ file, base64, mimeType: file.type });
      } catch (error) {
        console.error("Görsel dönüştürme hatası:", error);
        alert("Görsel yüklenirken bir hata oluştu.");
      }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };
  
  const handleCapture = async (file: File) => {
    if (file) {
      await processImageFile(file);
      setIsCameraOpen(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setAnswer('');

    const notesForPrompt = (parsedNotes['Ortak Konular'] || '') + '\n\n' + (parsedNotes[selectedExam] || '');

    try {
      const result = await getAnswerFromNotes(notesForPrompt, question, image ? { data: image.base64, mimeType: image.mimeType } : undefined);
      const formattedAnswer = await marked.parse(result.answer);
      setAnswer(formattedAnswer);

      if (result.newNoteContent) {
        console.log("Yeni not içeriği tespit edildi. Notlar güncelleniyor.");
        const relevantCategory = await categorizeUpdate(question, Object.keys(parsedNotes));
        
        const categoryContent = parsedNotes[relevantCategory];
        
        if (categoryContent) {
           const updatedCategoryContent = `${categoryContent}\n\n${result.newNoteContent}`;
           const newNotes = currentNotes.replace(categoryContent, updatedCategoryContent);
           setCurrentNotes(newNotes);
           console.log(`'${relevantCategory}' kategorisi güncellendi.`);
        } else {
           console.warn("İlgili kategori bulunamadı, notlar güncellenmedi.");
        }
      }
    } catch (error) {
      console.error(error);
      setAnswer("<p class='text-red-500'>Bir hata oluştu. Lütfen tekrar deneyin.</p>");
    } finally {
      setIsLoading(false);
    }
  }, [question, image, isLoading, currentNotes, selectedExam, parsedNotes]);

  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [answer]);
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {isLicenseVisible && <LicenseModal onClose={() => setIsLicenseVisible(false)} content={licenseText} />}
      {isCameraOpen && <CameraModal onClose={() => setIsCameraOpen(false)} onCapture={handleCapture} />}
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-grow w-full">
          <div className="py-6">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="mb-4">
                    <label htmlFor="exam-select" className="block text-sm font-medium text-slate-700 mb-1">
                      Sınav Alanınızı Seçin:
                    </label>
                    <select
                      id="exam-select"
                      name="exam"
                      className="w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm bg-white text-black"
                      value={selectedExam}
                      onChange={(e) => setSelectedExam(e.target.value)}
                      aria-label="Sınav Alanı Seçimi"
                    >
                      {examCategories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Sorunuzu buraya yazın... (Örn: Kamulaştırma Kanunu'na göre 'acele kamulaştırma' hangi durumlarda uygulanır?)"
                      className="w-full h-48 p-4 pr-12 border border-slate-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white text-black"
                      aria-label="Soru"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={isLoading || !question.trim()}
                      aria-label="Soruyu gönder"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50" disabled={isLoading}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        Görsel Ekle
                      </button>
                       <button type="button" onClick={() => setIsCameraOpen(true)} className="px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50" disabled={isLoading}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                         </svg>
                        Fotoğraf Çek
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                      </div>
                      {image && (
                        <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                          <span className="min-w-0 break-all">{image.file.name}</span>
                          <button onClick={removeImage} className="flex-shrink-0 text-red-500 hover:text-red-700" aria-label="Görseli kaldır">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      )}
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          {(isLoading || answer) && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                {isLoading ? (
                  <Spinner />
                ) : (
                  <div 
                    ref={answerRef} 
                    className="prose prose-zinc max-w-none" 
                    style={{ color: 'black' }}
                    dangerouslySetInnerHTML={{ __html: answer }} />
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="bg-white mt-auto">
          <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
            <p>Bu asistan, yalnızca çalışma amacıyla kullanılan bir yapay zeka uygulamasıdır.</p>
            <button onClick={() => setIsLicenseVisible(true)} className="text-blue-600 hover:underline">
              Telif Hakkı & Lisans Bildirimi
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default App;

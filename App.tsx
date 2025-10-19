import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getAnswerFromNotes, ProgressUpdate } from './services/geminiService';
import ThinkingProcess from './components/ThinkingProcess';
import { marked } from 'marked';

type ProcessStatus = 'idle' | 'running' | 'success' | 'cancelled' | 'error';
type FeedbackStatus = 'idle' | 'positive' | 'negative';

declare global {
  interface Window {
    va: (command: string, eventName: string, data?: Record<string, any>) => void;
    vaq: any[];
  }
}

const Header: React.FC = () => (
  <header className="bg-white shadow-md">
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center space-x-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <h1 className="text-2xl font-bold text-slate-800">TKGM Görevde Yükselme ve Unvan Değişikliği Sınav Asistanı</h1>
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

const initialNotes = `
# ROL VE HEDEF
Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve Unvan Değişikliği Sınavı ve ilgili Türk mevzuatı (Anayasa, Kanunlar, Yönetmelikler vb.) konularında uzman, analitik ve titiz bir yapay zeka asistanısın. Birincil görevin, sana sunulan sınav sorularını, "NOTLAR" olarak tanımlanan bilgi kaynağını kullanarak, bir hukuk uzmanı titizliğiyle analiz etmek ve mutlak surette doğru olan şıkkı, gerekçeleriyle birlikte tespit etmektir.
- **Birincil Kaynak:** Sana daha önce yüklenmiş olan **"TKGM Görevde Yükselme ve Unvan Değişikliği Sınav Notları (2025)"** dokümanı senin temel bilgi havuzundur.
- **İkincil Kaynaklar:** Soruda atıfta bulunulan veya analiz için gerekli olan her türlü görsel veya ek metin.
- **Doğrulama Kaynakları:** T.C. Mevzuat Bilgi Sistemi (mevzuat.gov.tr), TKGM Mevzuat Portalı (mevzuat.tkgm.gov.tr) ve TKGM resmi sitesi (tkgm.gov.tr).

# TEMEL FELSEFE: KONTROL VE SENTEZ
Çalışma prensibin iki temel aşamadan oluşur:
1.  **Kontrol (Üstten Alta):** Bilginin doğruluğunu ve geçerliğini, en üst hukuk normundan en alta doğru sorgularsın.
2.  **Sentez (Alttan Üste):** Geçerli olan en spesifik bilgiden yola çıkarak, cevabını bir argüman gibi inşa edersin.

---

## ADIM ADIM DÜŞÜNME VE CEVAP VERME SÜRECİ ##

Bir soru ile karşılaştığında, aşağıdaki adımları sırasıyla ve eksiksiz olarak uygula:

### Adım 1: Soru Analizi (Ne Soruluyor?)
- Sorunun kökünü dikkatlice oku ve neyi sorduğunu tam olarak anla.
- Sorunun anahtar kelimelerini, konusunu (örn: "Devlet memurlarının yıllık izin hakkı", "kadastro tespiti", "imar planı değişikliği") ve sorguladığı spesifik hukuki durumu tespit et.

### Adım 2: Bilgi Toplama ve Doğrulama
- Soruyla ilgili olabilecek tüm bilgileri birincil kaynağın olan "NOTLAR" dokümanından topla.
- Topladığın bilgilerin güncelliğini doğrulama kaynaklarından (mevzuat.gov.tr, mevzuat.tkgm.gov.tr) teyit et.

### Adım 3: KONTROL SÜRECİ (Üstten Alta Doğrulama)
- Topladığın tüm bilgileri, normlar hiyerarşisine göre **yukarıdan aşağıya** doğru bir süzgeçten geçir.
- **Hiyerarşi Piramidi:**
  1.  **Anayasa Kontrolü:** Bu bilgi Anayasa'ya uygun mu?
  2.  **Kanun Kontrolü:** Anayasa'ya uygunsa, ilgili Kanun'un (657 Sayılı DMK, 3402 Sayılı Kadastro Kanunu vb.) amir hükümlerine uygun mu?
  3.  **Yönetmelik Kontrolü:** Kanun'a uygunsa, ilgili Yönetmeliğin maddeleriyle çelişiyor mu?
  4.  **Genelge/Tebliğ Kontrolü:** Yönetmeliğe de uygunsa, en güncel Genelge veya Tebliğ'in detaylarını doğru yansıtıyor mu?
- **Çelişki Kuralı:** Herhangi bir seviyede bir çelişki tespit edersen, **her zaman hiyerarşik olarak üstün olan normu** (örn: Kanun, Yönetmeliğe üstündür) doğru kabul et.

### Adım 4: SENTEZ SÜRECİ (Alttan Üste İdeal Cevap Oluşturma)
- Kontrol sürecinden başarıyla geçen en doğru, en güncel ve en spesifik bilgiyi temel alarak "ideal cevabı" oluştur.
- **1. Temeli At (En Spesifik Norm):** Cevabın temelini, soruyu doğrudan yanıtlayan geçerli Genelge veya Yönetmelik maddesine dayandır.
- **2. Argümanı Güçlendir (Üst Normlar):** Bu spesifik kuralın, hangi Yönetmelik ve Kanun maddesinden yetki aldığını veya bu üst normların genel çerçevesine nasıl uyduğunu açıklayarak cevabını mantıksal bir bütün haline getir.

### Adım 5: Şıkların Değerlendirilmesi ve Karşılaştırılması
- 4. Adım'da oluşturduğun "ideal, gerekçeli cevap" ile soruda verilen her bir şıkkı tek tek karşılaştır.
- **Doğru Şıkkı Bul:** Hangi şıkkın senin sentezlediğin ideal cevapla birebir örtüştüğünü tespit et.
- **Yanlış Şıkları Ele:** Diğer şıkların neden yanlış olduğunu, hangi kurala aykırı olduklarını veya hangi eksik/hatalı bilgiyi içerdiğini belirle.

### Adım 6: Nihai Karar ve Gerekçelendirme
- Tespit ettiğin doğru şıkkı, neden doğru olduğunu ve diğer şıkların neden yanlış olduğunu açık ve anlaşılır bir dille ifade eden nihai cevabını oluştur. Cevaplamaya başlarken büyük harfle başlamalı ve yazım kurallarına titizlikle uymalısın.

---

## ÖZEL DURUM PROSEDÜRÜ: EKSİK/HATALI BİLGİ
- Eğer "NOTLAR" dokümanında, yaptığın kontrol sonucunda güncel olmayan, eksik veya bir üst norma ayırı bir bilgi tespit edersen:
  - Bu hatalı bilgiyi **kesinlikle kullanma**.
  - Cevabını, resmi kaynaklardan bulduğun doğru ve güncel bilgiye dayandır.
  - Cevabının "answer" kısmında bu durumu **açıkça belirt**.
  - Doğru bilgiyi, gelecekte kullanılmak üzere "newNoteContent" alanına ekle.

## KESİN KURALLAR
- Mutlak öncelik doğruluk, güncellik ve normlar hiyerarşisidir.
- Cevapların net, analitik ve doğrudan olmalıdır.
- Dil bilgisi ve yazım kurallarına titizlikle uy.
`;

const licenseText = `
**Kaynak İçerik:**
Bu yapay zeka asistanının dayandığı orijinal metin içeriğinin (yasa maddeleri, yönetmelikler, tebliğler ve diğer kaynak dokümanlar) telif hakkı, ilgili kanunları hazırlayan kişi ve kurumlara aittir.

**Yazılım Bilgisi ve Sorumluluk Reddi:**
Yapay Zeka Asistanının kullanım hakları ve telifleri, Google LLC'nin kullanım politikaları tarafından korunmaktadır ve bu politikalara tabidir.

Bu yazılımın geliştiricisi, yazılımın kullanımından veya kullanılamamasından kaynaklanan (kâr kaybı, iş kesintisi, bilgi kaybı veya diğer maddi kayıplar dahil ancak bunlarla sınırlı olmamak üzere) doğrudan, dolaylı, arızi, özel, örnek veya sonuç olarak ortaya çıkan zararlardan, bu tür zararların olasılığı bildirilmiş olsa bile, sorumlu tutulamaz.
`;

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
          <h2 id="license-title" className="text-lg font-bold text-slate-800">Telif Hakkı & Fikri Mülkiyet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800" aria-label="Kapat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="p-6 overflow-y-auto">
          <div 
            className="prose prose-sm prose-zinc max-w-none" 
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

  const takePicture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && !error) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center">
          <h2 id="camera-title" className="text-lg font-bold text-slate-800">Fotoğraf Çek</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800" aria-label="Kapat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main className="p-4 flex-grow flex items-center justify-center bg-slate-100 relative">
          {error ? (
             <div className="text-center text-red-600 bg-red-50 p-4 rounded-md">
                <p className="font-semibold">Kamera Hatası</p>
                <p>{error}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto max-h-full object-contain rounded-md"></video>
          )}
          <canvas ref={canvasRef} className="hidden"></canvas>
        </main>
        <footer className="p-4 border-t flex justify-center items-center">
          <button 
            onClick={takePicture} 
            disabled={!!error}
            className="p-3 bg-white border-4 border-blue-600 rounded-full hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            aria-label="Fotoğrafı çek"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-full"></div>
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
  const [processStatus, setProcessStatus] = useState<ProcessStatus>('idle');
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle');
  const [currentNotes, setCurrentNotes] = useState<string>(initialNotes);
  const [isLicenseVisible, setIsLicenseVisible] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ProgressUpdate[]>([]);

  const answerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submissionControllerRef = useRef<AbortController | null>(null);
  const submittedQuestionRef = useRef<string>('');
  const rawAnswerRef = useRef<string>('');

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
    if (file) await processImageFile(file);
  };
  
  const handleCapture = async (file: File) => {
    if (file) {
      await processImageFile(file);
      setIsCameraOpen(false);
    }
  };

  const removeImage = useCallback(() => {
    setImage(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleCancel = useCallback(() => {
    if (processStatus === 'running') {
      submissionControllerRef.current?.abort();
      setProcessStatus('cancelled');
      setQuestion('');
      removeImage();
    }
  }, [processStatus, removeImage]);

  const handleSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (processStatus === 'running') return;
    const questionToSubmit = question.trim();
    if (!questionToSubmit) return;

    submissionControllerRef.current = new AbortController();
    const signal = submissionControllerRef.current.signal;
    submittedQuestionRef.current = questionToSubmit;
    
    setProcessStatus('running');
    setAnswer('');
    setFeedbackStatus('idle');
    setErrorMessage(null);
    setThinkingSteps([]);

    const handleProgressUpdate = (update: ProgressUpdate) => {
        setThinkingSteps(prevSteps => [...prevSteps, update]);
    };

    try {
      const result = await getAnswerFromNotes(
        currentNotes, 
        questionToSubmit, 
        handleProgressUpdate,
        image ? { data: image.base64, mimeType: image.mimeType } : undefined,
        signal
      );
      
      rawAnswerRef.current = result.answer; 

      let newNotesContent = currentNotes;
      if (result.newNoteContent) {
        newNotesContent = `${currentNotes}\n\n---\n\n## YENİ BİLGİ GÜNCELLEMESİ\n\n${result.newNoteContent}`;
      }
      
      const formattedAnswer = await marked.parse(result.answer);
      
      setAnswer(formattedAnswer);
      if (newNotesContent !== currentNotes) setCurrentNotes(newNotesContent);
      setProcessStatus('success');

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("İstek başarıyla iptal edildi.");
      } else {
        console.error("Sistem hatası:", error);
        setErrorMessage(error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.");
        setProcessStatus('error');
        setQuestion(submittedQuestionRef.current);
      }
    }
  }, [question, image, currentNotes, processStatus]);
  
  const handlePositiveFeedback = useCallback(() => {
    if (feedbackStatus !== 'idle') return;
    setFeedbackStatus('positive');
    window.va?.('event', 'Feedback', { 
        status: 'positive',
        question: submittedQuestionRef.current,
        answer_snippet: rawAnswerRef.current.substring(0, 100) 
    });
  }, [feedbackStatus]);

  const handleNegativeFeedback = useCallback(() => {
    if (feedbackStatus !== 'idle') return;
    setFeedbackStatus('negative');
    window.va?.('event', 'Feedback', { 
        status: 'negative',
        question: submittedQuestionRef.current,
        answer_snippet: rawAnswerRef.current.substring(0, 100)
    });
  }, [feedbackStatus]);

  useEffect(() => {
    if (processStatus === 'success' && answer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [processStatus, answer]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [question]);
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };
  
  const isLoading = processStatus === 'running';

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
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Sorunuzu buraya yazın... (Örn: 657 sayılı Devlet Memurları Kanunu'na göre, adaylık süresi en fazla ne kadardır?)"
                      className="w-full min-h-48 p-4 pr-16 border border-slate-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white text-black overflow-y-hidden"
                      aria-label="Soru"
                      disabled={isLoading}
                    />
                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                      {isLoading ? (
                         <button
                          type="button"
                          onClick={handleCancel}
                          className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform duration-75 active:scale-90"
                          aria-label="Durdur"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <rect x="4" y="4" width="12" height="12" rx="1.5" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform duration-75 active:scale-90"
                          disabled={!question.trim()}
                          aria-label="Soruyu gönder"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
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
          
          {processStatus !== 'idle' && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white p-6 rounded-lg shadow-md min-h-[200px] flex items-center justify-center">
                { (processStatus === 'running' || processStatus === 'cancelled' || processStatus === 'error') ? (
                  <ThinkingProcess updates={thinkingSteps} overallStatus={processStatus} errorMessage={errorMessage} />
                ) : (
                  answer && processStatus === 'success' && (
                    <div className='w-full'>
                      <details className="mb-6 group" open>
                        <summary className="font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between">
                          <span>Düşünme Süreci Tamamlandı</span>
                          <svg className="w-5 h-5 text-slate-500 group-open:rotate-180 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </summary>
                        <div className="mt-4 pl-4 border-l-2 border-slate-200 space-y-2">
                            {thinkingSteps.filter(s => s.stage !== 'TAMAMLANDI').map((step, index) => (
                                <div key={index} className="flex items-center text-sm text-slate-600">
                                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>{step.message}</span>
                                </div>
                            ))}
                        </div>
                      </details>
                      <div
                          ref={answerRef}
                          className="prose prose-zinc max-w-none border-t border-slate-200 pt-6"
                          dangerouslySetInnerHTML={{ __html: answer }}
                      />
                      <div className="mt-8 pt-4 border-t border-slate-200">
                        <p className="text-sm font-semibold text-slate-700 mb-2 text-center">
                          {feedbackStatus === 'idle' ? 'Bu cevap yardımcı oldu mu?' : 'Geri bildiriminiz için teşekkürler!'}
                        </p>
                        <div className="flex justify-center items-center space-x-4">
                          <button
                            onClick={handlePositiveFeedback}
                            disabled={feedbackStatus !== 'idle'}
                            className={`flex items-center space-x-2 px-4 py-2 border rounded-full transition-colors disabled:cursor-not-allowed
                              ${feedbackStatus === 'positive'
                                ? 'bg-green-600 border-green-600 text-white'
                                : `bg-white border-slate-300 text-slate-600 ${feedbackStatus === 'idle' ? 'hover:bg-green-50 hover:border-green-400 hover:text-green-700' : 'opacity-50'}`
                              }`
                            }
                            aria-label="Cevap doğru"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V17a1 1 0 001 1h6.758a1 1 0 00.97-1.22l-1.38-4.143A1 1 0 0012.38 11H9V6.5a1.5 1.5 0 00-3 0v3.833z" />
                            </svg>
                            <span>Evet</span>
                          </button>
                          <button
                            onClick={handleNegativeFeedback}
                            disabled={feedbackStatus !== 'idle'}
                            className={`flex items-center space-x-2 px-4 py-2 border rounded-full transition-colors disabled:cursor-not-allowed
                              ${feedbackStatus === 'negative'
                                ? 'bg-red-600 border-red-600 text-white'
                                : `bg-white border-slate-300 text-slate-600 ${feedbackStatus === 'idle' ? 'hover:bg-red-50 hover:border-red-400 hover:text-red-700' : 'opacity-50'}`
                              }`
                            }
                            aria-label="Cevap yanlış"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V3a1 1 0 00-1-1h-6.758a1 1 0 00-.97 1.22l1.38 4.143A1 1 0 007.62 9H11v4.5a1.5 1.5 0 003 0V9.667z" />
                            </svg>
                            <span>Hayır</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </main>
        <footer className="bg-white mt-auto">
          <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
            <p>Bu asistan, yalnızca çalışma amacıyla kullanılan bir yapay zeka uygulamasıdır.</p>
            <button onClick={() => setIsLicenseVisible(true)} className="text-blue-600 hover:underline">
              Telif Hakkı & Fikri Mülkiyet Bildirimi
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default App;
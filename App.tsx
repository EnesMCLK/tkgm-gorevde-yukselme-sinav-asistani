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
  <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-slate-100 transition-all">
    <div className="max-w-4xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex items-center gap-4">
      <div className="shrink-0 p-2 bg-blue-50 rounded-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 leading-tight tracking-tight">
        TKGM Görevde Yükselme ve Unvan Değişikliği Sınav Asistanı
      </h1>
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
Sen, Tapu ve Kadastro Genel Müdürlüğü (TKGM) Görevde Yükselme ve özellikle **Harita Mühendisliği Unvan Değişikliği Sınavı** ile ilgili Türk mevzuatı (Anayasa, Kanunlar, Yönetmelikler vb.) konularında uzman, analitik ve titiz bir yapay zeka asistanısın. Birincil görevin, sana sunulan sınav sorularını, **SADECE İZİN VERİLEN RESMİ WEB KAYNAKLARINI** kullanarak, bir hukuk ve mühendislik uzmanı titizliğiyle analiz etmek ve mutlak surette doğru olan şıkkı, gerekçeleriyle birlikte tespit etmektir.

- **Birincil Bilgi Kaynağı (KESİN KURAL):** Senin temel bilgi havuzun statik bir doküman DEĞİLDİR ve **NotebookLM gibi harici kullanıcı hesaplarına bağlanamazsın.** Bilgiyi, Google Arama aracını kullanarak **SADECE ve KESİNLİKLE** resmi T.C. mevzuat ve devlet sitelerinden bulacaksın. **İzin verilen alan adları şunlardır: \`mevzuat.gov.tr\`, \`mevzuat.tkgm.gov.tr\`, \`*.tkgm.gov.tr\` ve diğer tüm \`*.gov.tr\` uzantılı siteler.** Bu kaynaklar dışındaki hiçbir web sitesini (özel hukuk büroları, haber siteleri, forumlar vb.) KESİNLİKLE kullanmayacaksın. Bu metin, senin bilgi kaynağın değil, DÜŞÜNME VE CEVAP VERME SÜRECİNİ belirleyen bir rehberdir.
- **İkincil Kaynaklar:** Soruda atıfta bulunulan veya analiz için gerekli olan her türlü görsel veya ek metin.

# TEMEL FELSEFE: ARAŞTIR, KONTROL ET VE SENTEZLE
Çalışma prensibin üç temel aşamadan oluşur:
1.  **Araştır:** Soruyu cevaplamak için gereken güncel bilgiyi SADECE izin verilen resmi web kaynaklarından topla.
2.  **Kontrol Et (Üstten Alta):** Bulduğun bilginin doğruluğunu ve geçerliğini, en üst hukuk normundan en alta doğru sorgula.
3.  **Sentezle (Alttan Üste):** Geçerli olan en spesifik bilgiden yola çıkarak, cevabını bir argüman gibi inşa et.

---

## ADIM ADIM DÜŞÜNME VE CEVAP VERME SÜRECİ ##

Bir soru ile karşılaştığında, aşağıdaki adımları sırasıyla ve eksiksiz olarak uygula:

### Adım 1: Soru Analizi (Ne Soruluyor?)
- Sorunun kökünü dikkatlice oku ve neyi sorduğunu tam olarak anla.
- Sorunun anahtar kelimelerini, konusunu (örn: "Devlet memurlarının yıllık izin hakkı", "kadastro tespiti", "imar planı değişikliği", "Harita Mühendisliği yetkileri") ve sorguladığı spesifik hukuki durumu tespit et.

### Adım 2: WEB ARAŞTIRMASI ve Bilgi Doğrulama
- Soruyla ilgili olabilecek tüm bilgileri, Google Arama aracını kullanarak **sadece izin verilen resmi kaynaklardan (\`mevzuat.gov.tr\`, \`mevzuat.tkgm.gov.tr\`, \`*.tkgm.gov.tr\`, \`*.gov.tr\`)** topla.

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

## KESİN KURALLAR
- Mutlak öncelik doğruluk, güncellik ve normlar hiyerarşisidir. **Bilgi kaynağın her zaman SADECE izin verilen RESMİ WEB KAYNAKLARI (\`*.gov.tr\`) olmalıdır.**
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
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex justify-center items-center p-4 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 id="license-title" className="text-xl font-bold text-slate-800">Telif Hakkı & Fikri Mülkiyet</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors" aria-label="Kapat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="p-8 overflow-y-auto">
          <div 
            className="prose prose-sm prose-zinc max-w-none" 
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        </div>
        <footer className="p-5 border-t border-slate-100 text-right">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg shadow-blue-600/20"
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b flex justify-between items-center bg-white z-10">
          <h2 id="camera-title" className="text-lg font-bold text-slate-800">Fotoğraf Çek</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors" aria-label="Kapat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main className="flex-grow flex items-center justify-center bg-black relative">
          {error ? (
             <div className="text-center text-red-600 bg-red-50 p-6 rounded-xl mx-4">
                <p className="font-semibold text-lg">Kamera Hatası</p>
                <p>{error}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain"></video>
          )}
          <canvas ref={canvasRef} className="hidden"></canvas>
        </main>
        <footer className="p-6 border-t bg-white flex justify-center items-center">
          <button 
            onClick={takePicture} 
            disabled={!!error}
            className="p-1.5 bg-white border-4 border-blue-600 rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg active:scale-95"
            aria-label="Fotoğrafı çek"
          >
            <div className="w-14 h-14 bg-blue-600 rounded-full"></div>
          </button>
        </footer>
      </div>
    </div>
  );
};

const FeedbackModal: React.FC<{ onClose: () => void; onSubmit: (reason: string) => void }> = ({ onClose, onSubmit }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex justify-center items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b flex justify-between items-center bg-slate-50/50">
          <h2 id="feedback-title" className="text-lg font-bold text-slate-800">Geri Bildirim & Düzeltme Talebi</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors" aria-label="Kapat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main className="p-6">
          <p className="text-sm text-slate-600 mb-4">Lütfen cevabın neden yanlış veya eksik olduğunu kısaca açıklayın. Geri bildiriminiz, asistanın kendini düzeltmesine yardımcı olacaktır.</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: Bu yönetmelik maddesi 2023 yılında değiştirildi."
            className="w-full min-h-32 p-4 border border-slate-300 rounded-xl resize-y focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 text-slate-800"
            aria-label="Düzeltme nedeni"
            autoFocus
          />
        </main>
        <footer className="p-5 border-t flex justify-end items-center space-x-3 bg-slate-50/50">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all"
          >
            İptal
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!reason.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none"
          >
            Düzeltme Gönder
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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
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
  
  const executeQuery = useCallback(async (questionToSubmit: string, userCritique?: string) => {
      submissionControllerRef.current = new AbortController();
      setProcessStatus('running');
      setAnswer('');
      setErrorMessage(null);
      setThinkingSteps([]);

      if (!userCritique) {
        setFeedbackStatus('idle');
      }
      
      const handleProgressUpdate = (update: ProgressUpdate) => {
          setThinkingSteps(prevSteps => [...prevSteps, update]);
      };

      try {
        const result = await getAnswerFromNotes(
          currentNotes, 
          questionToSubmit, 
          handleProgressUpdate,
          {
            image: image ? { data: image.base64, mimeType: image.mimeType } : undefined,
            signal: submissionControllerRef.current.signal,
            userCritique
          }
        );
        
        rawAnswerRef.current = result.answer; 

        if (result.newNoteContent) {
          setCurrentNotes(prev => `${prev}\n\n---\n\n## YENİ BİLGİ GÜNCELLEMESİ\n\n${result.newNoteContent}`);
        }
        
        const formattedAnswer = await marked.parse(result.answer);
        
        setAnswer(formattedAnswer);
        setProcessStatus('success');
        setFeedbackStatus('idle');

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("İstek iptal edildi.");
        } else {
          console.error("Sistem hatası:", error);
          const message = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
          
          if (message.startsWith('NO_INFO_FOUND:')) {
              setErrorMessage(message.replace('NO_INFO_FOUND: ', ''));
          } else {
              setErrorMessage(message);
          }

          setProcessStatus('error');
          setQuestion(submittedQuestionRef.current);
          setFeedbackStatus('idle');
        }
      }
  }, [currentNotes, image]);

  const handleSubmit = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (processStatus === 'running') return;
    const questionToSubmit = question.trim();
    if (!questionToSubmit) return;

    submittedQuestionRef.current = questionToSubmit;
    executeQuery(questionToSubmit);
    
  }, [question, processStatus, executeQuery]);

  const handleCorrectionSubmit = useCallback(async (reason: string) => {
    setIsFeedbackModalOpen(false);
    setFeedbackStatus('negative');

    window.va?.('event', 'Feedback', { 
        status: 'negative_with_reason',
        question: submittedQuestionRef.current,
        answer_snippet: rawAnswerRef.current.substring(0, 100),
        reason: reason
    });
    
    executeQuery(submittedQuestionRef.current, reason);

  }, [executeQuery]);
  
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
    setIsFeedbackModalOpen(true);
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
      {isFeedbackModalOpen && <FeedbackModal onClose={() => setIsFeedbackModalOpen(false)} onSubmit={handleCorrectionSubmit} />}
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <main className="flex-grow w-full">
          <div className="py-6 sm:py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 transition-shadow hover:shadow-xl">
                <form onSubmit={handleSubmit}>
                    <div className="relative group">
                    <textarea
                      ref={textareaRef}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Sorunuzu buraya yazın... (Örn: 657 sayılı Devlet Memurları Kanunu'na göre, adaylık süresi en fazla ne kadardır?)"
                      className="w-full min-h-48 p-4 pr-16 border-2 border-slate-100 rounded-xl resize-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-800 placeholder:text-slate-400 overflow-y-hidden"
                      aria-label="Soru"
                      disabled={isLoading}
                    />
                    <div className="absolute top-4 right-4">
                      {isLoading ? (
                         <button
                          type="button"
                          onClick={handleCancel}
                          className="p-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform duration-100 active:scale-95"
                          aria-label="Durdur"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <rect x="4" y="4" width="12" height="12" rx="1.5" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-100 active:scale-95"
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
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 disabled:opacity-50 shadow-sm"
                        disabled={isLoading}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        Görsel Ekle
                      </button>
                       <button 
                         type="button" 
                         onClick={() => setIsCameraOpen(true)} 
                         className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 disabled:opacity-50 shadow-sm"
                         disabled={isLoading}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                         </svg>
                        Fotoğraf Çek
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                      </div>
                      {image && (
                        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 pl-3 pr-2 py-1.5 rounded-full border border-blue-100">
                          <span className="truncate max-w-[150px] font-medium">{image.file.name}</span>
                          <button onClick={removeImage} className="p-1 hover:bg-blue-200 rounded-full transition-colors text-blue-500 hover:text-blue-800" aria-label="Görseli kaldır">
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
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 min-h-[200px] flex items-center justify-center">
                { (processStatus === 'running' || processStatus === 'cancelled' || processStatus === 'error') ? (
                  <ThinkingProcess updates={thinkingSteps} overallStatus={processStatus} errorMessage={errorMessage} />
                ) : (
                  answer && processStatus === 'success' && (
                    <div className='w-full'>
                      <details className="mb-8 group bg-slate-50 p-4 rounded-xl border border-slate-200" open>
                        <summary className="font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between">
                          <span className="flex items-center">
                             <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             Düşünme Süreci Tamamlandı
                          </span>
                          <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </summary>
                        <div className="mt-4 pl-2 space-y-3">
                            {thinkingSteps.filter(s => s.stage !== 'TAMAMLANDI').map((step, index) => (
                                <div key={index} className="flex items-start text-sm text-slate-600">
                                    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-green-500 mr-3 flex-shrink-0"></div>
                                    <span className="leading-relaxed">{step.message}</span>
                                </div>
                            ))}
                        </div>
                      </details>
                      <div
                          ref={answerRef}
                          className="prose prose-zinc max-w-none"
                          dangerouslySetInnerHTML={{ __html: answer }}
                      />
                      <div className="mt-10 pt-6 border-t border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 mb-4 text-center tracking-wide uppercase">
                          {feedbackStatus === 'idle' ? 'Bu cevap yardımcı oldu mu?' : 'Geri bildiriminiz için teşekkürler!'}
                        </p>
                        <div className="flex justify-center items-center gap-4">
                          <button
                            onClick={handlePositiveFeedback}
                            disabled={feedbackStatus !== 'idle'}
                            className={`flex items-center space-x-2 px-6 py-2.5 border rounded-full transition-all disabled:cursor-not-allowed shadow-sm
                              ${feedbackStatus === 'positive'
                                ? 'bg-green-600 border-green-600 text-white ring-4 ring-green-100'
                                : `bg-white border-slate-200 text-slate-600 ${feedbackStatus === 'idle' ? 'hover:bg-green-50 hover:border-green-300 hover:text-green-700 hover:shadow-md' : 'opacity-50'}`
                              }`
                            }
                            aria-label="Cevap doğru"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V17a1 1 0 001 1h6.758a1 1 0 00.97-1.22l-1.38-4.143A1 1 0 0012.38 11H9V6.5a1.5 1.5 0 00-3 0v3.833z" />
                            </svg>
                            <span className="font-medium">Evet</span>
                          </button>
                          <button
                            onClick={handleNegativeFeedback}
                            disabled={feedbackStatus !== 'idle'}
                            className={`flex items-center space-x-2 px-6 py-2.5 border rounded-full transition-all disabled:cursor-not-allowed shadow-sm
                              ${feedbackStatus === 'negative'
                                ? 'bg-red-600 border-red-600 text-white ring-4 ring-red-100'
                                : `bg-white border-slate-200 text-slate-600 ${feedbackStatus === 'idle' ? 'hover:bg-red-50 hover:border-red-300 hover:text-red-700 hover:shadow-md' : 'opacity-50'}`
                              }`
                            }
                            aria-label="Cevap yanlış"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V3a1 1 0 00-1-1h-6.758a1 1 0 00-.97 1.22l1.38 4.143A1 1 0 007.62 9H11v4.5a1.5 1.5 0 003 0V9.667z" />
                            </svg>
                            <span className="font-medium">Hayır</span>
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
        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-slate-500 mb-2">Bu asistan, yalnızca çalışma amacıyla kullanılan bir yapay zeka uygulamasıdır.</p>
            <button onClick={() => setIsLicenseVisible(true)} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              Telif Hakkı & Fikri Mülkiyet Bildirimi
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};

export default App;
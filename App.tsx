
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
# TKGM GÖREVDE YÜKSELME VE ÜNVAN DEĞİŞİKLİĞİ SINAVI NOTLARI (2025) #

Bu notlar, Tapu ve Kadastro Genel Müdürlüğü'nün 2025 yılı için ilan ettiği Görevde Yükselme ve Unvan Değişikliği Sınavı'nın resmi konularını içermektedir.

## BÖLÜM 1: ORTAK KONULAR (TÜM ADAYLAR İÇİN) ##
- **T.C. Anayasası**: Genel Esaslar, Temel Hak ve Ödevler, Devletin Temel Organları
- **Atatürk İlkeleri ve İnkılap Tarihi**
- **657 Sayılı Devlet Memurları Kanunu**
- **Kamu Görevlileri Etik Davranış İlkeleri İle Başvuru Usul Ve Esasları Hakkında Yönetmelik**
- **Resmi Yazışmalarda Uygulanacak Usul Ve Esaslar Hakkında Yönetmelik**
- **4 Sayılı Cumhurbaşkanlığı Kararnamesi (TKGM ile ilgili 478 ila 488. Maddeleri)**

### 4 Sayılı Cumhurbaşkanlığı Kararnamesi Detayları (TKGM İlgili Daire Başkanlıkları)

#### Madde 482 - Tapu Dairesi Başkanlığı
(1) Tapu Dairesi Başkanlığının görev ve yetkileri şunlardır:
a) Tapu sicil ve kayıtlarının mevzuata uygun olarak tutulmasını sağlamak, bu amaçla gerekli tedbirleri almak.
b) Akde ve tescile ilişkin her türlü işlemi yapmak, yaptırmak ve denetlemek.
c) Gerçek ve tüzel kişilerin mülkiyet ve mülkiyetin gayri ayni haklarına ilişkin her türlü akit ve tescil işlerini yapmak veya yaptırmak.
ç) Devletin sorumluluğunda bulunan tapu sicillerinin düzenli bir şekilde tutulmasını, aleniyetini sağlamak.
d) Sahteciliğe konu olan tapu sicil ve belgelerinin idari ve adli mercilere intikalini sağlamak ve takibini yapmak.
e) Yabancı uyruklu gerçek ve tüzel kişilerin ülkedeki tapu ve kadastro işlemlerini yapmak, yaptırmak, mevzuat çerçevesinde tutulması gereken kayıtları tutmak, istatistiki bilgileri derlemek ve ilgili kurum ve kuruluşlara göndermek.
f) Genel Müdür tarafından verilen benzeri görevleri yapmak.

#### Madde 483 - Kadastro Dairesi Başkanlığı
(1) Kadastro Dairesi Başkanlığının görev ve yetkileri şunlardır:
a) Ülkenin kadastrosunu yapmak, yaptırmak, denetlemek, tescil ve arşivleme işlemlerini yapmak veya yaptırmak.
b) Yenileme ve güncelleme çalışmalarını yapmak veya yaptırmak.
c) Tescile konu her türlü plan ve teknik içerikli belgelerin kontrolünü yapmak veya yaptırmak.
ç) Tapu planlarının teknik yönden reddine dair müdürlüklerce verilen kararlara karşı yapılan itirazları inceleyerek Genel Müdürlük görüşünü hazırlamak.
d) Kadastro ve tapu ile ilgili teknik uyuşmazlıklarda mahkemelere ve diğer kamu kurum ve kuruluşlarına teknik bilirkişi hizmeti vermek veya verdirmek.
e) Genel Müdür tarafından verilen benzeri görevleri yapmak.

#### Madde 484 - Harita Dairesi Başkanlığı
(1) Harita Dairesi Başkanlığının görev ve yetkileri şunlardır:
a) Ülke jeodezik altyapısını oluşturmak, geliştirmek, yenilemek, hizmete sunmak.
b) Büyük ölçekli harita ve harita bilgilerinin üretimini yapmak, yaptırmak ve denetlemek.
c) Hava fotoğrafları ve uydu görüntülerini temin etmek, fotogrametrik ve yersel yöntemlerle harita ve harita bilgileri üretmek.
ç) Ulusal coğrafi bilgi sisteminin altyapısını oluşturmaya yönelik çalışmalar yapmak.
d) Harita ve harita bilgisi üretim standartlarını belirlemek.
e) Harita, plan, hava fotoğrafı, uydu görüntüsü ve diğer teknik belgelerin arşivlenmesini, korunmasını ve faydalanılmasını sağlamak.
f) Genel Müdür tarafından verilen benzeri görevleri yapmak.

#### Madde 485 - Yabancı İşler Dairesi Başkanlığı
(1) Yabancı İşler Dairesi Başkanlığının görev ve yetkileri şunlardır:
a) Yabancı uyruklu gerçek kişilerin ve yabancı ülkelerde kendi kanunlarına göre kurulan tüzel kişiliğe sahip ticaret şirketlerinin ülkemizde taşınmaz ve sınırlı ayni hak edinimlerine ilişkin işlemleri yürütmek.
b) Yabancı devletlerin ülkemizdeki diplomatik temsilciliklerinin taşınmaz edinimlerine ilişkin işlemleri yürütmek.
c) Tapu ve kadastro alanında uluslararası kuruluşlarla ilişkileri yürütmek.
ç) Yurtdışında yaşayan vatandaşlarımızın ve yabancıların ülkemizdeki tapu ve kadastro işlemlerini kolaylaştırmak amacıyla, yurtdışında temsilcilikler açılması için çalışmalar yapmak, mevcut temsilciliklerin çalışmalarını koordine etmek ve denetlemek.
d) Genel Müdürün görev alanına giren konularda, yabancı ülkelerle yapılacak anlaşmalara ilişkin çalışmalarda bulunmak ve bu anlaşmaları uygulamak.
e) Genel Müdür tarafından verilen benzeri görevleri yapmak.


## BÖLÜM 2: GÖREVDE YÜKSELME ALAN KONULARI ##

### 2.1. Tapu Müdürü ve Tapu Sicil Müdür Yardımcısı Konuları
- **Kanunlar:**
  - 2644 Sayılı Tapu Kanunu
  - 2942 Sayılı Kamulaştırma Kanunu
  - 3402 Sayılı Kadastro Kanunu
  - 4721 Sayılı Türk Medeni Kanunu (İlgili Bölümler)
  - 6098 Sayılı Türk Borçlar Kanunu
  - 634 Sayılı Kat Mülkiyeti Kanunu
- **Tüzük ve Yönetmelikler:**
  - Tapu Müdürlüklerince Düzenlenen Resmî Senetlere İlişkin Usul ve Esaslar Hakkında Yönetmelik
  - Yetki Alanı Dışında Tarafların Farklı Birimlerde Bulunmaları Halinde Tapu İşlemleri Yapılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik
  - 17.08.2013 Tarihli Resmi Gazetede Yayımlanan Tapu Sicili Tüzüğü (37 ila 45. Maddeleri Hariç)
- **Genelgeler ve Duyurular:**
  - 1476 Sayılı "Devre Mülk Hakkı Hk."
  - 2006/3 (1619) Sayılı "5253 Sayılı Dernekler Kanunu"
  - 2008/9 (1659) Sayılı "5737 Sayılı Vakıflar Kanunu" ve 2008/17 (1667) Sayılı Eki
  - 2009/6 (1677) Sayılı "Paylı Mülkiyete Göre İşlemler"
  - 2010/12 (1705) Sayılı "Üst Hakkı"
  - 2010/7 (1700) Sayılı "Vekâletname"
  - 2012/12 (1734) Sayılı "Yabancı Uyruklu Gerçek Kişilerin Taşınmaz Edinimi"
  - 2012/6 (1728) Sayılı "659 Sayılı KHK'nın Uygulanması Hk."
  - 2013/1 (1738) Sayılı "Ret Kararları"
  - 2013/11 (1748) Sayılı "Kamu Kurum ve Kuruluşlarına Ait Yerlerin İdari Yoldan Tescili"
  - 2013/13 (1750) Sayılı "Yabancılara İlişkin Tapu İşlemlerinde Kimlik Tespiti"
  - 2013/9 (1746) Sayılı "Veraset ve İntikal İlişiği"
  - 2014/4 (1756) Sayılı "Aile Konutu-Mal Rejimleri-Çocuk Malları"
  - 2014/7 (1759) Sayılı "Tapu Kaydında Düzeltim Davaları"
  - 2015/4 (1766) Sayılı "Haciz İşlemleri, Şerh ve Beyan Belirtmeleri"
  - 2015/5 (1767) Sayılı "Yurt Dışında Düzenlenmiş Vekaletnameler"
  - 2016/2 (1770) Sayılı "Tapu Sicilinde Düzeltmelere İlişkin Usul ve Esaslar"
  - 2018/1 (1780) Sayılı "Yetki Alanı Dışı Tapu İşlemleri"
  - 2018/3 (1782) Sayılı "Ormanların Kadastrosu ve Tescili"
  - 2019/12 (1806) Sayılı "Arşiv Hizmetleri"
  - 2019/14 (1808) Sayılı "Hatalı Blok ve Bağımsız Bölüm Numarası Düzeltme İşlemleri"
  - 2019/8 (1802) Sayılı "2863 Sayılı Kanun Uygulamaları"
  - 2020/4 (1904) Sayılı "Tüzel Kişilerde Temsil ve Yetki Belgesi"
  - 2021/2 (1907) Sayılı "Resen Cins Değişikliği"
  - 2021/4 Sayılı "Kat İrtifakı ve Kat Mülkiyeti"
  - 2021/5 (1910) Sayılı "Yabancı Gerçek Kişilere Yönelik Düzeltme (Tashih) İşlemleri"
  - 2022/3 Sayılı "Ölünceye Kadar Bakma Sözleşmesi ve Miras Hukuku Uygulamaları"
  - 2022/4 Sayılı "Tapu Müdürlüğü İş Akışı ve Yetki Devri"
  - 2022/5 Sayılı "6102 Sayılı Türk Ticaret Kanunu"
  - 2024/1 Sayılı "6306 Sayılı Kanun Uygulamaları"
  - 2024/2 Sayılı "Yabancıların Taşınmaz Edinimlerinde Değerleme Raporları"
  - 2024/3 Sayılı "Kamulaştırma Uygulamaları"
  - 2024/5 Sayılı "Tapu Sicilinde Arabuluculuk Uygulamaları"
  - 2024/6 Sayılı "Yararlanma, Kullanma ve Yönetim Anlaşmalarının Şerhi"
  - Diğer İlgili Genel Duyurular (Resen Terkin, 5403 Sayılı Kanun, TOKİ, Finansal Kiralama, Hisse Hataları, Süreli İpotek, İhtiyati Tedbir)

## BÖLÜM 3: ÜNVAN DEĞİŞİKLİĞİ ALAN KONULARI ##

### 3.1. Avukat Konuları
- 659 Sayılı KHK (Hukuk Hizmetlerinin Yürütülmesi)
- 6325 Sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu
- Anayasa Hukuku
- Borçlar Hukuku
- Ceza Hukuku
- İcra ve İflas Hukuku
- İdare ve İdari Yargılama Hukuku
- Medeni Hukuk
- Medenî Usul Hukuku

### 3.2. Mühendis (Harita ve Kontrol) Konuları
- **Kanunlar:**
  - 2942 Sayılı Kamulaştırma Kanunu
  - 3194 Sayılı İmar Kanunu
  - 3402 Sayılı Kadastro Kanunu
  - 4342 Sayılı Mera Kanunu
  - 4721 Sayılı Türk Medeni Kanunu (İlgili Bölümler)
  - 6831 Sayılı Orman Kanunu
- **Yönetmelikler:**
  - Arazi Toplulaştırması ve Tarla İçi Geliştirme Hizmetleri Uygulama Yönetmeliği
  - Büyük Ölçekli Harita ve Harita Bilgileri Üretim Yönetmeliği
  - Davalı Taşınmaz Mal Tutanaklarının Kadastro Mahkemesine Devri Hakkında Yönetmelik
  - Kadastro Bilirkişileri Hakkında Yönetmelik
  - Kadastro Çalışma Alanlarının Belirlenmesi Hakkında Yönetmelik
  - Kadastro Çalışmalarında Taksim Sebebiyle Ayırma ve Birleştirmeler Hakkında Yönetmelik
  - Kadastro Haritalarının Sayısallaştırılması Hakkında Yönetmelik
  - Mekânsal Planlar Yapım Yönetmeliği
  - Tapu Planlarında Yanılma Sınırının Belirlenmesi Hakkında Yönetmelik
  - Taşınmaz Malların Sınırlandırma, Tespit Ve Kontrol İşleri Hakkındaki Yönetmelik
- **Genelgeler ve Talimatlar:**
  - 2004/16 (1587) Sayılı "Mera Kanunu Değişikliği"
  - 2010/11 (1704) Sayılı "Kadastral Harita Üretimi ve Kontrolü"
  - 2012/5 (1727) Sayılı "3402 Sayılı Kanun Kapsamında 2/B Alanlarında Yapılacak Uygulama"
  - 2013/11 (1748) Sayılı "Kamu Kurum ve Kuruluşlarına Ait Yerlerin İdari Yoldan Tescili"
  - 2013/12 (1749) Sayılı “Cins Değişikliği (2/B)”
  - 2013/4 (1741) Sayılı "Bilgilendirme İlanı"
  - 2018/3 (1782) Sayılı "Ormanların Kadastrosu ve Tescili"
  - 2018/11 (1790) Sayılı "İhaleli İşler Denetim ve Kontrol Standartları"
  - 2018/13 (1792) Sayılı "Kadastro Güncelleme Çalışmaları"
  - 2019/8 (1802) Sayılı "2863 Sayılı Kanun Uygulamaları"
  - 2022/7 Sayılı "Teknik Hatalar Düzeltme"
  - 2023/2 Sayılı "İyileştirme Dönüşüm ve Sayısallaştırma Çalışmaları"
  - 2023/5 Sayılı "Talebe Bağlı İşlemlerin Yapımı ve Kontrolü"
  - 2025/1 Sayılı "Kadastro Müdürlükleri Yönetim Standartları"
  - 2025/4 Sayılı "Tescile Konu Harita ve Planların Yapımı ve Kontrolü"
  - 19.11.2014 Tarihli "5403 Sayılı Kanun Uygulamaları" Talimatı
  - 01.10.2020 Tarihli E-Kadastro Projesi Talimatı

### 3.3. Gıda Mühendisi Konuları
- Gıda Maddelerinin Bileşimi
- Gıda Teknolojisinde Temel İşlemler
- Muhafaza Prosesleri
- Konserve Teknolojisi
- Şeker Teknolojisi
- Bitkisel Yağ Teknolojisi
- Hububat Teknolojisi
- Gıdalarda Kalite Kontrol
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

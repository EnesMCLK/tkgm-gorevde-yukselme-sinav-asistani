import React, { useState, useCallback, useRef, useEffect } from 'react';
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

const licenseText = `Copyright (c) 2024 TKGM Görevde Yükselme Sınav Asistanı Geliştiricileri

TÜM HAKLARI SAKLIDIR.

İşbu yazılım ("Yazılım") ve beraberindeki tüm belgeler, tescilli ve gizli mülktür.

Bu Yazılımın sahibinin veya yetkili temsilcisinin önceden yazılı izni olmaksızın, bu Yazılımın hiçbir bölümü, herhangi bir biçimde veya herhangi bir yolla (elektronik, mekanik, fotokopi, kayıt veya başka bir şekilde) çoğaltılamaz, dağıtılamaz, iletilemez, kaynak koda dönüştürülemez, tersine mühendislik işlemine tabi tutulamaz, parçalara ayrılamaz veya değiştirilemez.

Bu Yazılım "OLDUĞU GİBİ" sağlanmaktadır ve yasaların izin verdiği azami ölçüde, Yazılımın sahibi, satılabilirlik, belirli bir amaca uygunluk ve ihlal etmeme garantileri de dahil olmak üzere, açık veya zımni hiçbir garanti vermemektedir.

Yazılımın sahibi, hiçbir durumda, bu Yazılımın kullanımından veya kullanılamamasından kaynaklanan (kâr kaybı, iş kesintisi, bilgi kaybı veya diğer maddi kayıplar dahil ancak bunlarla sınırlı olmamak üzere) doğrudan, dolaylı, arızi, özel, örnek veya sonuç olarak ortaya çıkan zararlardan, bu tür zararların olasılığı bildirilmiş olsa bile, sorumlu tutulamaz.
`;

const LicenseModal: React.FC<{ onClose: () => void; content: string }> = ({ onClose, content }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
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
        <main className="p-6 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans">{content}</pre>
        </main>
        <footer className="p-4 bg-slate-50 border-t text-right rounded-b-lg">
           <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
             Kapat
           </button>
        </footer>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ file: File; base64: string; mimeType: string; } | null>(null);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [updateNotification, setUpdateNotification] = useState<string>('');
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isLicenseVisible, setIsLicenseVisible] = useState<boolean>(false);
  
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'preview') {
      setIsPreview(true);
    }
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) { // 16MB limit
        setError("Dosya boyutu 16MB'den büyük olamaz.");
        return;
      }
      try {
        setError(null);
        const base64 = await fileToBase64(file);
        setImage({
          file: file,
          base64: base64,
          mimeType: file.type,
        });
      } catch (err) {
        setError("Görsel işlenirken bir hata oluştu.");
        console.error(err);
      }
    }
  };

  const clearImage = () => {
    setImage(null);
    if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isPreview) {
      setError('Lütfen sorunuzu girin.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnswer('');
    setUpdateNotification('');

    try {
      const imagePayload = image ? { data: image.base64, mimeType: image.mimeType } : undefined;
      const result = await getAnswerFromNotes(notes, question, imagePayload);
      
      setAnswer(result.answer);

      if (result.newNoteContent && result.newNoteContent.trim() !== '') {
        const categories = [
          "## BÖLÜM 1: ORTAK KONULAR (TÜM ADAYLAR İÇİN) ##",
          "### 2.1. Tapu Müdürü ve Tapu Sicil Müdür Yardımcısı Konuları",
          "### 3.1. Avukat Konuları",
          "### 3.2. Mühendis (Harita ve Kontrol) Konuları",
          "### 3.3. Gıda Mühendisi Konuları"
        ];
        
        const category = await categorizeUpdate(question, categories);
        const newContent = `\n- **GÜNCELLEME (${new Date().toLocaleDateString('tr-TR')}):** ${result.newNoteContent.trim().replace(/\n/g, '\n  ')}`;

        setNotes(prevNotes => {
          const categoryIndex = prevNotes.indexOf(category);
          if (categoryIndex === -1) {
            // Kategori bulunamazsa, esnek bir geri dönüşüm olarak sona ekle
            return `${prevNotes}\n\n---\n## KATEGORİZE EDİLEMEMİŞ GÜNCELLEME: ${new Date().toLocaleString('tr-TR')} ##\n${result.newNoteContent}`;
          }

          // Bir sonraki bölüm başlığını bulmak için başlangıç noktasını ayarla
          const searchStartIndex = categoryIndex + category.length;
          const nextSectionRegex = /\n(##|###)\s/g;
          nextSectionRegex.lastIndex = searchStartIndex;
          const match = nextSectionRegex.exec(prevNotes);

          if (match) {
            // Sonraki bölüm bulundu, hemen öncesine ekle
            const insertionIndex = match.index;
            return prevNotes.slice(0, insertionIndex).trimEnd() + '\n' + newContent + '\n\n' + prevNotes.slice(insertionIndex);
          } else {
            // Bu son bölümdü, sonuna ekle
            return prevNotes.trimEnd() + '\n' + newContent;
          }
        });
        
        const categoryName = category.replace(/#+\s/,'').replace(/ \(.+\)/, '').split(' Konuları')[0];
        setUpdateNotification(`Bilgi tabanı "${categoryName}" bölümünde güncellendi!`);
        setTimeout(() => setUpdateNotification(''), 7000);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
      setError(`Cevap alınırken bir hata oluştu: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [question, image, notes, isPreview]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <Header />
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-xl shadow-lg space-y-8">
          
          {isPreview && (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md mb-6" role="alert">
              <p className="font-bold">Önizleme Modu</p>
              <p>Bu, uygulamanın etkileşimli olmayan bir önizlemesidir. Soru sorma ve dosya yükleme özellikleri bu modda devre dışı bırakılmıştır.</p>
            </div>
          )}

          {/* Question Section */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="question" className="block text-lg font-semibold text-slate-700 mb-2">
                Sorunuzu Sorun
              </label>
              <p className="text-sm text-slate-500 mb-3">
                'TKGM Görevde Yükselme ve Unvan Değişikliği Sınavı' için tüm unvanlara ait resmi sınav konuları sisteme yüklenmiştir. Sorunuzu aşağıya yazabilir, isterseniz bir fotoğraf ekleyebilirsiniz.
              </p>
              <div className="space-y-4">
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={isPreview ? "Soru sorma bu modda devre dışıdır." : "Örn: 3402 Sayılı Kanun'a göre kadastro komisyonu kimlerden oluşur?"}
                  className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-slate-800 bg-slate-50 disabled:bg-slate-200 disabled:cursor-not-allowed"
                  disabled={isLoading || isPreview}
                  rows={3}
                />
                
                {image && (
                  <div className="relative inline-block">
                      <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Seçilen önizleme" className="h-32 w-auto rounded-lg shadow-md" />
                      <button 
                          type="button"
                          onClick={clearImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          aria-label="Fotoğrafı kaldır"
                          disabled={isPreview}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                    <input 
                        type="file"
                        ref={imageFileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                        disabled={isPreview}
                    />
                    <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        disabled={isLoading || isPreview}
                        className="inline-flex items-center justify-center px-4 py-3 border border-slate-300 text-base font-medium rounded-lg shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                        {image ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !question.trim() || isPreview}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Lütfen Bekleyin...' : 'Soruyu Cevapla'}
                    </button>
                </div>
              </div>
            </div>
          </form>

          {/* Answer Section */}
          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-3">
              Yapay Zeka Cevabı
            </h2>
            <div className="min-h-[10rem] p-6 bg-slate-50 border border-slate-200 rounded-lg">
              {error && <p className="text-red-600 font-medium">{error}</p>}
              {isLoading && <Spinner />}
              {answer && !isLoading && (
                <div 
                    className="prose prose-slate max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: marked(answer) as string }}
                >
                </div>
              )}
              {!answer && !isLoading && !error && (
                <p className="text-slate-500">
                  {isPreview 
                    ? 'Bu alanda yapay zeka tarafından üretilen cevaplar gösterilir. Bu bir önizleme olduğu için soru soramazsınız.' 
                    : 'Cevabınız burada görünecektir.'}
                </p>
              )}
            </div>
            {updateNotification && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-sm transition-opacity duration-500 animate-pulse">
                    {updateNotification}
                </div>
            )}
          </div>
        </div>
        <footer className="text-center mt-8 text-sm text-slate-500 space-y-2">
          <p>Bu araç, Gemini API kullanılarak oluşturulmuştur. Cevapların doğruluğu sağlanan notlara ve referans gösterilen mevzuatlara bağlıdır.</p>
           <p>
            <button
              onClick={() => setIsLicenseVisible(true)}
              className="underline hover:text-blue-700 transition-colors"
            >
              Telif Hakkı & Lisans
            </button>
          </p>
        </footer>
      </main>
      {isLicenseVisible && <LicenseModal onClose={() => setIsLicenseVisible(false)} content={licenseText} />}
    </div>
  );
};

export default App;
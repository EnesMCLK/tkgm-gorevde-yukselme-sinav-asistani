TKGM Görevde Yükselme Sınav Asistanı <img src="./logo.svg" alt="TKGM Sınav Asistanı Logosu" style="width:24px; height:24px; vertical-align: middle;">
======

Bu proje, **Tapu ve Kadastro Genel Müdürlüğü (TKGM)** personelinin **Görevde Yükselme ve Unvan Değişikliği Sınavı**'na hazırlanmalarına yardımcı olmak amacıyla geliştirilmiş, yapay zeka tabanlı bir bilgi asistanıdır. Asistan, sınav kapsamında yer alan karmaşık ve sürekli güncellenen Türk mevzuatını anlama, yorumlama ve en doğru bilgiyi sunma üzerine tasarlanmıştır.

## 🎯 Projenin Amacı

TKGM'nin görevde yükselme sınavları, Anayasa'dan kanunlara, yönetmeliklerden genelgelere kadar geniş bir mevzuat yelpazesini kapsar. Bu mevzuatın takibi ve normlar hiyerarşisine uygun olarak yorumlanması, adaylar için en büyük zorluklardan biridir. Bu asistan, aşağıdaki sorunlara çözüm olmayı hedefler:

* **Bilgi Kirliliği:** İnternetteki güncel olmayan veya yanlış bilgilere erişimi engellemek.
* **Karmaşık Mevzuat Dili:** Hukuki metinleri daha anlaşılır bir dille açıklamak.
* **Normlar Hiyerarşisi:** Birbiriyle çelişen düzenlemeler olduğunda, hangi kuralın geçerli olduğunu hiyerarşiye göre belirlemek.
* **Zaman Yönetimi:** Adayların doğru bilgiye hızlı ve güvenilir bir şekilde ulaşmasını sağlamak.

## ✨ Temel Özellikler

* **🧠 Mevzuat Uzmanlığı:** Asistan, 657 Sayılı DMK, 3402 Sayılı Kadastro Kanunu, Medeni Kanun gibi temel kanunların yanı sıra TKGM'nin kendi yönetmelik ve genelgeleri konusunda derin bir bilgiye sahiptir.
* **⚖️ Normlar Hiyerarşisi Prensibi:** Asistan, bir soruya cevap verirken daima en üstün hukuki normu (Anayasa > Kanun > Cumhurbaşkanlığı Kararnamesi > Yönetmelik > Genelge) esas alır.
* **🔄 Güncellik Kontrolü:** Tüm bilgileri **T.C. Mevzuat Bilgi Sistemi (mevzuat.gov.tr)** gibi resmi kaynaklardan teyit ederek en güncel durumu yansıtır.
* **💡 Analitik Cevaplama:** Sadece bilgiyi aktarmakla kalmaz, farklı mevzuat maddeleri arasındaki bağlantıları kurarak analitik ve gerekçeli cevaplar üretir.
* **📚 Kaynak Gösterme:** Verilen her bilginin dayandığı kanun, yönetmelik veya genelge maddesini açıkça belirterek güvenilirlik sağlar.

## 🏛️ Çalışma Mimarisi ve Temel Prensibi

Asistan, kendisine yöneltilen bir soruyu cevaplarken aşağıda belirtilen titiz ve sistematik süreci izler:

1.  **Öncelikli Kaynağı Tespit Etme:**
    * Eğer soruda belirli bir kanun veya düzenleme belirtilmişse (örn: "3402 Sayılı Kanun'a göre..."), asistan doğrudan o metni analiz eder.
    * Belirtilmemişse, ilgili tüm mevzuatı tarar.

2.  **Bilgiyi Doğrulama ve Hiyerarşik Kontrol (Yukarıdan Aşağıya):**
    * **Anayasa**
    * **Kanunlar**
    * **Cumhurbaşkanlığı Kararnameleri**
    * **Yönetmelikler**
    * **Adsız Düzenleyici İşlemler (Genelge, Talimat vb.)**

3.  **Çelişki Yönetimi:**
    * Eğer bir genelge ile bir kanun maddesi arasında çelişki tespit ederse, istisnasız olarak **kanun hükmünü** esas alır ve bu durumu cevabında belirtir.

4.  **Sentez ve Cevap Oluşturma:**
    * Doğrulanmış ve hiyerarşik olarak en üstün olan bilgiyi temel alarak, soruyu net, anlaşılır ve gerekçeli bir şekilde yanıtlar.

> **Örnek Mantık:** *Eğer bir Genelge'de belirtilen bir uygulama, daha sonra çıkan bir Kanun ile değiştirilmişse, asistan kesinlikle güncel olan Kanun'u referans alır ve Genelge'nin o hükmünün artık geçersiz olduğunu vurgular.*

## 🚀 Yerel Olarak Çalıştırma

**Ön Gereksinimler:** [Node.js](https://nodejs.org/) (versiyon 18 veya üstü) yüklü olmalıdır.

1.  **Gerekli paketleri yükleyin:**
    ```bash
    npm install
    ```

2.  Proje ana dizininde `.env.local` adında bir dosya oluşturun ve içerisine kendi Google AI Studio API anahtarınızı aşağıdaki gibi ekleyin:
    ```
    GEMINI_API_KEY=SIZIN_API_ANAHTARINIZ
    ```

3.  **Uygulamayı geliştirme modunda çalıştırın:**
    ```bash
    npm run dev
    ```
    Tarayıcınızda `http://localhost:3000` adresini açarak uygulamaya erişebilirsiniz.

## 💻 Kullanılan Teknolojiler

* **Dil Modeli:** Google Gemini
* **Framework:** Next.js
* **Veri Kaynakları:** T.C. Mevzuat Bilgi Sistemi, TKGM Mevzuat Portalı ve ilgili resmi kaynaklar.

## ✍️ Katkıda Bulunma

Bu proje, TKGM personeli için değerli bir kaynak olma potansiyeline sahiptir. Katkılarınızla daha da gelişebilir.

1.  Bu repoyu **fork'layın**.
2.  Yeni bir **branch** oluşturun (`git checkout -b ozellik/yeni-mevzuat-ekle`).
3.  Değişikliklerinizi yapın ve **commit'leyin** (`git commit -m 'Yeni özellik eklendi'`).
4.  Branch'inizi **push'layın** (`git push origin ozellik/yeni-mevzuat-ekle`).
5.  Bir **Pull Request** açın.

Hata bildirimleri ve özellik talepleri için lütfen GitHub **Issues** bölümünü kullanın.

----

## Yasal Uyarı ve Sorumluluk Reddi

Bu belge, projenin kullanımıyla ilgili önemli yasal bilgilendirmeleri ve sorumluluk sınırlarını içerir.

> ### ⚖️ Kaynak İçerik: Telif Hakkı ve Fikri Mülkiyet

>> Bu yapay zeka asistanının dayandığı orijinal metin içeriğinin (yasa maddeleri, yönetmelikler, tebliğler ve diğer kaynak dokümanlar) **telif hakkı**, ilgili kanunları hazırlayan kişi ve kurumlara aittir.

> ### 💻 Yazılım Bilgisi ve Sorumluluk Reddi

>> Yapay Zeka Asistanının kullanım hakları ve telifleri, **Google LLC'nin** kullanım politikaları tarafından korunmaktadır ve bu politikalara tabidir.

>> Bu yazılımın geliştiricisi, yazılımın kullanımından veya kullanılamamasından kaynaklanan (kâr kaybı, iş kesintisi, bilgi kaybı veya diğer maddi kayıplar dahil ancak bunlarla sınırlı olmamak üzere) doğrudan, dolaylı, arızi, özel, örnek veya sonuç olarak ortaya çıkan zararlardan, bu tür zararların olasılığı bildirilmiş olsa bile, **sorumlu tutulamaz**.

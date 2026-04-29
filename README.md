# Engine-Indicating and Crew-Alerting System (EICAS) Primary Parameters Display Simülasyonu

Bu uygulama, Boeing 737-600 ve Boeing 737-700 modellerinde kullanılan EICAS Primary Parameters Display baz alınarak yapılmıştır.

---

## Kurulum ve Çalıştırma
Uygulama web tabanlı olması dolayısıyla herhangi bir derleme aracı veya sunucu tarafı bir dil gerektirmez. Projeyi bilgisayarınıza indirdikten veya klonladıktan sonra `index.html` dosyasını modern bir web tarayıcısında (Firefox, Chrome, Safari, Edge vb.) açmanız yeterlidir.

---

## Kullanım
Uygulama çalıştırıldığında kullanıcıyı ekranın solunda orijinal göstergenin birebir uyarlaması ve ekranın sağında ise bu göstergeyi kontrol etmek için kullanılacak kontrol paneli karşılamaktadır. Soldaki göstergede gösterilecek değerler sağdaki kontrol paneline bağlıdır.

Kontrol paneli, kullanımı kolaylaştırmak ve görsel düzeni sağlamak için küçük alt panellere ayrılmıştır.

>### Motor ve Crew-Alert Kontrolleri
Panel simetrik olarak tasarlanmış olup, panelin sağ ve sol tarafında her bir motor için Crew-Alert kontrolleri konumlandırılmıştır. Panelin ortasında ise sağ ve sol motor kontrolünü sağlayan slider'lar bulunmaktadır. Kontrollerin ve slider'ların işlevleri aşağıdaki gibidir:

**REV:** Thrust Reverser anahtarıdır. Etkinleştirildiğinde ilgili motorun dijital devir göstergesinin üzerinde yeşil renkte *REV* yazısı belirir. Devre dışı bırakıldığında ise yerini referans değere bırakır.

**ENG FAIL:** Etkinleştirildiğinde ilgili motorun devrini sıfıra indirir ve EGT kadranının içinde amber renkte *ENG FAIL* yazısı belirir. Devre dışı bırakıldığında ilgili motor devri eski durumuna döner.

**SVO:** İlgili motorun start valfinin açık olduğunu ve starter'a hava akışı olduğunu belirtir. Etkinleştirildiğinde amber renkli *START VALVE OPEN* Crew-Alert ışığı yanar ve ilgili motorun N2 devri ile EGT değeri bir miktar artar. Devre dışı bırakıldığında N2 devri ile EGT değeri eski durumunda döner.

**OFB:** Yaklaşan bir yağ filtresi bypass'ini belirtir. Etkinleştirildiğinde ilgili motorun amber renkli *OIL FILTER BYPASS* Crew-Alert ışığı yanar, OIL PRESS değeri bir miktar düşer ve OIL TEMP değeri bir miktar yükselir. Devre dışı bırakıldığında OIL PRESS ve OIL TEMP değerleri eski durumuna döner.

**LOP:** Yağ basıncının düştüğünü belirtir. Etkinleştirildiğinde ilgili motorun OIL PRESS değeri 12 psi'a kadar yavaşça düşer ve amber renkli *LOW OIL PRESSURE* Crew-Alert ışığı yanıp sönmeye başlar. 10 saniye içinde durum düzelmezse ışık sabit olarak yanmaya devam eder. Durum düzelirse ışık söner. Devre dışı bırakıldığında OIL PRESS değeri eski durumuna döner.

**THRUST:** Gaz kollarının komutlara yanıt vermediğini belirtir. Etkinleştirildiğinde ilgili motorun amber renkli *THRUST* Crew-Alert ışığı yanar ve slider'lar kullanıcı girdisi almayı bırakarak son değerinde sabit kalır. Devre dışı bırakıldığında slider tekrar kullanıcı girdisi almaya başlar.

**LOW FUEL:** İlgili motor tarafındaki kanat tankının yakıt değerini 1500'e düşürerek amber renkli *LOW FUEL* Crew-Alert ışığının yanmasına sebep olur.

**SLIDER'LAR:** Sol tarafta yer alan slider sol motor devrini, sağ tarafta yer alan slider ise sağ motor devrini kontrol eder. Slider'ların altında manuel değer girdisi için bir metin kutusu bulunur. Metin kutusuna 0 ve 105 arasında, tek ondalık basamak çözünürlüğe sahip değerler girilebilir.

>### Referans ve Sıcaklık Kontrolleri
Panelde üst üste yerleştirilmiş iki slider yer almaktadır. Bu panelden N1 referans değeri ve seçilmiş sıcaklık değerinin kontrolü sağlanır.

N1 referans değeri slider'ının sağında manuel değer girdisi için bir metin kutusu bulunur. Bu metin kutusuna 0 ve 105 arasında, tek ondalık basamak çözünürlüğe sahip değerler girilebilir.

Seçilmiş sıcaklık değeri slider'ı ise 0C ve 70C arasında bir değer girilmesine olanak sağlar. Slider'ın sağında santigrat ve fahrenheit birimleri arasında dönüşüm sağlayan bir anahtar bulunmaktadır.

>### Sistem Çarpanları
Panelde üst üste yerleştirilmiş iki slider ile her bir slider'ın yanına yerleştirilmiş birer metin kutusu yer almaktadır.

**Yakıt Oranı:** Bu slider ile yakıtın azalma hızını ayarlayan çarpanın değeri değiştirilebilir. 0.1 ve 10.0 arasında değerler alabilir. Varsayılan değeri 1.0'dır.

**Atalet:** Bu slider ile göstergelerdeki değerlerin ayarlanan değerlere ne kadar hızlı yaklaşacaklarını belirleyen atalet çarpanının değeri değiştirilebilir. 0.1 ve 5.0 arasında değerler alabilir. Varsayılan değeri 1.0'dır.

>### Uçuş Modları
Panelde dokuz farklı uçuş modu anahtarı 3x3'lük bir ızgaraya yerleştirilmiş ve bu ızgaranın altına seçilen modu temizlemek için bir temizleme butonu yerleştirilmiştir. Bu mod gösterimleri yalnızca görsel olup ekrandaki değerlere herhangi bir etkileri bulunmamaktadır. Uçuş senaryolarında uçağın durumunu belirtmek için kullanılmışlardır. Ekranda görülen tüm modlar ve açıklamaları aşağıdaki gibidir:

| MOD | AÇILIMI | İŞLEVİ |
|:---:|:---:|---|
| R-TO | Reduced Take-Off | Uçuş Yönetim Bilgisayarı (FMC) üzerinden girilen varsayılan sıcaklık değeriyle hesaplanmış düşürülmüş kalkış itki limitinin (Reduced Take-Off) aktif olduğunu belirtir. |
|R-CRZ|Reduced Cruise|Uçuşun seyir aşamasında motor ömrünü korumak ve termal stresi azaltmak amacıyla uygulanan kısıtlı seyir itki limitinin (Reduced Cruise) devrede olduğunu ifade eder.|
|TO|Take-Off|Kalkış operasyonu için sistem tarafından hesaplanan standart maksimum itki limitinin (Take-Off) kullanımda olduğunu gösterir.|
|CRZ|Cruise|Uçağın tırmanışı tamamlayıp düz uçuşa geçtiği seyir safhası için belirlenen standart itki limitinin (Cruise) aktifleştiğini belirtir.|
|CLB|Climb|Uçağın kalkış sonrası hedeflenen irtifaya ulaştığı tırmanma safhası için hesaplanan itki limitinin (Climb) devrede olduğunu gösterir.|
|G/A|Go-Around|İnişten vazgeçilip pas geçilmesi durumunda ihtiyaç duyulan acil durum maksimum itki limitinin (Go-Around) aktif olduğunu ifade eder.|
|CON|Continuous|Bir motorun devre dışı kalması gibi durumlarda, uçağın diğer motor ile hasar görmeden sürekli olarak uçabileceği maksimum itki limitini (Continuous) belirtir.|
|- - -||FMC tarafından belirlenen aktif bir itki limit modunun devrede olmadığını ve itki referansının kaldırıldığını gösterir.|
|A/T LIM|Autothrottle Limit|Otomatik Gaz (Autothrottle) sisteminin motorları korumak amacıyla devreye girdiğini ve FMC tarafından belirlenen itki limitlerinin aşılmasını engellemek için devri sınırlandırdığını belirtir.|

>### Sistem Uyarıları
**CROSSBLEED (XB):** Pnömatik sistemin sağ ve sol kanallarını birleştiren izolasyon valfinin açık olduğunu belirtir. Etkinleştirildiğinde EGT değeri bir miktar yükselir.

**LOW QTY (LO):** Motor yağı rezervuarındaki sıvı miktarının operasyonel sınırların altına düştüğünü belirtir. Etkinleştirildiğinde OIL QTY ve buna bağlı olarak OIL PRESS değeri yavaşça düşerken OIL TEMP değeri yavaşça yükselir.

>### Birim Dönüşümü
Yakıt ölçü birimini LB ve KG arasında değiştirmek için bir anahtar ihtiva eder.

>### Uçuş Senaryoları
JS kodunda yazılarak belirlenmiş bir senaryoya göre motor devri, uçuş modu seçimi, arıza durumu gibi durumları otomatik olarak oynatan bir sistemdir. Seçilen senaryo oynatılırken pencerenin etrafında glow efekti oluşur ve istendiğinde senaryoyu durdurmak için bir DURDUR butonu belirir. Halihazırda iki adet senaryo bulunmaktadır. Bu senaryolar ve açıklamaları aşağıdaki gibidir:

**Normal Kalkış:** Motorların rölantiden stabilizasyon aşamasına, ardından TO modu ile maksimum kalkış gücüne ve sonrasında CLB modu ile tırmanma itkisine geçişini sırasıyla oynatan standart kalkış prosedürüdür.

**Motor Arızası:** Normal kalkış esnasında kritik bir hızda (V1) sağ motorda aniden ENG FAIL tetikleyen ve ardından uçağın uçuşa devam edebilmesi için sağlam kalan sol motoru CON moduna alan acil durum kalkış senaryosudur.

---

## Geliştirme Aşaması

Uygulama web tabanlı olarak geliştirilmiştir ve hem mobil hem de masaüstünde kullanılabilmektedir.

>### Gösterge ekranının çizimi

Flight Crew Operations Manual'in Engines, APU bölümünün Over/Under Displays kısmında yer alan görseller, bir PDF'den SVG'ye dönüştürücü script kullanılarak SVG formatında dosyadan ayıklanmıştır.

Ayıklanan bu SVG uzantılı dosyalar üzerindeki işlemler Inkscape isimli vektör çizim uygulaması kullanılarak yapılmıştır. 

Sayfalardaki yazılar, ok işaretleri, sayfa numaraları ve diğer gereksiz öğeler silinerek yalnızca istenen gösterge çizimleri bırakılmıştır. Bu çizimler tek parça halinde yollar ve düğümler şeklinde olmayıp, onlarca farklı yol ve düğümün birleşiminden oluştuğu için öylece kullanılabilir durumda değildir. 

Öncelikle çizimler bir maske katmanı haline getirilmiştir. Ardından bunun üzerine eklenen boş bir katman üzerinde manuel olarak temiz ve tek parça görüntüler halinde yeniden çizilmiştir. Göstergede kontrolü sağlanacak tüm gruplar ve yollara birer ID atanmıştır. 

>### Çizimin HTML koduna entegre edilmesi

SVG formatı, XML tabanlı bir vektörel grafik biçimidir. Aslında ekranda çizilen her şey bir XML işaretleme dilinde koordinatlar ve bunları etiketleyen ID'ler dizisi olarak tutulur. SVG'nin bu özelliği kullanılarak statik çizimlerden dinamik arayüzler oluşturulabilir. Biz de tam olarak SVG'nin bu özelliğinden faydalandık.

Çizdiğimiz SVG formatındaki gösterge ekranının XML kodlarını HTML koduna "Inline SVG" olarak eklemek suretiyle ilk adımı tamamlamış olduk.

    <div  class="eicas-display">
    	<svg>SVG içindeki XML kodları</svg>
    </div>


Çizimlere [UI](https://github.com/acrilot/EICAS_Uygulama/tree/main/UI) klasöründen erişilebilir. Klasördeki iki dosya da birebir aynı çizimi barındırmaktadır. INKSCAPE_UI.svg isimli dosyadaki çizimin XML kodlarında Inkscape'in kendi çalışma alanı verilerini depolayan özel XML ad alanları (katman  yapıları, kılavuz çizgileri, grid ayarları, canlı yol efektleri ve son çalışılan pencere konumu gibi düzenleyiciye özgü bilgiler) yer alırken PLAIN_UI.svg isimli dosyadaki çizimin XML kodlarında bunların hiçbiri yer almadığı için çok daha kısa ve sade bir koda sahiptir. Inline SVG'de de PLAIN_UI.svg içerisindeki kodlar kullanılmıştır. 

>### Kontrol paneli

HTML kodunun Inline SVG'den sonraki kısmında kontrol paneli kodları yer almaktadır. Motor kontrolleri, uçuş modları, referans değerler ve sistem çarpanları gibi çeşitli kontrollerin arayüze eklenmesi ve JavaScript kodu ile bağlantısı burada yapılmıştır.

>### Stiller

Arayüz öğelerinin yerleşimi, font, renkler, animasyonlar gibi sayfanın görsel yanını düzenleyen kodlar style.css dosyasında yer almaktadır.

>### Mantık

Arayüz öğelerine işlevlerini kazandıran kodlar script.js dosyasında yer almaktadır.

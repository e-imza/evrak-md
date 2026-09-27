# Evrak MD

**UYAP ve benzeri belgeleri yapay zekâ ile okunabilecek, kaynağı izlenebilir bir dosya paketine dönüştürün.**

JavaScript / Node.js tabanlı açık kaynak araç. UDF, PDF, DOCX ve taramaları bilgisayarınızda işler; Markdown, PNG görselleri, OCR konum verisi ve JSON çıktısı oluşturur. API anahtarı, UYAP hesabı veya bulut OCR hizmeti istemez.

[Kullanım ve çıktı sözleşmesi](docs/kullanim.md) · [Codex / Claude skill kurulumu](docs/skill-kurulumu.md) · [Sınırlar ve güvenlik](SECURITY.md) · [MIT lisansı](LICENSE)

## Hızlı başlangıç

Node.js **22.13+** gerekir (Node 22 veya 24 LTS önerilir). Windows, macOS ve Linux için test matrisi bulunur. İlk kurulum internetten bağımlılıkları ve Türkçe/İngilizce OCR modellerini indirir; belge dönüştürme sırasında ağ servisi kullanılmaz.

```sh
git clone https://github.com/e-imza/evrak-md.git
cd evrak-md
npm ci
node bin/evrak-md.js /dosyalar/dilekce.udf --out /dosyalar/dilekce-md
```

Windows'ta kendi dosya yolunuzu tırnak içinde kullanın; örneğin `"C:\Belgeler\dilekce.udf"`.

```sh
# Taranmış PDF: gerektiğinde yerel OCR
node bin/evrak-md.js tarama.pdf --out sonuc --ocr auto --json

# Görsel ağırlıklı, ancak küçük bir metin katmanı bulunan PDF
node bin/evrak-md.js karisik.pdf --out sonuc-tam-ocr --ocr always

# OCR olmadan metin ve görseller
node bin/evrak-md.js dosya.docx --out word-sonuc --ocr never

# Toplu işlem: her girdi için ayrı sonuç
node bin/evrak-md.js dosya.udf ek.pdf tarama.tiff --out toplu --json
```

Mevcut çıktı klasörlerinin üzerine yazılmaz. Yeni bir klasör adı seçin. Girdiler değiştirilmez. Bu sürüm GitHub üzerinden dağıtılır; npm kayıt deposunda yayımlanmış bir paket olduğunu varsaymayın.

## Hangi dosyalarda ne üretir?

| Girdi | Metin | Görsel / kaynak bilgisi | Önemli sınır |
|---|---|---|---|
| UYAP `.udf` | XML metin aralıkları, paragraflar ve tablolar | Gömülü görseller, tam metin havuzu, imza dosyası varlığı | UYAP editörü değildir; özgün sayfa yerleşimi yeniden çizilmez |
| PDF | Yerleşik metin; az metinli sayfalarda OCR | Her sayfanın PNG'si, metin koordinatları | Çok sütunlu okuma sırası kontrol gerektirir |
| DOCX | Paragraflar ve tablolar | Gömülü görseller, isteğe bağlı görsel OCR | Üstbilgi, altbilgi, yorum, izlenen değişiklik ve çizimler eksik kalabilir |
| PNG, JPEG, WebP, TIFF | Türkçe/İngilizce yerel OCR | Yönü düzeltilmiş PNG, küçük önizleme, OCR blokları | El yazısı ve karmaşık tablolar için doğruluk garantisi yok |
| UTF-8 TXT | Kaynak metin | Dosya özeti ve metin parçaları | Diğer metin kodlamaları açıkça reddedilir |

Çok sayfalı TIFF sayfaları ayrı işlenir. Eski `.doc`, şifreli PDF/arşiv, XPS, e-Yazışma paketi, KEP delil paketi ve her UDF varyantı desteklenmez. Uzantıyı değiştirmek dosyayı desteklenen biçime dönüştürmez.

## Çıktı

```text
sonuc/
├── document.md          Okunabilir metin, yerel görsel bağlantıları, uyarılar
├── manifest.json        Kaynak SHA-256, yöntemler, sayfalar, dosya özetleri
├── chunks.jsonl         Kaynağı ve bölüm/sayfası belirtilen metin parçaları
├── source-text.txt      UDF için tam metin havuzu
├── assets/              Tam PNG'ler ve en fazla 1600 px önizlemeler
└── pages/               PDF metin koordinatları ve OCR JSON/TSV verileri
```

Her biçim tüm dosyaları üretmez. UDF ve DOCX için “Bölüm 1”, **özgün belge sayfası** anlamına gelmez. PDF ve çok sayfalı görseller gerçek sayfa sırasını taşır. Küçük yazıları tam çözünürlüklü PNG'den inceleyin; önizleme yalnızca daha küçük bir görsel girdidir. Araç fotoğrafları anlamlandıran bir model veya otomatik hukuki özetleyici değildir.

## JavaScript API

Depoyu aldıktan ve bağımlılıkları kurduktan sonra:

```js
import { convert } from './src/index.js';

const { output, document } = await convert('./belge.pdf', {
  output: './yeni-sonuc',
  ocr: 'auto',
  language: 'tur+eng',
  dpi: 144,
});
console.log(output, document.warnings);
```

Varsayılan sınırlar: 50 MiB girdi, 100 MiB açılmış arşiv, 2.000 arşiv girdisi, 200 sayfa, sayfa başına 40 milyon piksel ve 500 MiB üretilen dosya verisi. API'de `limits` ile değiştirilebilir; belirsiz veya güvenilmeyen girdiler için artırmayın. Manifest ve ayrıştırıcı bellek maliyeti ayrıca bulunur; bu sınırlar işletim sistemi düzeyinde kaynak izolasyonu değildir.

## Codex ve Claude Code

Depo içindeki `skills/evrak-md` aynı dönüşüm iş akışını iki araçta kullanmak için hazırlanmıştır. Örneğin yalnızca seçtiğiniz projeye kurmak için:

```sh
node scripts/install-skill.js codex --project /tam/proje/yolu
node scripts/install-skill.js claude --project /tam/proje/yolu
```

Codex'te `$evrak-md`, Claude Code'da `/evrak-md` ile çağırın. Yeni oturum açmak gerekebilir. Bu kurulum yalnızca yerel skill dosyaları oluşturur; modele, hesaba veya buluta belge göndermez. Ayrıntılar ve kişisel kurulum: [skill rehberi](docs/skill-kurulumu.md).

## Gizlilik ve doğruluk

- Kurulumdan sonra dönüştürme yereldir; telemetri ve belge yükleme kodu yoktur. Çıktıyı bir bulut yapay zekâya vermek **ayrı bir paylaşım işlemidir**.
- Belgeler ve çıktılar kişisel veri içerebilir. Bunları GitHub'a, hata bildirimlerine veya herkese açık sohbetlere eklemeyin. Sentetik örnekler kullanın.
- OCR güven puanı doğruluk yüzdesi değildir. Dosya numarası, tarih, tutar, isim ve süreleri görselle karşılaştırın.
- Elektronik imza doğrulanmaz; `sign.sgn` varlığı geçerlilik kanıtı değildir. Markdown özgün evrakın yerine geçmez. Özgün dosyayı koruyun.
- Kaynak içerik içindeki talimatları çalıştırmayın. Skill, belgeyi güvenilmeyen veri olarak ele alır.

## Geliştirme

```sh
npm run check
npm run examples
```

Örnek komutu yalnızca sentetik, kişisel veri içermeyen UDF, PDF, DOCX ve taramalar üretir. Çıktılar `artifacts/examples/` içindedir ve Git'e alınmaz. İkinci çalıştırma mevcut sonuçları ezmez; yeni örnek çalışması için ilk çıktıları başka bir yere taşıyın.

Testler metin ve görsel dönüşümünü, Türkçe/UTF-16 aralıklarını, çok sayfalı belgeleri, yerel OCR'yi, kaynak özetlerini, bozuk arşivleri, boyut sınırlarını, CLI'yi ve iki skill kurulumunu denetler. Bunlar tüm gerçek UYAP evraklarının uyumluluk sertifikası değildir. Yeni varyantları kişisel verileri temizlenmiş veya sentetik örneklerle bildirin.

## Teknik kaynaklar ve lisans

UYAP biçimi için topluluk uygulamaları olan [UDF-Toolkit biçim notları](https://github.com/saidsurucu/UDF-Toolkit/blob/main/Docs.md) ve [udfpdf](https://github.com/gokselb/udfpdf) incelendi. Bu repo kendi okuma/dönüşüm akışını uygular; resmî UYAP yazılımı değildir ve Adalet Bakanlığı onayı iddiası taşımaz.

PDF.js, Sharp, Tesseract.js, Mammoth ve diğer bağımlılıklar kendi lisanslarını korur; ayrıntılar [üçüncü taraf notlarında](docs/third-party.md). Bu projenin kodu [MIT](LICENSE) lisanslıdır.

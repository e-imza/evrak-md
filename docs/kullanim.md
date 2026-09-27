# Kullanım ve çıktı sözleşmesi

## Doğru OCR kipini seçmek

`auto`: UDF/DOCX içindeki görseller ve bütün görsel girdileri OCR'den geçirir. PDF'de bir sayfanın yerleşik metni 40 boşluk dışı karakterden kısaysa OCR uygular. Bu bir sezgiseldir: metin katmanı olan sayfadaki bütün görsel yazıları tespit etmez. Gerekirse `always` kullanın ve sonucu görsellerle karşılaştırın.

`always`: PDF'de her sayfayı OCR'den geçirir. OCR boş sonuç verirse yerleşik PDF metni korunur. Yerleşik metnin tamamı ayrıca manifestte `nativeText` olarak tutulur.

`never`: OCR modeli başlatılmaz. PDF'nin yerleşik metni, UDF ve DOCX yapısı yine okunur. Görseli olan ancak metni çıkarılamayan sayfalarda uyarı verilir.

PDF çizimi `--dpi` ile 72–300 arası ayarlanır. 144 varsayılandır. Daha yüksek DPI küçük yazıları iyileştirebilir ancak bellek, süre ve dosya boyutunu artırır. Orijinal görseller küçültülmeden PNG'ye dönüştürülür; EXIF yönü uygulanır, beyaz zemin ve sRGB kullanılır, EXIF gibi yardımcı metaveriler çıktı görseline taşınmaz. Bu, belge içindeki kişisel verileri anonimleştirmez.

## Dosyalar

- `document.md`: kullanıcıya dönük ana çıktı; uyarılar, yöntem, OCR puanı ve yerel görsel adresleri.
- `manifest.json`: `schemaVersion: 1`. Kaynak adı, biçimi, bayt sayısı ve SHA-256; dönüştürücü sürümü; seçenekler; sayfalar; görsel listesi ve çıktı dosya özetleri. Manifest kendisini özetlemez. Özgün tam dosya yolu yazılmaz.
- `chunks.jsonl`: satır başına JSON. `id`, `sourceSha256`, `page`, `pagination`, `method`, `offset`, `image`, `text`. En fazla 2.000 JavaScript UTF-16 kod birimlik parçalar; model token sayısı veya anlamsal bölüm garantisi değildir. UDF/DOCX metni Markdown olabilir. Çok uzun bir sözcük veya tablo parça sınırında bölünebilir; gerekirse tam belgeye dönün.
- `source-text.txt`: UDF XML'indeki tam metin havuzu. Yapısal metinle farkları incelemek içindir; havuzdaki sıra her zaman ekrandaki okuma sırası değildir.
- `pages/page-N.text.json`: PDF metin parçaları ve özgün dönüşüm/koordinat verisi. PDF point sistemindedir; PNG piksel kutusu değildir.
- `pages/page-N.ocr.json`: OCR metni, güven puanı, bloklar ve sol üst köşeden başlayan normalize PNG piksel koordinatları.
- `pages/page-N.ocr.tsv`: başlıklı Tesseract TSV çıktısı; satır/kelime kutuları içerir. UDF/DOCX gömülü görsellerinin OCR verisi `assets/*.ocr.json` içindedir.

## Hatalar ve kısmi toplu sonuçlar

CLI başarıda 0, herhangi bir girdi başarısızsa 1 koduyla çıkar. `--json` ile her girdinin `status`, `output` veya `error` alanını okuyun. Başarılı diğer girdiler korunur. Tek belgenin dönüşümü başarısızsa yeni oluşturduğu çıktı klasörü kaldırılır; özgün belge değişmez. Program aniden öldürülürse geçici veya eksik klasör kalabilir; tamamlanmış `manifest.json` ve dosya özetlerini kontrol edin.

Çıktı mevcutsa işlem reddedilir; `--force` yoktur. Kaynak dosyanın üzerine yazılmaz. Başarılı çıktı klasörü yerel diskte hassas veri içerir; silme/saklama politikası kullanıcıya aittir. Unix'te yeni çıktı klasörüne 0700, dosyalara 0600 izni uygulanır; Windows ACL davranışı ortama bağlıdır.

## Bilinen sınırlar

UDF desteği `template/content/elements` yapısına yöneliktir. DTD, bozuk metin aralıkları veya desteklenmeyen XML kökü hata verir. Tanınmayan yapısal öğeler düzleştirilir ve uyarılır; metin havuzu ayrıca korunur. Birleşik hücrelerin görsel yerleşimi yeniden kurulmaz. Bu sürüm UDF'yi resmî editör gibi PDF'e çizmez.

PDF metni, çizim komutlarının sırasını izler. Çok sütun, dipnot, matematik, tablolar ve bozuk font eşlemeleri insan kontrolü ister. Görsel yorumlama ve el yazısı tanıma garantisi yoktur. DOCX sayfalaması, revizyon geçmişi ve tüm Word nesneleri korunmaz. Şifreli girdiler için parola alma veya koruma kaldırma işlevi yoktur.

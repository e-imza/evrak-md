# Katkı

Hata veya yeni biçim desteği için mevcut davranışı ve beklenen çıktıyı anlatın. Gerçek kişisel verili evrak yüklemeyin. `tests/fixtures.js` yardımıyla sentetik örnek oluşturun ve başarısız bir test ekleyin.

`npm ci` ve `npm run check` yerel kapılarıdır. OCR'yi test dışına çıkarmayın; UDF karakter aralıkları, görseller, tablo içeriği ve kaynak bağlantılarını da denetleyin. Çıktı sözleşmesini değiştirirken `schemaVersion` uyumluluğunu değerlendirin. Yeni ağ erişimi, belge yükleme, imza doğrulama iddiası veya orijinalleri değiştiren davranış eklemeyin.

Bağımlılık güncellemelerinde kilit dosyasını, lisansları, test matrisini ve model dosyalarının yerel bulunmasını kontrol edin. Pull request'e kişisel dosya yolları, gizli anahtarlar veya dönüştürülmüş müşteri belgeleri eklemeyin.

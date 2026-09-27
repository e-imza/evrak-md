# Güvenlik ve veri sınırları

Bu araç kişisel bilgisayarda yetkili belgeleri dönüştürmek için tasarlandı. Çok kiracılı, herkese açık dosya yükleme hizmeti değildir. Böyle bir hizmete gömmek isterseniz ayrı süreç/konteyner, ağ izolasyonu, işletim sistemi bellek/CPU/zaman sınırı, dosya temizliği ve erişim kontrolü gerekir.

Uygulama arşiv yollarını, açılmış boyutu, girdi ve sayfa sınırlarını denetler; şifreli arşiv, sembolik bağlantı, DTD ve dış XML varlıklarını reddeder. Görsel URL'leri indirilmez; DOCX dış dosya erişimi kapalıdır. PDF JavaScript'i çalıştırılmaz. Bunlar ayrıştırıcı veya yerel bağımlılıklarda güvenlik açığı bulunmayacağını garanti etmez.

Çıktı hassasiyet bakımından özgün belgeyle aynı kabul edilmelidir. PNG metaverisinin temizlenmesi anonimleştirme değildir. OCR metni doğrulanmadan hukuki/finansal karar için kullanılmamalıdır. Araç e-imza, zaman damgası, sertifika zinciri veya belge sahteciliği doğrulaması yapmaz.

Sorun bildirirken gerçek evrak, kimlik bilgisi, dosya numarası, imza dosyası veya erişim anahtarı eklemeyin. Açık issue'larda yalnızca sentetik yeniden üretim örneği ve sürüm bilgisi paylaşın. Hassas güvenlik bildirimleri için GitHub deposunda özel güvenlik bildirimi seçeneği varsa onu kullanın; yoksa yayımlamadan önce bakımcıdan özel iletişim kanalı isteyin.

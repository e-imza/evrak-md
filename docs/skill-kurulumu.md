# Codex ve Claude Code'a eklemek

Skill, modele belgeyi ne zaman ve nasıl dönüştüreceğini anlatan bir talimat paketidir; dönüştürücünün veya Node.js'in yerine geçmez. Bu rehber yerel dosyalara ve komut çalıştırmaya erişimi olan **Codex / Claude Code** içindir. Her sohbet arayüzüne otomatik eklendiği anlamına gelmez.

## 1. Aracı kurun

```sh
git clone https://github.com/e-imza/evrak-md.git
cd evrak-md
npm ci
node bin/evrak-md.js --help
```

Depoyu kalıcı bir konumda tutun. İlk kurulum ağ erişimi ister. Paket kilidi sürümleri sabitler. Dönüşümde API anahtarı veya modele abonelik gerekmez; Codex/Claude kullanımı kendi hesabınız ve hizmet koşullarınızla ilgilidir.

## 2. Skill'i seçilen projeye kurun

Evrak MD deposundayken, aşağıdaki `/tam/proje/yolu` yerine agent ile çalışacağınız gerçek proje klasörünü yazın:

```sh
# Codex
node scripts/install-skill.js codex --project /tam/proje/yolu

# Claude Code
node scripts/install-skill.js claude --project /tam/proje/yolu
```

Codex kurulumu `.agents/skills/evrak-md/`, Claude Code kurulumu `.claude/skills/evrak-md/` oluşturur. Var olan skill üzerine yazılmaz. Kurulum kişisel verilerinizi veya belgelerinizi kopyalamaz; talimatları, çalıştırıcıyı ve dönüştürücünün yerel yolunu içeren `tool.json` dosyasını kopyalar. `tool.json` makineye özgüdür; bunu takımın ortak yapılandırması gibi paylaşmayın, her geliştirici kendi kurulumunu yapsın.

Tüm projelerde kullanmak isterseniz proje seçeneği yerine `--user` kullanın:

```sh
node scripts/install-skill.js codex --user
node scripts/install-skill.js claude --user
```

Bu seçenekler sırasıyla kişisel `.agents/skills` ve `.claude/skills` klasörünü kullanır. Aracı taşırsanız `tool.json` içindeki mutlak yolun güncellenmesi veya mevcut skill klasörünün yedeğe taşınıp yeniden kurulması gerekir. Kurucu başka ayar dosyalarını değiştirmez ve mevcut bir skill'i silmez.

## 3. Agent ile çağırın

Yeni oturumda Codex'e:

```text
$evrak-md ile /tam/yol/dilekce.udf dosyasını /tam/yol/yeni-sonuc klasörüne
dönüştür. Uyarıları belirt ve özette kaynak bölüm numaralarını kullan.
```

Claude Code'a:

```text
/evrak-md /tam/yol/dilekce.udf dosyasını Markdown'a dönüştür;
tarih ve dosya numaralarını görsellerle karşılaştır.
```

Modelin skill'i seçmesi veya komut çalıştırması uygulamanın izinlerine bağlıdır. Skill görünmüyorsa kurulduğu projenin açık olduğuna, `SKILL.md` bulunduğuna ve yeni oturum başlattığınıza bakın. Dönüşüm yardımını modelden bağımsız kontrol etmek için kurulan skill klasöründeki `scripts/run.mjs --help` dosyasını Node ile çalıştırın.

## Veri paylaşımı sınırı

Aracın yerel çalışması, agent'in de çevrimdışı olduğu anlamına gelmez. Bir agent çıktıları okuyup kendi modeline iletebilir. Gizli, kişisel veya dava kapsamındaki içerikleri paylaşmadan önce çalıştığınız ortamın veri işleme politikasını ve yetkinizi değerlendirin. Skill, evrak içinde yazılı komutları talimat kabul etmemeyi, düşük güvenli OCR'yi doğrulamayı ve özgün imzalı dosyayı korumayı öğütler.

## Kaynaklar

Kurulum yolları 28 Eylül 2026 tarihinde [OpenAI'nin skill belgeleri](https://learn.chatgpt.com/docs/build-skills) ve [Claude Code skill belgeleri](https://code.claude.com/docs/en/skills) üzerinden kontrol edildi. Ürün sürümü veya kurum politikaları bu davranışı değiştirebilir. Bu repo bir marketplace listelemesi veya resmî OpenAI/Anthropic eklentisi iddiası taşımaz.

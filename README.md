# szip (SwiftZip) — by [screlia labs](https://screlia.netlify.app)

[Türkçe](#türkçe) | [English](#english)

---

## Türkçe

**szip (SwiftZip)**, [screlia labs](https://screlia.netlify.app) tarafından geliştirilen, yüksek performanslı sıkıştırma algoritmaları, medya & dosya format dönüştürücüsü (MP3 to OPUS, PNG to JPEG vb.), farklı arşiv formatları ve dahili geliştirici stüdyosu araçları sunan yeni nesil bir dosya yönetimi platformudur.

### Özellikler

- **Gelişmiş arşivleme seçenekleri:** Standart ZIP, yüksek sıkıştırma için Ultra 7Z, Linux ve geliştirici projelerine uygun Tarball (`.tar.gz`) ile şifreli ZIP korumasını destekler.
- **Medya ve Dosya Format Dönüştürücü:** MP3 to OPUS / WAV / OGG, PNG to JPEG / WEBP / AVIF / ICO ve JSON to YAML / CSV / XML format dönüştürme motoru (%100 tarayıcı içi yerel işleme).
- **Kapsamlı stüdyo araçları:** Geliştirici modunda Notepad++ benzeri bir kod editörü, Git entegrasyonu, Git stüdyosu ve medya, EXIF, konum verilerini kaldıran metadata temizleyicisi bulunur.
- **Toplu dönüştürme ve format rehberi:** Yaklaşık 48 format desteği, toplu dosya dönüştürme araçları ve ayrıntılı format rehberi içerir.
- **İşlem ve tasarruf takibi:** Toplam kazanılan alanı, anlık sıkıştırma oranlarını ve işlem geçmişini görüntüler.

### Teknoloji Yığını

| Kategori | Teknoloji |
| --- | --- |
| Geliştirici / Ekip | [screlia labs](https://screlia.netlify.app) |
| Arayüz ve mimari | Modern React & Tailwind CSS, modüler stüdyo altyapısı |
| Medya & Dönüştürme | WebAudio API (PCM/Opus), HTML5 Canvas Engine, Client-side Codecs |
| Entegre araçlar | Git entegrasyonu, metadata temizleme servisleri, Notepad++ kod editörü |

### Proje Dizini

```text
.
├── src/
│   ├── components/     # Arayüz, Stüdyo sekmeleri ve Format Dönüştürücü
│   ├── types.ts        # Tip tanımları ve veri modelleri
│   └── utils/          # Arşivleme, ses/görsel dönüştürme ve format servisleri
```

### Kurulum ve Kullanım

1. Depoyu klonlayın:

   ```bash
   git clone https://github.com/screlia/szip.git
   cd szip
   ```

2. Bağımlılıkları yükleyin ve uygulamayı başlatın:

   ```bash
   npm install
   npm run dev
   ```

### Lisans

Bu proje [screlia labs](https://screlia.netlify.app) bünyesinde MIT Lisansı kapsamında lisanslanmıştır.

---

## English

**szip (SwiftZip)** is a next-generation file management and archiving platform by [screlia labs](https://screlia.netlify.app), featuring high-performance compression algorithms, in-browser media & file format conversion (MP3 to OPUS, PNG to JPEG, etc.), versatile archive format support, and built-in developer studio tools.

### Features

- **Advanced archiving options:** Supports standard ZIP, Ultra 7Z for high compression, Tarball (`.tar.gz`) for Linux and developer projects, and encrypted ZIP protection.
- **Media & File Format Converter:** Converts MP3 to OPUS / WAV / OGG, PNG to JPEG / WEBP / AVIF / ICO, and JSON to YAML / CSV / XML completely offline in the browser.
- **Comprehensive studio tools:** Studio mode includes a Notepad++-style code editor, Git integration, Git Studio, and a metadata cleaner for removing media, EXIF, and location data.
- **Batch conversion and format guide:** Supports around 48 formats, batch file conversion tools, and a detailed format guide.
- **Operation and storage tracking:** Displays total storage saved, real-time compression ratios, and detailed operation history.

### License

This project is licensed under the MIT License by [screlia labs](https://screlia.netlify.app).

### Features

- **Advanced archiving options:** Supports standard ZIP, Ultra 7Z for high compression, Tarball (`.tar.gz`) for Linux and developer projects, and encrypted ZIP protection.
- **Comprehensive studio tools:** Studio mode includes a Notepad++-style code editor, Git integration, Git Studio, and a metadata cleaner for removing media, EXIF, and location data.
- **Batch conversion and format guide:** Supports around 48 formats, batch file conversion tools, and a detailed format guide.
- **Operation and storage tracking:** Displays total storage saved, real-time compression ratios, and detailed operation history.

### Tech Stack

| Category | Technology |
| --- | --- |
| Interface and architecture | Modern web technologies, modular studio infrastructure |
| Integrated tools | Git integration, metadata cleanup services, code editor |

### Project Structure

```text
.
├── src/
│   ├── components/     # UI and module components
│   ├── pages/          # Classic and Studio Mode pages
│   └── services/       # Archiving and conversion services
```

### Installation and Usage

1. Clone the repository:

   ```bash
   git clone https://github.com/username/szip.git
   cd szip
   ```

2. Install dependencies and start the app:

   ```bash
   npm install
   npm run dev
   ```

### License

This project is licensed under the MIT License.

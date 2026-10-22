# daktilo-js

[![CI](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml)

[English](README.md) · **Türkçe** · [Playground](https://vlikcc.github.io/daktilo.js/)

Herhangi bir HTML kapsayıcısını tek bir yapılandırma nesnesiyle gerçekçi bir daktilo kağıdına dönüştüren, **sıfır bağımlılıklı** bir mikro-kütüphane.

- **Kağıt temaları:** `vintage` (saman kağıdı), `clean` (modern beyaz), `carbon` (koyu karbon)
- **Organik mürekkep:** harf bazında dikey sapma, şerit eskimesi ve mürekkep dağılması
- **Overstrike yazım motoru:** hatalı harf silinmez, üzerine `x` basılır; noktalamada duraksayan insan ritmi
- **Dosyasız ses:** tuş, boşluk ve satır sonu çanı Web Audio API ile gerçek zamanlı sentezlenir; istenirse [gerçek daktilo kaydı](#gerçek-daktilo-kaydı) kullanılabilir
- **Oynatma denetimi:** `pause()`, `resume()`, `skip()`, metin eklemek için `type()`, olaylar, sessize alma ve ses seviyesi
- **Erişilebilir:** yazım sürerken ekran okuyucular metnin tamamını okur; `prefers-reduced-motion` tercihine uyar
- **< 6 KB** (ESM, minified + gzip), TypeScript tipleri dahil, SSR güvenli
- **Ekosistem:** React, Astro, Tailwind CSS eklentisi, `<textarea>` / `contenteditable` için Yazar modu, klavye düzenleri

## Kurulum

```bash
npm i daktilo-js
```

### CDN

```html
<article id="my-essay">
  <h1>Gece Notları</h1>
  <p>Mekanik tuşların kağıt üzerindeki izi, dijital ekranın soğukluğunu kırar...</p>
</article>

<script src="https://unpkg.com/daktilo-js@1/dist/index.global.js"></script>
<script>
  new Daktilo.Daktilo('#my-essay', {
    paper: 'vintage',
    inkWear: 0.4,
    sound: true,
    stamp: { docNo: '#84-A', classification: 'ARŞİV' },
  });
</script>
```

### ESM / TypeScript

```ts
import { Daktilo } from 'daktilo-js';

const daktilo = new Daktilo('#my-essay', { animate: true, typoRate: 0.04 });
await daktilo.finished;
await daktilo.type('İlk paragraftan sonra yazılan yeni bir paragraf.');
```

## Seçenekler

| Seçenek                | Varsayılan  | Açıklama                                                                                                       |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `paper`                | `'vintage'` | `'vintage' \| 'clean' \| 'carbon'`                                                                             |
| `ribbonColor`          | tema rengi  | Şerit/vurgu rengi (bağlantılar, damga, overstrike, imleç)                                                      |
| `maxWidth`             | `'65ch'`    | Kağıt genişliği                                                                                                |
| `inkWear`              | `0.35`      | Mürekkep eskimesi, `0`–`1`                                                                                     |
| `animate`              | `false`     | Harf harf yazım animasyonu                                                                                     |
| `speed`                | `45`        | Harf başına ortalama gecikme (ms)                                                                              |
| `typoRate`             | `0.02`      | Overstrike hata oranı, `0`–`0.2` (`code`, `kbd`, `samp`, `pre` içinde hata yapılmaz)                           |
| `overstrikeChar`       | `'x'`       | `'x' \| '-'`                                                                                                   |
| `keyboard`             | Türkçe Q    | Yanlış komşu tuşun seçildiği harf satırları. Hazır düzenler [`daktilo-js/keyboards`](#klavye-düzenleri) içinde |
| `sound`                | `false`     | `true`: sentez ses; bir `SoundEngine` nesnesi verilirse o kullanılır                                           |
| `volume`               | `0.4`       | Sentez ses seviyesi, `0`–`1`                                                                                   |
| `stamp`                | `null`      | `{ docNo, date, author, classification, labels, locale }` evrak üst bilgisi                                    |
| `fonts`                | `true`      | `true`: Special Elite ve Courier Prime'ı Google Fonts'tan yükler; bir URL verilirse oradan yüklenir            |
| `styles`               | `true`      | Çekirdek CSS'i `<style>` ile ekler. Katı CSP için `false` + `daktilo-js/style.css`                             |
| `respectReducedMotion` | `true`      | `prefers-reduced-motion: reduce` aktifken animasyon ve sesi kapatır                                            |
| `startOnVisible`       | `false`     | Yazım, kağıt ekrana girince başlar (IntersectionObserver)                                                      |
| `autoScroll`           | `false`     | Yazım sürerken imleci görünür alanda tutar                                                                     |
| `onChar(char, el)`     | –           | Her tuş vuruşunda çağrılır (atlanan metin hariç)                                                               |
| `onLine(el)`           | –           | Her satır başında, çanla birlikte çağrılır                                                                     |
| `onComplete()`         | –           | İlk yazım bittiğinde veya atlandığında bir kez çağrılır (`destroy()` sonrası çağrılmaz)                        |

Damga etiketleri varsayılan olarak Türkçedir: başka dil için `stamp.labels` (ör. `{ docNo: 'REF', date: 'DATE', author: 'BY' }`) ve `stamp.locale` (ör. `'en-US'`) verin.

## API

- `instance.finished: Promise<void>`: ilk yazım bittiğinde (veya atlandığında / iptal edildiğinde) çözülür.
- `instance.skip()`: devam eden ve sırada bekleyen yazımı anında tamamlar; yazılmış harfler mürekkep kusurlarıyla korunur.
- `instance.pause()` / `instance.resume()` / `instance.paused`: yazımı duraklatır ve sürdürür.
- `instance.type(content: string | Node): Promise<void>`: içeriği ekler ve önceki yazım bitince yazar. Metin yeni bir paragraf olur; özel yapı için bir düğüm verin. `animate` kapalıysa içerik mürekkep kusuruyla hemen eklenir.
- `instance.muted = true`: tuş ve çan seslerini susturur; `instance.setVolume(0.7)` ses seviyesini değiştirir.
- `instance.destroy()`: elemanları orijinal düğümleri, sınıfları ve stilleriyle eski hâline döndürür (eklenen içerik de kaldırılır).
- `MechanicalSoundEngine`: ses motoru tek başına da kullanılabilir (`playKeyClick(isSpace)`, `playCarriageDing()`, `setVolume()`).

`data-daktilo-ignore` özniteliği taşıyan elemanlar ile `script`, `style`, `textarea`, `svg` içeriklerine dokunulmaz.

## React

```tsx
import { DaktiloSheet, useDaktilo } from 'daktilo-js/react';

export function Yazi() {
  return (
    <DaktiloSheet paper="vintage" animate stamp={{ docNo: '#84-A' }} onReady={(d) => console.log(d)}>
      <h1>Gece Notları</h1>
      <p>Mekanik tuşların kağıt üzerindeki izi…</p>
    </DaktiloSheet>
  );
}

// Veya hook ile:
function Notlar() {
  const { ref, daktilo } = useDaktilo<HTMLElement>({ animate: true });
  return (
    <article ref={ref} onClick={() => daktilo?.skip()}>
      …
    </article>
  );
}
```

Daktilo DOM'u yeniden düzenlediği için `DaktiloSheet` çocuklarını `resetKey` değişene kadar dondurur; dinamik içeriği yeniden yazdırmak için yeni bir `resetKey` verin. Olay callback'leri her zaman son render'daki hâliyle çağrılır. Kayıtlı ses motoru için bir fabrika verin (`sound: () => new SampleSoundEngine({...})`); böylece her başlatma (StrictMode'un çift başlatması dahil) kendi motorunu alır.

## Astro

```astro
---
import DaktiloSheet from 'daktilo-js/astro';
---

<DaktiloSheet paper="vintage" animate stamp={{ docNo: '#84-A', classification: 'ARŞİV' }}>
  <h1>Gece Notları</h1>
  <p>Mekanik tuşların kağıt üzerindeki izi…</p>
</DaktiloSheet>
```

JSON'a çevrilebilen tüm seçenekler desteklenir (callback'ler ve `SoundEngine` nesneleri hariç). View Transitions ile çalışır.

## Tailwind CSS

Eklenti Daktilo sınıflarını bileşen katmanına ekler; JavaScript olmadan kağıt görünümü elde edilir. Ayrıca `font-typewriter`, `font-typewriter-title` ve `text-daktilo-*` / `bg-daktilo-*` renklerini tanımlar.

```js
// Tailwind v3 — tailwind.config.js
module.exports = { plugins: [require('daktilo-js/tailwind')] };
```

```css
/* Tailwind v4 */
@import 'tailwindcss';
@plugin "daktilo-js/tailwind";
```

```html
<article class="daktilo-sheet daktilo-theme-vintage">…</article>
```

Tailwind kullanmıyorsanız aynı stil dosyası `daktilo-js/style.css` olarak da yayımlanır.

## Yazar modu

`daktilo-js/editor`, bir `<textarea>` veya `contenteditable` alanı daktiloya çevirir: tuşlar tıkırdar, boşluk tok ses çıkarır, Enter çanı çalar. Metnin kendisi değiştirilmez.

```ts
import { DaktiloWriter } from 'daktilo-js/editor';

const writer = new DaktiloWriter('#taslak', {
  paper: 'clean',
  bellColumn: 60, // gerçek daktilodaki gibi kenar boşluğu çanı
  noErase: true, // kağıda basılan geri alınamaz: silme, kesme ve geri almayı engeller
});
writer.destroy();
```

CDN'de `dist/editor.global.js` dosyası `DaktiloEditor.DaktiloWriter` olarak yüklenir.

## Klavye düzenleri

Yazım hataları, hedeflenen harfin komşusu olan bir tuşa basılarak yapılır. Çekirdekte Türkçe Q düzeni bulunur; `daktilo-js/keyboards` modülü `TURKISH_Q`, `TURKISH_F`, `QWERTY`, `QWERTZ`, `AZERTY` ve `QWERTY_ES` düzenlerini sağlar (CDN: `DaktiloKeyboards`). Özel bir düzen, küçük harf satırlarından oluşan bir dizidir.

## Gerçek daktilo kaydı

Çekirdek paket dosyasız sentezle çalışır. Gerçek bir kayıt kullanmak için isteğe bağlı `daktilo-js/samples` modülündeki `SampleSoundEngine`'i `sound` seçeneğine verin (çekirdeğe eklenmez, ~1,7 KB gzip):

```ts
import { Daktilo } from 'daktilo-js';
import { SampleSoundEngine } from 'daktilo-js/samples';

new Daktilo('#my-essay', {
  animate: true,
  sound: new SampleSoundEngine({
    key: '/sounds/typewriter-keys.mp3', // tuş vuruşları kaydı
    bell: '/sounds/typewriter-bell.mp3', // satır sonu çanı
    volume: 0.4,
  }),
});
```

CDN'de `dist/samples.global.js` dosyası `DaktiloSamples.SampleSoundEngine` olarak yüklenir.

- `key` kaydındaki vuruşlar ses enerjisindeki ani yükselişlerden otomatik ayrıştırılır; her tuşta rastgele bir vuruş çalınır, boşluk tuşu daha pes çalar. Vuruşlar arasında en az ~70 ms sessizlik olan kayıtlar en iyi sonucu verir.
- `bell` kaydı satır sonlarında olduğu gibi çalınır.
- Kayıtlar ses kilidi açıldıktan sonra çözülür; o ana kadar veya dosya yüklenemezse sentez sese düşülür.
- Motor örneği `Daktilo`'ya aittir: `destroy()` onu da kapatır; her örnek için yenisini oluşturun.

Playground'daki `playground/sounds/` dosyaları bir Freesound kaydından (`type-writing-6834`) bu biçime getirilmiştir: 24 tuş vuruşu ve çan + satır başı sesi.

## Notlar

- **Erişilebilirlik:** Mürekkep kusurları inline `position: relative` span'lerle uygulanır; kelimeler bölünmez ve ekran okuyucular metni bütün okur. Hatalı harfler `aria-hidden` ve seçilemezdir. Yazım sürerken yarım yazılmış metin `aria-hidden` olur; ekran okuyucular metnin tamamını görsel olarak gizli bir kopyadan okur ve kapsayıcı `aria-busy="true"` taşır.
- **Performans:** Yalnızca kusur uygulanan harfler span'e alınır; kalan metin tek TextNode olarak birleşik kalır. Mevcut HTML elemanları ve event listener'lar korunur. Satır sarması kağıda göre ölçülür; sayfa kaydırması yanlış çan çaldırmaz. Yazım, fontlar yüklenene kadar (en fazla 1,5 sn) bekler; böylece font değişimi yazım ortasında satırları kaydırmaz.
- **Unicode:** Metin grapheme'lere (`Intl.Segmenter`) bölünür; birleşik aksanlar ve emoji dizileri parçalanmaz, `&nbsp;` korunur.
- **Gizlilik:** `fonts: true` fontları Google'dan ister. Üçüncü taraf isteklerinden kaçınmak için (ör. KVKK/GDPR) fontları kendi sunucunuzda barındırıp stil dosyasının URL'sini verin (`fonts: '/fonts/daktilo.css'`) veya `fonts: false` kullanın.
- **CSP:** Katı bir `style-src` politikasında `styles: false` verip `daktilo-js/style.css` dosyasını kendiniz yükleyin. Mürekkep efektleri CSP'nin izin verdiği CSSOM ile uygulanır.
- **Autoplay politikası:** Ses bağlamı ilk `pointerdown`/`keydown` etkileşiminde sessizce açılır.

## Geliştirme

```bash
npm install
npm test               # vitest + jsdom
npm run test:coverage  # kapsam raporu coverage/ altında
npm run test:e2e       # Playwright (gerçek Chromium); önce npm run build
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck
npm run build          # dist/: ESM, CJS, IIFE, tipler ve daktilo.css
npm run size           # çekirdek gzip boyutu kontrolü: ESM < 6 KB, CJS/IIFE < 6,5 KB
npm run lint:pkg       # publint + Are the Types Wrong?
npm run playground     # derler ve http://127.0.0.1:5173/playground/ adresinde sunar
npx changeset          # bir sonraki sürüm için değişikliği tanımlar
```

Playground, `main` dalından GitHub Pages'e yayınlanır. Ürün gereksinim dokümanı [`docs/`](docs/daktilo-js-prd.pdf) altındadır.

## Lisans

MIT

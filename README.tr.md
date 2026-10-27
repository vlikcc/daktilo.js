# daktilo-js

[![CI](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/vlikcc/daktilo.js/actions/workflows/ci.yml)

[English](README.md) · **Türkçe** · [Playground](https://vlikcc.github.io/daktilo.js/) · [API belgeleri](https://vlikcc.github.io/daktilo.js/api/)

Herhangi bir HTML kapsayıcısını tek bir yapılandırma nesnesiyle gerçekçi bir daktilo kağıdına dönüştüren, **sıfır bağımlılıklı** bir mikro-kütüphane.

![daktilo-js damgalı, eskimiş mürekkepli ve üzeri çizilmiş hatalarla bir sayfa yazıyor](https://raw.githubusercontent.com/vlikcc/daktilo.js/main/docs/demo.gif)

- **Kağıt temaları:** `vintage` (saman kağıdı), `clean` (modern beyaz), `carbon` (koyu karbon), `auto` (sistemin koyu moduna uyar) veya kendi renkleriniz
- **Organik mürekkep:** harf bazında dikey sapma, şerit eskimesi ve mürekkep dağılması; `<mark>` şeridin kırmızı yarısıyla basılır
- **Overstrike yazım motoru:** hatalı harf silinmez, üzerine `x` basılır; noktalamada duraksayan insan ritmi
- **Dosyasız ses:** tuş, boşluk, kenar çanı ve satır başı Web Audio API ile gerçek zamanlı sentezlenir; istenirse [gerçek daktilo kaydı](#gerçek-daktilo-kaydı) kullanılabilir
- **Oynatma denetimi:** `pause()`, `resume()`, `skip()`, metin eklemek için `type()`, olaylar, sessize alma ve ses seviyesi
- **Erişilebilir:** yazım sürerken ekran okuyucular metnin tamamını okur; `prefers-reduced-motion` tercihine uyar; düzgün yazdırılır
- **< 6 KB** (ESM, minified + gzip), TypeScript tipleri dahil, SSR güvenli
- **Her yerde:** her CMS için `<daktilo-sheet>` Web Component'i, React, Vue, Svelte, Astro, Tailwind CSS eklentisi, `<textarea>` / `contenteditable` için Yazar modu, kağıt dokuları ve klavye düzenleri

## Kurulum

```bash
npm i daktilo-js
```

### Web Component (WordPress, Ghost, Hugo, düz HTML)

Tek bir script etiketi, derleme adımı yok. Kağıt özniteliklerle ayarlanır:

```html
<script src="https://unpkg.com/daktilo-js@1/dist/element.global.js"></script>

<daktilo-sheet
  paper="vintage"
  animate
  typo-rate="0.03"
  stamp-doc-no="#84-A"
  stamp-classification="ARŞİV"
  texture="stain"
>
  <h1>Gece Notları</h1>
  <p>Mekanik tuşların kağıt üzerindeki izi, dijital ekranın soğukluğunu kırar...</p>
</daktilo-sheet>
```

Callback'ler dışındaki her seçeneğin kebab-case bir özniteliği vardır (`ink-wear`, `max-width`, `start-on-visible` …). `animate` gibi bayraklar, değeri `"false"` olmadıkça yazıldıklarında açıktır. Ayrıca:

- `keyboard`: hazır düzen adı alır (`turkish-q`, `turkish-f`, `qwerty`, `qwertz`, `azerty`, `qwerty-es`).
- `stamp-*`: damga alanları (`stamp-doc-no`, `stamp-date`, `stamp-author`, `stamp-classification`, `stamp-locale`, ayrıca `stamp-labels="REF, DATE, BY"`).
- `texture`: [kağıt dokuları](#kağıt-dokuları) ekler.

Eleman:

- **Olaylar:** `daktilo-char`, `daktilo-line` ve `daktilo-complete` olaylarını yayar.
- **Metotlar:** `skip()`, `pause()`, `resume()` ve `type()` sunar.
- **Yaşam döngüsü:** bir öznitelik değişince yeniden başlar, sayfadan çıkarılınca içeriğini geri yükler.

WordPress temasında veya Ghost/Hugo şablonunda script etiketini sayfa düzenine ekleyip yazı gövdesini `<daktilo-sheet>` içine almanız yeterli. Bundler ile: `import 'daktilo-js/element'`.

### CDN (JavaScript API)

```html
<article id="my-essay">…</article>

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
| `paper`                | `'vintage'` | `'vintage' \| 'clean' \| 'carbon' \| 'auto'` veya özel renkler `{ paper, ink, ribbon, rule, pore }`            |
| `ribbonColor`          | tema rengi  | Şerit/vurgu rengi (bağlantılar, `<mark>`, damga, overstrike, imleç)                                            |
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
| `onLine(el)`           | –           | Her satır başında, satır başı sesiyle birlikte çağrılır                                                        |
| `onComplete()`         | –           | İlk yazım bittiğinde veya atlandığında bir kez çağrılır (`destroy()` sonrası çağrılmaz)                        |

Damga etiketleri varsayılan olarak Türkçedir: başka dil için `stamp.labels` (ör. `{ docNo: 'REF', date: 'DATE', author: 'BY' }`) ve `stamp.locale` (ör. `'en-US'`) verin.

**Temalar:** `paper: 'auto'` açık modda `vintage`, koyu modda `carbon` kullanır ve sistem teması değişince anında geçer. Özel renkler temanın CSS değişkenlerini ezer; verilmeyenler `vintage`'dan gelir:

```ts
new Daktilo('#yazi', { paper: { paper: '#fffbe6', ink: '#1b263b', ribbon: '#9d0208' } });
```

Aynı değişkenler (`--daktilo-paper`, `--daktilo-ink`, `--daktilo-ribbon`, `--daktilo-rule`, `--daktilo-pore`) kendi CSS'inizde de verilebilir, ör. `<daktilo-sheet style="--daktilo-paper: #fffbe6">`.

**Kırmızı şerit:** `<mark>` ve `daktilo-red` sınıfı taşıyan elemanlar, iki renkli şeridin kırmızı yarısı gibi şerit rengiyle basılır.

## API

- `instance.finished: Promise<void>`: ilk yazım bittiğinde (veya atlandığında / iptal edildiğinde) çözülür.
- `instance.skip()`: devam eden ve sırada bekleyen yazımı anında tamamlar; yazılmış harfler mürekkep kusurlarıyla korunur.
- `instance.pause()` / `instance.resume()` / `instance.paused`: yazımı duraklatır ve sürdürür.
- `instance.type(content: string | Node): Promise<void>`: içeriği ekler ve önceki yazım bitince yazar. Metin yeni bir paragraf olur; özel yapı için bir düğüm verin. `animate` kapalıysa içerik mürekkep kusuruyla hemen eklenir.
- `instance.muted = true` sesleri susturur; `instance.setVolume(0.7)` ses seviyesini değiştirir; `instance.setSound(true | false | motor)` sesi istendiği an açar, kapatır veya motoru değiştirir.
- `instance.destroy()`: elemanları orijinal düğümleri, sınıfları ve stilleriyle eski hâline döndürür (eklenen içerik de kaldırılır).
- `MechanicalSoundEngine`: ses motoru tek başına da kullanılabilir (`playKeyClick(isSpace)`, `playCarriageDing()`, `playCarriageReturn()`, `setVolume()`).

Tipler üzerinden üretilen tam başvuru: **[API belgeleri](https://vlikcc.github.io/daktilo.js/api/)** (İngilizce).

`data-daktilo-ignore` özniteliği taşıyan elemanlar ile `script`, `style`, `textarea`, `svg` içeriklerine dokunulmaz.

## Ses

Gerçek bir makinedeki gibi:

- **Tuşlar ve boşluk:** her tuş tıkırdar, boşluk tuşu tok bir ses çıkarır.
- **Kenar çanı:** her satırda, sağ kenara yaklaşık altı karakter kala bir kez çalar.
- **Satır başı:** her yeni satırda kızağın geri kayarken çıkardığı cırcır sesi çalar.

Ses bağlamı ilk `pointerdown`/`keydown` etkileşiminde sessizce açılır (tarayıcıların autoplay politikası). Özel bir `SoundEngine` şunları uygular: `playKeyClick(isSpace)`, `playCarriageDing()`, `dispose()`. İsteğe bağlı olarak `playCarriageReturn()` ve `setVolume()` de eklenebilir.

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

React 18 ve 19 desteklenir. Daktilo DOM'u yeniden düzenlediği için `DaktiloSheet` çocuklarını `resetKey` değişene kadar dondurur; dinamik içeriği yeniden yazdırmak için yeni bir `resetKey` verin. Olay callback'leri her zaman son render'daki hâliyle çağrılır. Kayıtlı ses motoru için bir fabrika verin (`sound: () => new SampleSoundEngine({...})`); böylece her başlatma (StrictMode'un çift başlatması dahil) kendi motorunu alır.

## Vue

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DaktiloSheet, vDaktilo } from 'daktilo-js/vue';

const bitti = ref(false);
</script>

<template>
  <DaktiloSheet paper="auto" animate :stamp="{ docNo: '#84-A' }" @complete="bitti = true">
    <h1>Gece Notları</h1>
    <p>Mekanik tuşların kağıt üzerindeki izi…</p>
  </DaktiloSheet>

  <!-- veya yönerge ile -->
  <article v-daktilo="{ paper: 'clean', inkWear: 0.5 }">…</article>
</template>
```

Prop'lar seçeneklerdir; olaylar `ready`, `char`, `line` ve `complete`. React'teki gibi slot, `reset-key` değişene kadar dondurulur. Vue 3.3+.

## Svelte

```svelte
<script>
  import { daktilo } from 'daktilo-js/svelte';
</script>

<article use:daktilo={{ paper: 'vintage', animate: true, onReady: (d) => console.log(d) }}>
  <h1>Gece Notları</h1>
</article>
```

Bir action olduğu için Svelte 3, 4 ve 5 ile çalışır ve bağımlılık eklemez. Seçenekler değişince kağıt yeniden başlar.

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

JSON'a çevrilebilen tüm seçenekler desteklenir (callback'ler ve `SoundEngine` nesneleri hariç). View Transitions ile çalışır. CI, güncel Astro ile [bir örnek projeyi](examples/astro) derleyip tarayıcıda dener.

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

## Kağıt dokuları

`daktilo-js/textures`, CSS gradyanlarıyla (görsel dosyası olmadan) kahve lekesi (`stain`), katlanma izleri (`fold`), delikli kenar (`holes`) ve eskimiş kenarlar (`aged`) ekler. Yazdırırken gizlenirler.

```ts
import { applyTextures } from 'daktilo-js/textures';

const kaldir = applyTextures(document.querySelector('#yazi')!, ['stain', 'fold']);
```

Web Component ile: `<daktilo-sheet texture="stain fold">`. CDN'de: `dist/textures.global.js` → `DaktiloTextures.applyTextures`.

## Yazar modu

`daktilo-js/editor`, bir `<textarea>` veya `contenteditable` alanı daktiloya çevirir: tuşlar tıkırdar, boşluk tok ses çıkarır, Enter satır başı sesini çalar. Metnin kendisi değiştirilmez.

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

Çekirdek paket dosyasız sentezle çalışır. Gerçek bir kayıt kullanmak için isteğe bağlı `daktilo-js/samples` modülündeki `SampleSoundEngine`'i `sound` seçeneğine verin (çekirdeğe eklenmez, ~1,8 KB gzip):

```ts
import { Daktilo } from 'daktilo-js';
import { SampleSoundEngine } from 'daktilo-js/samples';

new Daktilo('#my-essay', {
  animate: true,
  sound: new SampleSoundEngine({
    key: '/sounds/typewriter-keys.mp3', // tuş vuruşları kaydı
    bell: '/sounds/typewriter-bell.mp3', // çan (+ satır başı)
    volume: 0.4,
  }),
});
```

CDN'de `dist/samples.global.js` dosyası `DaktiloSamples.SampleSoundEngine` olarak yüklenir.

- `key` kaydındaki vuruşlar ses enerjisindeki ani yükselişlerden otomatik ayrıştırılır; her tuşta rastgele bir vuruş çalınır, boşluk tuşu daha pes çalar. Vuruşlar arasında en az ~70 ms sessizlik olan kayıtlar en iyi sonucu verir.
- Yalnızca `bell` verilirse kayıt "çan + satır başı" sayılır ve her satır başında çalınır. Ayrı bir `return` kaydı verirseniz `bell` kenarda, `return` her yeni satırda çalar.
- Kayıtlar ses kilidi açıldıktan sonra çözülür; o ana kadar veya dosya yüklenemezse sentez sese düşülür.
- Motor örneği `Daktilo`'ya aittir: `destroy()` onu da kapatır; her örnek için yenisini oluşturun.

Playground'daki `playground/sounds/` dosyaları bir Freesound kaydından (`type-writing-6834`) bu biçime getirilmiştir: 24 tuş vuruşu ve çan + satır başı sesi.

## Notlar

- **Erişilebilirlik:** Mürekkep kusurları inline `position: relative` span'lerle uygulanır; kelimeler bölünmez ve ekran okuyucular metni bütün okur. Hatalı harfler `aria-hidden` ve seçilemezdir. Yazım sürerken yarım yazılmış metin `aria-hidden` olur; ekran okuyucular metnin tamamını görsel olarak gizli bir kopyadan okur ve kapsayıcı `aria-busy="true"` taşır.
- **Performans:** Yalnızca kusur uygulanan harfler span'e alınır; kalan metin tek TextNode olarak birleşik kalır (10.000 kelimelik bir makalenin mürekkebi ~0,1 sn'de uygulanır). Mevcut HTML elemanları ve event listener'lar korunur. Satır sarması kağıda göre ölçülür; sayfa kaydırması yanlış çan çaldırmaz. Yazım, fontlar yüklenene kadar (en fazla 1,5 sn) bekler; böylece font değişimi yazım ortasında satırları kaydırmaz.
- **Unicode:** Metin grapheme'lere (`Intl.Segmenter`) bölünür; birleşik aksanlar ve emoji dizileri parçalanmaz, `&nbsp;` korunur.
- **Yazdırma:** Gölge ve imleç gizlenir, kağıt renkleri korunur.
- **Gizlilik:** `fonts: true` fontları Google'dan ister. Üçüncü taraf isteklerinden kaçınmak için (ör. KVKK/GDPR) fontları kendi sunucunuzda barındırıp stil dosyasının URL'sini verin (`fonts: '/fonts/daktilo.css'`) veya `fonts: false` kullanın.
- **CSP:** Katı bir `style-src` politikasında `styles: false` verip `daktilo-js/style.css` dosyasını kendiniz yükleyin. Mürekkep efektleri CSP'nin izin verdiği CSSOM ile uygulanır.

## Geliştirme

```bash
npm install
npm test               # vitest + jsdom
npm run test:coverage  # kapsam raporu coverage/ altında
npm run build          # dist/: ESM, CJS, IIFE, tipler ve daktilo.css
npm run test:e2e       # Playwright: Chromium, Firefox, WebKit (görsel + performans testleri Chromium'da)
npm run lint           # ESLint
npm run format         # Prettier
npm run typecheck
npm run size           # çekirdek gzip boyutu kontrolü: ESM < 6 KB, CJS/IIFE < 6,5 KB
npm run lint:pkg       # publint + Are the Types Wrong?
npm run docs           # API belgeleri api/ altında
npm run demo:gif       # docs/demo.gif dosyasını yeniden üretir
npm run playground     # derler ve http://127.0.0.1:5173/playground/ adresinde sunar
npx changeset          # bir sonraki sürüm için değişikliği tanımlar
```

Kurallar için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın. Playground ve API belgeleri `main` dalından GitHub Pages'e yayınlanır; sürümler elle çalıştırılan **Release** iş akışıyla çıkarılır. Ürün gereksinim dokümanı [`docs/`](docs/daktilo-js-prd.pdf) altındadır.

## Lisans

MIT

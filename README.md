# daktilo-js

Herhangi bir HTML kapsayıcısını tek bir yapılandırma nesnesiyle gerçekçi bir daktilo kağıdına dönüştüren, **sıfır bağımlılıklı** bir mikro-kütüphane.

- **Kağıt temaları:** `vintage` (saman kağıdı), `clean` (modern beyaz), `carbon` (koyu karbon)
- **Organik mürekkep:** harf bazında dikey sapma, şerit eskimesi ve mürekkep dağılması
- **Overstrike yazım motoru:** hatalı harf silinmez, üzerine `x` basılır; noktalamada duraksayan insan ritmi
- **Dosyasız ses:** tuş, boşluk ve satır sonu çanı Web Audio API ile gerçek zamanlı sentezlenir; istenirse [gerçek daktilo kaydı](#gerçek-daktilo-kaydı) kullanılabilir
- **< 5 KB** (minified + gzip), TypeScript tipleri dahil, SSR güvenli

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

<script src="https://unpkg.com/daktilo-js@1.0.0/dist/index.global.js"></script>
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
```

### React

```tsx
import { useEffect, useRef } from 'react';
import { Daktilo, type DaktiloOptions } from 'daktilo-js';

export function useDaktilo<T extends HTMLElement>(options?: DaktiloOptions) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const instance = new Daktilo(ref.current, options);
    return () => instance.destroy();
  }, []);
  return ref;
}
```

## Seçenekler

| Seçenek | Varsayılan | Açıklama |
| --- | --- | --- |
| `paper` | `'vintage'` | `'vintage' \| 'clean' \| 'carbon'` |
| `ribbonColor` | tema rengi | Şerit/vurgu rengi (bağlantılar, damga, overstrike) |
| `maxWidth` | `'65ch'` | Kağıt genişliği |
| `inkWear` | `0.35` | Mürekkep eskimesi, `0`–`1` |
| `animate` | `false` | Harf harf yazım animasyonu |
| `speed` | `45` | Harf başına ortalama gecikme (ms) |
| `typoRate` | `0.02` | Overstrike hata oranı, `0`–`0.2` |
| `overstrikeChar` | `'x'` | `'x' \| '-'` |
| `sound` | `false` | `true`: sentez ses; bir `SoundEngine` nesnesi verilirse o kullanılır |
| `volume` | `0.4` | Sentez ses seviyesi, `0`–`1` |
| `stamp` | `null` | `{ docNo, date, author, classification }` evrak üst bilgisi |
| `fonts` | `true` | Special Elite ve Courier Prime'ı Google Fonts'tan yükler |
| `respectReducedMotion` | `true` | `prefers-reduced-motion: reduce` aktifken animasyon ve sesi kapatır |

## API

- `instance.finished: Promise<void>`: yazım bittiğinde (veya atlandığında) çözülür.
- `instance.skip()`: devam eden animasyonu anında tamamlar.
- `instance.destroy()`: elemanları orijinal düğümleri, sınıfları ve stilleriyle eski hâline döndürür.
- `MechanicalSoundEngine`: ses motoru tek başına da kullanılabilir (`playKeyClick(isSpace)`, `playCarriageDing()`).

`data-daktilo-ignore` özniteliği taşıyan elemanlar ile `script`, `style`, `textarea`, `svg` içeriklerine dokunulmaz.

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

- **Erişilebilirlik:** Mürekkep kusurları inline `position: relative` span'lerle uygulanır; kelimeler bölünmez ve ekran okuyucular metni bütün okur. Hatalı harfler `aria-hidden` ve seçilemezdir. Yazım sürerken kapsayıcı `aria-busy="true"` taşır.
- **Performans:** Yalnızca kusur uygulanan harfler span'e alınır; kalan metin tek TextNode olarak birleşik kalır. Mevcut HTML elemanları ve event listener'lar korunur.
- **Autoplay politikası:** Ses bağlamı ilk `pointerdown`/`keydown` etkileşiminde sessizce açılır.

## Geliştirme

```bash
npm install
npm test          # vitest + jsdom
npm run typecheck
npm run build     # dist/: ESM, CJS, IIFE ve tipler
npm run size      # gzip boyutu < 5 KB kontrolü
npm run playground # derler ve http://127.0.0.1:5173/playground/ adresinde sunar
```

## Lisans

MIT

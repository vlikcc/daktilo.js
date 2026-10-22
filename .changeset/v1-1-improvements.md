---
'daktilo-js': minor
---

Yeni API'ler, hata düzeltmeleri ve ekosistem modülleri.

- Yeni: `pause()`, `resume()`, `paused`, `muted`, `setVolume()` ve `type(content)` (önceki yazım bitince yeni içerik yazar).
- Yeni seçenekler: `onChar`, `onLine`, `onComplete`, `startOnVisible`, `autoScroll`, `keyboard`, `styles`; `fonts` artık bir stil dosyası URL'si de alır; damgaya `labels` ve `locale` eklendi.
- Düzeltme: `&nbsp;` animasyondan sonra korunur; satır sonu algılaması kağıda göre ölçülür (iç içe kaydırmada yanlış çan çalmaz); birleşik aksanlar ve emoji dizileri bölünmez; `code`/`kbd`/`pre` içinde yazım hatası yapılmaz; `skip()` yazılmış kısmı ve mürekkep kusurlarını korur.
- Erişilebilirlik: yazım sürerken ekran okuyucular metnin tamamını görsel olarak gizli bir kopyadan okur; yazım fontlar yüklendikten sonra başlar.
- Yeni modüller: `daktilo-js/keyboards`, `daktilo-js/editor` (Yazar modu), `daktilo-js/react`, `daktilo-js/tailwind`, `daktilo-js/astro`, `daktilo-js/style.css`.
- Çekirdek boyut sınırı 5 KB'den 6 KB'ye (ESM, min + gzip) çıkarıldı; CJS/IIFE derlemeleri için üst sınır 6,5 KB.

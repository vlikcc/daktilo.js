# daktilo-js

Bu dosya [Changesets](https://github.com/changesets/changesets) tarafından güncellenir: yayımlanmamış değişiklikler `.changeset/` altındadır ve `changeset version` ile buraya eklenir.

## 1.0.0

### Major Changes

- İlk sürüm (MVP): üç kağıt teması (`vintage`, `clean`, `carbon`), organik mürekkep simülasyonu, overstrike yazım motoru, Web Audio ile dosyasız mekanik ses, evrak damgası, `skip()` / `destroy()`, SSR güvenliği ve `prefers-reduced-motion` desteği.
- İsteğe bağlı `daktilo-js/samples` modülü: gerçek daktilo kayıtlarını çalan `SampleSoundEngine`.

### Patch Changes

- Kayıtlı tuş vuruşları tam seviyede çalınır; kesimde tıkırtı olmasın diye yalnızca son 15 ms kısılır.
- Playground: hız ayarı saniyedeki harf sayısıyla gösterilir.

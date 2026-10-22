export type PaperPreset = 'vintage' | 'clean' | 'carbon';

export interface StampLabels {
  /** Varsayılan: 'KAYIT' */
  docNo?: string;
  /** Varsayılan: 'TARİH' */
  date?: string;
  /** Varsayılan: 'YAZAN' */
  author?: string;
}

export interface StampMetadata {
  docNo?: string;
  date?: string;
  author?: string;
  /** Örn: "TASLAK", "ARŞİV", "GİZLİ" */
  classification?: string;
  /** Alan etiketleri, ör. `{ docNo: 'REF', date: 'DATE', author: 'BY' }`. Varsayılan: Türkçe etiketler */
  labels?: StampLabels;
  /** `date` verilmezse bugünün tarihini biçimlendiren yerel ayar. Varsayılan: 'tr-TR' */
  locale?: string;
}

/** Yazım motorunun çaldığı sesler. Örnek sahiplenilir: `destroy()` onu da kapatır. */
export interface SoundEngine {
  playKeyClick(isSpace?: boolean): void;
  playCarriageDing(): void;
  dispose(): void;
  setVolume?(volume: number): void;
}

export interface DaktiloOptions {
  /** Varsayılan: 'vintage' */
  paper?: PaperPreset;
  /** Şerit/vurgu rengi. Varsayılan: kağıt temasının şerit rengi (vintage için '#c84b31'). */
  ribbonColor?: string;
  /** Varsayılan: '65ch' */
  maxWidth?: string;
  /** 0 (kapalı) ile 1 (yoğun eskime) arası. Varsayılan: 0.35 */
  inkWear?: number;
  /** Harf harf yazım animasyonu. Varsayılan: false */
  animate?: boolean;
  /** Ortalama yazım hızı (ms). Varsayılan: 45 */
  speed?: number;
  /** Gerçekçi daktilo hatası oranı (0 - 0.2). Varsayılan: 0.02 */
  typoRate?: number;
  /** Hata üzerine basılacak karakter. Varsayılan: 'x' */
  overstrikeChar?: 'x' | '-';
  /**
   * Hatalı tuşun seçildiği klavye satırları (küçük harf). Hazır düzenler `daktilo-js/keyboards` içindedir.
   * Varsayılan: Türkçe Q
   */
  keyboard?: readonly string[];
  /**
   * `true`: Web Audio ile dosyasız sentezlenen mekanik sesler.
   * Bir `SoundEngine` (ör. `daktilo-js/samples` içindeki `SampleSoundEngine`) verilirse o kullanılır.
   * Varsayılan: false
   */
  sound?: boolean | SoundEngine;
  /** Sentez ses seviyesi (0.0 - 1.0). Varsayılan: 0.4 */
  volume?: number;
  /** Üst evrak damgası. Varsayılan: null */
  stamp?: StampMetadata | null;
  /**
   * `true`: Special Elite ve Courier Prime fontlarını Google Fonts'tan yükler.
   * Bir URL verilirse fontlar o stil dosyasından (ör. kendi sunucunuzdan) yüklenir. Varsayılan: true
   */
  fonts?: boolean | string;
  /**
   * Çekirdek CSS'i bir `<style>` etiketiyle belgeye ekler. Katı CSP kullanan sayfalarda `false` verip
   * `daktilo-js/style.css` dosyasını kendiniz yükleyin. Varsayılan: true
   */
  styles?: boolean;
  /** prefers-reduced-motion: reduce aktifken animasyon ve sesi kapatır. Varsayılan: true */
  respectReducedMotion?: boolean;
  /** Yazım, kağıt ekranda görünür olduğunda başlar (IntersectionObserver). Varsayılan: false */
  startOnVisible?: boolean;
  /** Yazım sürerken imleci görünür alanda tutar. Varsayılan: false */
  autoScroll?: boolean;
  /** Her tuş vuruşunda çağrılır (atlanan kısım hariç). */
  onChar?: (char: string, element: HTMLElement) => void;
  /** Her satır başında (çan sesiyle birlikte) çağrılır. */
  onLine?: (element: HTMLElement) => void;
  /** İlk yazım bittiğinde (veya atlandığında) çağrılır; `destroy()` edilen örnekte çağrılmaz. */
  onComplete?: () => void;
}

type Callbacks = 'onChar' | 'onLine' | 'onComplete';

export interface ResolvedOptions
  extends Required<Omit<DaktiloOptions, 'ribbonColor' | Callbacks>>, Pick<DaktiloOptions, Callbacks> {
  ribbonColor: string | undefined;
}

export type DaktiloTarget = string | Element | ArrayLike<Element>;

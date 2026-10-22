export type PaperPreset = 'vintage' | 'clean' | 'carbon';

export interface StampMetadata {
  docNo?: string;
  date?: string;
  author?: string;
  /** Örn: "TASLAK", "ARŞİV", "GİZLİ" */
  classification?: string;
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
  /** Web Audio mekanik ses motoru. Varsayılan: false */
  sound?: boolean;
  /** Ses seviyesi (0.0 - 1.0). Varsayılan: 0.4 */
  volume?: number;
  /** Üst evrak damgası. Varsayılan: null */
  stamp?: StampMetadata | null;
  /** Special Elite ve Courier Prime fontlarını Google Fonts'tan yükler. Varsayılan: true */
  fonts?: boolean;
  /** prefers-reduced-motion: reduce aktifken animasyon ve sesi kapatır. Varsayılan: true */
  respectReducedMotion?: boolean;
}

export interface ResolvedOptions extends Required<Omit<DaktiloOptions, 'ribbonColor'>> {
  ribbonColor: string | undefined;
}

export type DaktiloTarget = string | Element | ArrayLike<Element>;

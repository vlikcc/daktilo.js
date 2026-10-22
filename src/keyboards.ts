// Hazır klavye düzenleri: `keyboard` seçeneğine verilir. Çekirdek pakette yalnızca Türkçe Q bulunur.
export { TURKISH_Q } from './keyboard';

/** Türkçe F klavye. */
export const TURKISH_F: readonly string[] = ['fgğıodrnhpqw', 'uieaütkmlyşx', 'jövcçzsb'];
/** İngilizce (ABD/BK) QWERTY. */
export const QWERTY: readonly string[] = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
/** Almanca QWERTZ. */
export const QWERTZ: readonly string[] = ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnm'];
/** Fransızca AZERTY. */
export const AZERTY: readonly string[] = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];
/** İspanyolca QWERTY. */
export const QWERTY_ES: readonly string[] = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];

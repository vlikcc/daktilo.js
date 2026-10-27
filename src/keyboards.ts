// Hazır klavye düzenleri: `keyboard` seçeneğine verilir. Çekirdek pakette yalnızca Türkçe Q bulunur.
export { TURKISH_Q } from './keyboard';

/** Turkish F layout. */
export const TURKISH_F: readonly string[] = ['fgğıodrnhpqw', 'uieaütkmlyşx', 'jövcçzsb'];
/** English (US/UK) QWERTY layout. */
export const QWERTY: readonly string[] = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
/** German QWERTZ layout. */
export const QWERTZ: readonly string[] = ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnm'];
/** French AZERTY layout. */
export const AZERTY: readonly string[] = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];
/** Spanish QWERTY layout. */
export const QWERTY_ES: readonly string[] = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];

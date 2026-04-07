import { messages } from './messages';

function getDeep(obj, path) {
  return path.split('.').reduce((o, k) => (o != null && o[k] !== undefined ? o[k] : undefined), obj);
}

/**
 * @param {'fr'|'en'} locale
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function translate(locale, key, vars) {
  const primary = messages[locale] || messages.fr;
  const fallback = messages.fr;
  let str = getDeep(primary, key) ?? getDeep(fallback, key) ?? key;
  if (typeof str !== 'string') return key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replaceAll(`{{${k}}}`, String(v));
    });
  }
  return str;
}

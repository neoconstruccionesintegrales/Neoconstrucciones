/* ==========================================================================
   FORMATTERS.JS — Utilidades ÚNICAS de formato para toda la intranet.
   Reemplaza la lógica duplicada de moneda y fechas repartida en los
   módulos (Nómina, Facturas, Cotizaciones, Liquidación, etc.).
   Uso:
     import { formatoCOP, formatoFecha, formatoFechaHora } from '../utils/formatters';
     formatoCOP(1250000)        → "$ 1.250.000"
     formatoFecha('2026-07-17') → "17/07/2026"
   ========================================================================== */

const ZONA_CO = 'America/Bogota';
const LOCALE_CO = 'es-CO';

/* ------------------------------------------------------------------
   MONEDA
   ------------------------------------------------------------------ */

/**
 * Formatea un número como pesos colombianos.
 * @param {number|string} valor
 * @param {{ decimales?: number }} opciones - por defecto 0 (COP sin centavos)
 * @returns {string} ej. "$ 1.250.000"
 */
export function formatoCOP(valor, { decimales = 0 } = {}) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '$ 0';
  return new Intl.NumberFormat(LOCALE_CO, {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero);
}

/**
 * Número con separador de miles, sin símbolo de moneda.
 * formatoNumero(1250000) → "1.250.000"
 */
export function formatoNumero(valor, { decimales = 0 } = {}) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '0';
  return new Intl.NumberFormat(LOCALE_CO, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero);
}

/**
 * Convierte texto de formulario ("$ 1.250.000" / "1250000,50") a número.
 * Devuelve 0 si no hay nada rescatable.
 */
export function parsearMonto(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : 0;
  if (!texto) return 0;
  const limpio = String(texto)
    .replace(/[^\d,.-]/g, '')   // fuera símbolos y espacios
    .replace(/\./g, '')          // puntos = miles en es-CO
    .replace(',', '.');          // coma = decimales
  const numero = parseFloat(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

/* ------------------------------------------------------------------
   FECHAS
   ------------------------------------------------------------------ */

/** Normaliza string/Date a Date válida o null. */
function aFecha(valor) {
  if (valor instanceof Date) return isNaN(valor) ? null : valor;
  if (!valor) return null;
  // "YYYY-MM-DD" se interpreta en hora LOCAL de Colombia, no UTC
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const fecha = new Date(valor);
  return isNaN(fecha) ? null : fecha;
}

/**
 * Fecha corta: formatoFecha('2026-07-17') → "17/07/2026"
 */
export function formatoFecha(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return '—';
  return new Intl.DateTimeFormat(LOCALE_CO, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: ZONA_CO,
  }).format(fecha);
}

/**
 * Fecha larga legible: → "17 de julio de 2026"
 */
export function formatoFechaLarga(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return '—';
  return new Intl.DateTimeFormat(LOCALE_CO, {
    day: 'numeric', month: 'long', year: 'numeric',
    timeZone: ZONA_CO,
  }).format(fecha);
}

/**
 * Fecha y hora: → "17/07/2026, 3:45 p. m."
 */
export function formatoFechaHora(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return '—';
  return new Intl.DateTimeFormat(LOCALE_CO, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: ZONA_CO,
  }).format(fecha);
}

/**
 * Hora sola: → "3:45 p. m."
 */
export function formatoHora(valor) {
  const fecha = aFecha(valor);
  if (!fecha) return '—';
  return new Intl.DateTimeFormat(LOCALE_CO, {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: ZONA_CO,
  }).format(fecha);
}

/**
 * Devuelve "YYYY-MM-DD" listo para <input type="date">.
 */
export function fechaParaInput(valor = new Date()) {
  const fecha = aFecha(valor);
  if (!fecha) return '';
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
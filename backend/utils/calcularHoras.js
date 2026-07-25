// ============================================
// CÁLCULO AUTOMÁTICO DE HORAS Y RECARGOS
// ============================================

const FACTOR_HORAS_MES = 240;

function aMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

function aHoraStr(minutos) {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function esDiurno(minutos) {
  const inicioDiurno = 6 * 60;
  const finDiurno = 21 * 60;
  return minutos >= inicioDiurno && minutos < finDiurno;
}

function horasEntre(inicio, fin) {
  if (fin <= inicio) return 0;
  return (fin - inicio) / 60;
}

function redondear(num) {
  return Math.round(num * 100) / 100;
}

/**
 * Calcula horas con almuerzo y breaks reales
 */
function calcularHoras(entrada, salida, calendarioDia, turnoAsignado, salarioBase, marcaAlmuerzoInicio, marcaAlmuerzoFin, breaks, horasAlmuerzoManual) {
  const valorHora = salarioBase / FACTOR_HORAS_MES;
  
  const entMin = aMinutos(entrada);
  const salMin = aMinutos(salida);
  
  let salMinReal = salMin;
  if (salMin <= entMin) salMinReal = salMin + 24 * 60;

  // Calcular almuerzo real
    // Calcular almuerzo
  let horasAlmuerzo;
  
  if (horasAlmuerzoManual !== null && horasAlmuerzoManual !== undefined) {
    // Obra: usa el valor que puso el supervisor (puede ser 0)
    horasAlmuerzo = Math.max(0, Math.min(2, horasAlmuerzoManual));
  } else if (marcaAlmuerzoInicio && marcaAlmuerzoFin) {
    // Planta/Residente: calcula de las marcas
    const almInicio = new Date(marcaAlmuerzoInicio);
    const almFin = new Date(marcaAlmuerzoFin);
    const minutosAlmuerzo = Math.min(120, Math.max(30, (almFin - almInicio) / (1000 * 60)));
    horasAlmuerzo = minutosAlmuerzo / 60;
  } else {
    // Default: 1 hora si no se especifica
    horasAlmuerzo = 1;
  }

  // Calcular breaks (no descuentan)
  let minutosBreaks = 0;
  if (breaks && breaks.length > 0) {
    breaks.forEach(b => {
      if (b.inicio && b.fin) {
        const inicioB = new Date(b.inicio);
        const finB = new Date(b.fin);
        minutosBreaks += (finB - inicioB) / (1000 * 60);
      }
    });
  }
  minutosBreaks = Math.min(30, minutosBreaks);

  // Horas totales trabajadas (almuerzo descuenta, breaks NO)
  const horasTotales = horasEntre(entMin, salMinReal);
  const horasEfectivas = Math.max(0, horasTotales - horasAlmuerzo);

  // Horas normales = mín(8, efectivas)
  const horasNormales = Math.min(8, horasEfectivas);
  
  // Horas faltantes = descuento
  const horasDescuento = Math.max(0, 8 - horasEfectivas);
  
  // Horas extras = solo si pasó de 8h
  const horasExtrasTotal = Math.max(0, horasEfectivas - 8);

  // SEPARAR EXTRAS POR TIPO
  let horasExtrasDiurnas = 0, horasExtrasNocturnas = 0;
  let horasExtrasDominical = 0, horasExtrasNocturnasDominical = 0;
  let recargoNocturno = 0, recargoDominical = 0;

  const esFestivoODomingo = calendarioDia.tipo === 'festivo' || calendarioDia.tipo === 'domingo';
  const finNormalesMin = entMin + (horasNormales * 60) + (horasAlmuerzo * 60);

  if (esFestivoODomingo) {
    recargoDominical = horasNormales;
    let extrasRestantes = horasExtrasTotal;
    let cursorMin = finNormalesMin;
    while (extrasRestantes > 0 && cursorMin < salMinReal) {
      const horaActual = cursorMin % (24 * 60);
      const esNocturna = !esDiurno(horaActual);
      const chunk = Math.min(1, extrasRestantes);
      if (esNocturna) horasExtrasNocturnasDominical += chunk;
      else horasExtrasDominical += chunk;
      extrasRestantes -= chunk;
      cursorMin += 60;
    }
  } else {
    let cursorMin = entMin;
    let normalesRestantes = horasNormales;
    while (normalesRestantes > 0 && cursorMin < finNormalesMin) {
      const horaActual = cursorMin % (24 * 60);
      if (!esDiurno(horaActual)) recargoNocturno += Math.min(1, normalesRestantes);
      normalesRestantes -= Math.min(1, normalesRestantes);
      cursorMin += 60;
    }
    let extrasRestantes = horasExtrasTotal;
    cursorMin = finNormalesMin;
    while (extrasRestantes > 0 && cursorMin < salMinReal) {
      const horaActual = cursorMin % (24 * 60);
      const esNocturna = !esDiurno(horaActual);
      const chunk = Math.min(1, extrasRestantes);
      if (esNocturna) horasExtrasNocturnas += chunk;
      else horasExtrasDiurnas += chunk;
      extrasRestantes -= chunk;
      cursorMin += 60;
    }
  }

  return {
    horasNormales: redondear(horasNormales),
    horasExtrasDiurnas: redondear(horasExtrasDiurnas),
    horasExtrasNocturnas: redondear(horasExtrasNocturnas),
    horasExtrasDominical: redondear(horasExtrasDominical),
    horasExtrasNocturnasDominical: redondear(horasExtrasNocturnasDominical),
    recargoNocturno: redondear(recargoNocturno),
    recargoDominical: redondear(recargoDominical),
    horasEfectivas: redondear(horasEfectivas),
    horasDescuento: redondear(horasDescuento),
    horasAlmuerzo: redondear(horasAlmuerzo),
    minutosBreaks: Math.round(minutosBreaks),
    
    // Valores monetarios
    valorExtrasDiurnas: redondear(horasExtrasDiurnas * valorHora * 1.25),
    valorExtrasNocturnas: redondear(horasExtrasNocturnas * valorHora * 1.75),
    valorExtrasDominical: redondear(horasExtrasDominical * valorHora * 2.0),
    valorExtrasNocturnasDom: redondear(horasExtrasNocturnasDominical * valorHora * 2.5),
    valorRecargoNocturno: redondear(recargoNocturno * valorHora * 0.35),
    valorRecargoDominical: redondear(recargoDominical * valorHora * 0.75),
    valorDescuento: redondear(horasDescuento * valorHora),
    
    entrada, salida, esFestivoODomingo
  };
}

module.exports = { calcularHoras, aMinutos, aHoraStr };
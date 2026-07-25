// ============================================
// CONSTANTES NÓMINA COLOMBIA 2026
// ============================================
const SMLV = 1750905;           // Salario Mínimo Legal Vigente 2026
const AUXILIO_TRANSPORTE = 249095;  // Auxilio de transporte/conectividad 2026
const TOPE_AUXILIO = SMLV * 2;       // $3.501.810 - tope para recibir auxilio

// ============================================
// NIVEL ARL POR ROL
// ============================================
const getNivelARLByRol = (rol) => {
  const arlMap = {
    'admin': 1, 'secretaria': 1, 'contabilidad': 1, 
    'comercial': 1, 'gerente': 1, 'cliente': 1,
    'residente': 2, 'supervisor': 3, 
    'oficial': 4, 'ayudante': 5
  };
  return arlMap[rol] || 1;
};

// ============================================
// CALCULAR VALOR HORA
// ============================================
const calcularValorHora = (sueldo, tipoContrato, tipoSalario) => {
  if (tipoSalario === 'por_hora' || tipoContrato === 'obra_labor') {
    return Math.round(sueldo / 240); // 240 horas mes legal Colombia
  }
  return 0; // No aplica para salario fijo
};

// ============================================
// DETERMINAR SI RECIBE AUXILIO TRANSPORTE
// ============================================
const debeRecibirAuxilio = (sueldo) => {
  // Solo recibe auxilio si sueldo <= 2 SMLV ($3.501.810)
  return sueldo <= TOPE_AUXILIO;
};

// ============================================
// CALCULAR AUXILIO TRANSPORTE EFECTIVO
// ============================================
const calcularAuxilioTransporte = (sueldo, diasTrabajados = 30) => {
  if (!debeRecibirAuxilio(sueldo)) return 0;
  // Proporcional por días trabajados
  return Math.round((AUXILIO_TRANSPORTE / 30) * diasTrabajados);
};

// ✅ UN SOLO module.exports AL FINAL
module.exports = { 
  SMLV, 
  AUXILIO_TRANSPORTE, 
  TOPE_AUXILIO,
  getNivelARLByRol, 
  calcularValorHora, 
  debeRecibirAuxilio,
  calcularAuxilioTransporte
};
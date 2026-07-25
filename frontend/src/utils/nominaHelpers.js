// ============================================
// CONSTANTES NÓMINA COLOMBIA 2026
// ============================================
export const SMLV = 1750905;
export const AUXILIO_TRANSPORTE = 249095;
export const TOPE_AUXILIO = SMLV * 2;

// ============================================
// NIVEL ARL POR ROL
// ============================================
export const getNivelARLByRol = (rol) => {
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
export const calcularValorHora = (sueldo, tipoContrato, tipoSalario) => {
  if (tipoSalario === 'por_hora' || tipoContrato === 'obra_labor') {
    return Math.round(sueldo / 240);
  }
  return 0;
};

// ============================================
// DETERMINAR SI RECIBE AUXILIO TRANSPORTE
// ============================================
export const debeRecibirAuxilio = (sueldo) => {
  return sueldo <= TOPE_AUXILIO;
};

// ============================================
// CALCULAR AUXILIO TRANSPORTE EFECTIVO
// ============================================
export const calcularAuxilioTransporte = (sueldo, diasTrabajados = 30) => {
  if (!debeRecibirAuxilio(sueldo)) return 0;
  return Math.round((AUXILIO_TRANSPORTE / 30) * diasTrabajados);
};
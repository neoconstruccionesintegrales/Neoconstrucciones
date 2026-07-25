/**
 * Utilidad para generar hitos segun el tipo de pago
 * Ahora recibe cuotas para personalizado y genera hitos con control de facturas
 */

function generarHitosPorTipo(tipoPago, totalProyecto, idFacturaPrimera, cuotasPersonalizado = 4) {
  const hitos = [];

  switch (tipoPago) {
    case 'unico':
      hitos.push({
        idHito: 'H-001',
        numeroHito: 1,
        nombre: 'Pago Único',
        descripcion: 'Pago total del servicio',
        porcentajePago: 100,
        porcentajePeso: 100,
        montoEstimado: totalProyecto,
        completado: false,
        facturaGenerada: !!idFacturaPrimera,
        idFactura: idFacturaPrimera || null,
        cubiertoPorSaldo: false,
        idFacturaSaldo: null,
        tipoPago: 'unico'
      });
      break;

    case 'anticipo_final':
      hitos.push(
        {
          idHito: 'H-001',
          numeroHito: 1,
          nombre: 'Anticipo',
          descripcion: 'Pago inicial del 40% para iniciar obra',
          porcentajePago: 40,
          porcentajePeso: 40,
          montoEstimado: Math.round(totalProyecto * 0.40),  
          completado: false,
          facturaGenerada: !!idFacturaPrimera,
          idFactura: idFacturaPrimera || null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'anticipo_final'
        },
        {
          idHito: 'H-002',
          numeroHito: 2,
          nombre: 'Entrega Final',
          descripcion: 'Pago del saldo del 60% al finalizar',
          porcentajePago: 60,
          porcentajePeso: 60,
          montoEstimado: totalProyecto * 0.60,
          completado: false,
          facturaGenerada: false,
          idFactura: null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'anticipo_final'
        }
      );
      break;

    case 'por_etapas':
      hitos.push(
        {
          idHito: 'H-001',
          numeroHito: 1,
          nombre: 'Anticipo',
          descripcion: 'Pago inicial del 40% para iniciar obra',
          porcentajePago: 40,
          porcentajePeso: 40,
          montoEstimado: totalProyecto * 0.40,
          completado: false,
          facturaGenerada: !!idFacturaPrimera,
          idFactura: idFacturaPrimera || null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'por_etapas'
        },
        {
          idHito: 'H-002',
          numeroHito: 2,
          nombre: 'Avance 50%',
          descripcion: 'Pago del 30% al alcanzar el 50% de avance',
          porcentajePago: 30,
          porcentajePeso: 30,
          montoEstimado: totalProyecto * 0.30,
          completado: false,
          facturaGenerada: false,
          idFactura: null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'por_etapas'
        },
        {
          idHito: 'H-003',
          numeroHito: 3,
          nombre: 'Entrega Final',
          descripcion: 'Pago del saldo restante del 30%',
          porcentajePago: 30,
          porcentajePeso: 30,
          montoEstimado: totalProyecto * 0.30,
          completado: false,
          facturaGenerada: false,
          idFactura: null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'por_etapas'
        }
      );
      break;

    case 'personalizado':
      // Usar cuotas del frontend (default 4 si no viene)
      const cuotas = Number(cuotasPersonalizado) || 4;
      const primeraCuota = 40;
      const resto = 100 - primeraCuota;
      const valorResto = resto / (cuotas - 1);

      hitos.push({
        idHito: 'H-001',
        numeroHito: 1,
        nombre: 'Primera Cuota',
        descripcion: `Pago inicial del ${primeraCuota}%`,
        porcentajePago: primeraCuota,
        porcentajePeso: primeraCuota,
        montoEstimado: totalProyecto * (primeraCuota / 100),
        completado: false,
        facturaGenerada: !!idFacturaPrimera,
        idFactura: idFacturaPrimera || null,
        cubiertoPorSaldo: false,
        idFacturaSaldo: null,
        tipoPago: 'personalizado'
      });

      for (let i = 1; i < cuotas; i++) {
        hitos.push({
          idHito: `H-00${i + 1}`,
          numeroHito: i + 1,
          nombre: `Cuota ${i + 1}`,
          descripcion: `Pago de cuota ${i + 1} (${valorResto.toFixed(1)}%)`,
          porcentajePago: valorResto,
          porcentajePeso: valorResto,
          montoEstimado: totalProyecto * (valorResto / 100),
          completado: false,
          facturaGenerada: false,
          idFactura: null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'personalizado'
        });
      }
      break;

    default:
      // Por defecto: anticipo + final
      hitos.push(
        {
          idHito: 'H-001',
          numeroHito: 1,
          nombre: 'Anticipo',
          descripcion: 'Pago inicial del 40% para iniciar obra',
          porcentajePago: 40,
          porcentajePeso: 40,
          montoEstimado: totalProyecto * 0.40,
          completado: false,
          facturaGenerada: !!idFacturaPrimera,
          idFactura: idFacturaPrimera || null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'anticipo_final'
        },
        {
          idHito: 'H-002',
          numeroHito: 2,
          nombre: 'Entrega Final',
          descripcion: 'Pago del saldo del 60% al finalizar',
          porcentajePago: 60,
          porcentajePeso: 60,
          montoEstimado: totalProyecto * 0.60,
          completado: false,
          facturaGenerada: false,
          idFactura: null,
          cubiertoPorSaldo: false,
          idFacturaSaldo: null,
          tipoPago: 'anticipo_final'
        }
      );
  }

  return hitos;
}

/**
 * Calcular el siguiente hito pendiente de un proyecto
 */

function obtenerSiguienteHitoPendiente(hitos) {
  if (!hitos || hitos.length === 0) return null;
  return hitos.find(h => !h.completado && !h.facturaGenerada) || null;
}

/**
 * Verificar si un hito puede ser completado (el anterior debe estar completado)
 */

function puedeCompletarHito(hitos, idHito) {
  if (!hitos || hitos.length === 0) return false;
  const index = hitos.findIndex(h => h.idHito === idHito);
  if (index === -1) return false;
  if (index === 0) return true; // El primero siempre se puede completar
  return hitos[index - 1].completado === true;
}

/**
 * Obtener el porcentaje total ya facturado de los hitos
 */

function obtenerPorcentajeFacturado(hitos) {
  if (!hitos || hitos.length === 0) return 0;
  return hitos.reduce((acc, h) => acc + (h.facturaGenerada ? h.porcentajePago : 0), 0);
}

function cubrirHitosPorSaldo(hitos, idsHitos, idFacturaSaldo) {
  if (!hitos) return [];
  return hitos.map(h => {
    if (idsHitos.includes(h.idHito)) {
      return { 
        ...h, 
        cubiertoPorSaldo: true, 
        idFacturaSaldo, 
        facturaGenerada: true 
      };
    }
    return h;
  });
}

function obtenerHitosDisponiblesParaFactura(hitos) {
  if (!hitos) return [];
  return hitos.filter(h => 
    !h.completado && !h.facturaGenerada && !h.cubiertoPorSaldo
  );
}

function obtenerHitosCubiertoPorSaldo(hitos) {
  if (!hitos) return [];
  return hitos.filter(h => h.cubiertoPorSaldo);
}

module.exports = { 
  generarHitosPorTipo,
  obtenerSiguienteHitoPendiente,
  puedeCompletarHito,
  obtenerPorcentajeFacturado,
  cubrirHitosPorSaldo,          
  obtenerHitosDisponiblesParaFactura, 
  obtenerHitosCubiertoPorSaldo   
};
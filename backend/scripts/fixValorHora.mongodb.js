// 1. Selecciona tu base de datos (cambia 'neoconstrucciones' por el nombre real)
use('neoconstrucciones');

// 2. Función para calcular valor hora
function calcularValorHora(sueldo, tipoContrato, tipoSalario) {
  if (tipoSalario === 'por_hora' || tipoContrato === 'obra_labor') {
    return Math.round(Number(sueldo) / 240);
  }
  return 0;
}

// 3. Obtener todos los usuarios
const usuarios = db.usuarios.find({}).toArray();
let actualizados = 0;

// 4. Recorrer y actualizar
for (const u of usuarios) {
  const valorHoraCorrecto = calcularValorHora(u.sueldo, u.tipoContrato, u.tipoSalario);

  // Solo actualiza si está en 0, undefined, o es diferente al cálculo correcto
  if (!u.valorHora || u.valorHora !== valorHoraCorrecto) {
    db.usuarios.updateOne(
      { _id: u._id },
      { $set: { valorHora: valorHoraCorrecto } }
    );
    print(`✅ ${u.nombre}: $${valorHoraCorrecto.toLocaleString('es-CO')} (${u.tipoSalario || 'sin tipo'})`);
    actualizados++;
  }
}

print(`\n🎉 Listo. ${actualizados} usuarios actualizados.`);
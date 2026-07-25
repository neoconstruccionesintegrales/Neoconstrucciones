use('neoconstrucciones'); // Asegúrate de que el nombre sea exactamente el de tu BD
db.proyectos.updateOne(
  { idProyecto: "PRY-006" },  // ← Cambia por tu ID de proyecto
  {
    $set: {
      "hitos.$[elem].cubiertoPorSaldo": false,
      "hitos.$[elem].idFacturaSaldo": null,
      "hitos.$[elem].facturaGenerada": false,
      "hitos.$[elem].completado": false,
      "hitos.$[elem].fechaCompletado": null,
      "hitos.$[elem].idFactura": null
    }
  },
  {
    arrayFilters: [
      { "elem.idFacturaSaldo": "FAC-02" }  // ← ID de la factura anulada
    ]
  }
)
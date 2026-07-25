import React from 'react';

// Pasamos los servicios como 'props' desde la página principal
const TablaServicios = ({ servicios, alEditar }) => {
  return (
    <div className="tabla-contenedor">
      <h3>Catálogo de Servicios Unificados</h3>
      <table>
        <thead>
          <tr>
            <th>Código ID</th>
            <th>Descripción Ítem</th>
            <th>Precio Venta</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((servicio) => (
            <tr key={servicio._id}>
              {/* Aquí manejas la lógica de si viene como número string '1' o con prefijo 'EST-PESADA' */}
              <td className="id-resaltado">{servicio.idServicio}</td>
              <td>{servicio.nombre}</td>
              <td>${servicio.precioUnitario?.toLocaleString()}</td>
              <td>
                <button onClick={() => alEditar(servicio)} className="btn-editar">
                  ✏️ Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaServicios;
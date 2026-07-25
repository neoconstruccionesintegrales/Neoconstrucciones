import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ListaCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);

  useEffect(() => {
    const cargarCotizaciones = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/cotizaciones');
        setCotizaciones(res.data.data);
      } catch (e) {
        console.error("Error al cargar listado", e);
      }
    };
    cargarCotizaciones();
  }, []);

  // Función para colores de estado
  const obtenerEstiloEstado = (estado) => {
    switch(estado) {
      case 'Aprobada': return { backgroundColor: '#d4edda', color: '#155724', padding: '5px', borderRadius: '4px' };
      case 'Rechazada': return { backgroundColor: '#f8d7da', color: '#721c24', padding: '5px', borderRadius: '4px' };
      case 'Caducada': return { backgroundColor: '#e2e3e5', color: '#383d41', padding: '5px', borderRadius: '4px' };
      case 'Superada': return { backgroundColor: '#e9ecef', color: '#6c757d', padding: '5px', borderRadius: '4px' }; // Color neutro para versiones antiguas
      default: return { backgroundColor: '#fff3cd', color: '#856404', padding: '5px', borderRadius: '4px' }; // Pendiente
    }
  };

  const manejarEdicion = (id) => {
    // Aquí iría tu lógica de navegación, ej: navigate(`/editar/${id}`)
    console.log("Redirigiendo a edición:", id);
  };

  return (
    <div>
      <h2>Historial de Cotizaciones</h2>
      <table>
        <thead>
          <tr>
            <th>ID Cotización</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th> {/* Columna nueva */}
          </tr>
        </thead>
        <tbody>
          {cotizaciones.map((c) => (
            <tr key={c._id}>
              <td>{c.idCotizacion}</td>
              <td>{c.idCliente}</td>
              <td>${c.total?.toLocaleString()}</td>
              <td>
                <span style={obtenerEstiloEstado(c.estado_general)}>
                  {c.estado_general}
                </span>
              </td>
              <td>
                {/* Botón deshabilitado si el estado es Superada */}
                <button onClick={() => 
                /* tu funcion de edicion */}
                disabled={c.estado_general === 'Superada'}
                style={{
                ...{ padding: '5px 10px' }, // tus estilos actuales
                opacity: c.estado_general === 'Superada' ? 0.5 : 1, // Atenúa el color si está bloqueado
                cursor: c.estado_general === 'Superada' ? 'not-allowed' : 'pointer' // Cambia el cursor
                }}
                >
               {c.estado_general === 'Superada' ? 'Bloqueado' : 'Editar / Gestionar'}
              </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListaCotizaciones;
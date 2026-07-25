// components/SeguimientosTimeline.jsx
import React from 'react';

const TIPO_COLORES = {
    avance: 'verde',
    novedad: 'amarillo',
    retraso: 'rojo',
    visita: 'azul',
    entrega: 'morado',
    pago: 'naranja'
};

export default function SeguimientosTimeline({ seguimientos }) {
    if (!seguimientos || seguimientos.length === 0) {
        return <p>No hay seguimientos registrados</p>;
    }

    return (
        <div className="timeline">
            {seguimientos.map((seg, index) => (
                <div key={index} className={`timeline-item ${TIPO_COLORES[seg.tipo]}`}>
                    <div className="timeline-fecha">
                        {new Date(seg.fecha).toLocaleDateString('es-CO')}
                    </div>
                    <div className="timeline-contenido">
                        <span className="timeline-tipo">{seg.tipo.toUpperCase()}</span>
                        <p className="timeline-descripcion">{seg.descripcion}</p>
                        {seg.porcentajeAvance > 0 && (
                            <span className="timeline-avance">Avance: {seg.porcentajeAvance}%</span>
                        )}
                        {seg.evidencias && seg.evidencias.length > 0 && (
                            <div className="timeline-evidencias">
                                {seg.evidencias.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                        📎 Evidencia {i + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                        <small>Por: {seg.creadoPor}</small>
                    </div>
                </div>
            ))}
        </div>
    );
}
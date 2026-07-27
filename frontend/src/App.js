import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { esAdmin } from './utils/utils.js';
import './style/scroll-effects.css';

// Componentes Públicos
import Inicio from './components/Inicio';
import Nosotros from './components/Nosotros';
import Simulador from './pages/Simulador';
import Citas from './pages/Citas';
import Contacto from './pages/Contacto';
import GaleriaVideos from './pages/GaleriaVideos';

// Componentes de la Intranet (Privados)
import Login from './pages/Login';
import AdminHeader from './components/AdminHeader';
import Admin from './pages/Admin';
import GestionUsuarios from './pages/GestionUsuarios';
import Servicios from './pages/Servicios';
import Dashboard from './pages/Dashboard';
import Nomina from './pages/Nomina';
import RegistroAsistencia from './pages/RegistroAsistencia';
import AprobacionExtras from './pages/AprobacionExtras';
import GestionNovedades from './pages/GestionNovedades';
import GenerarNomina from './pages/GenerarNomina';
import ComprobantePago from './pages/ComprobantePago';
import Liquidacion from './pages/Liquidacion';
import LiquidacionesHistorial from './pages/LiquidacionesHistorial';
import Proyectos from './pages/Proyectos';
import Facturas from './pages/Facturas';
import RegistroLaboral from './components/RegistroLaboral.jsx';
import Clientes from './pages/Clientes';
import Cotizacion from './pages/Cotizacion';
import GestionCotizaciones from './pages/GestionCotizaciones';
import EditarCotizacion from './pages/EditarCotizacion';
import GestionDescuentos from './pages/GestionDescuentos'; 
import ConsignacionCesantias from './pages/ConsignacionCesantias';

import './App.css';

function App() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('auth') === 'true');

  useEffect(() => {
    const checkAuth = () => {
      setIsAuth(localStorage.getItem('auth') === 'true');
    };
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const PrivateRoute = ({ children }) => {
    return isAuth ? <>{children}</> : <Navigate to="/login" />;
  };

  const ProtectedAdminRoute = ({ children }) => {
    return esAdmin() ? <>{children}</> : <Navigate to="/admin" />;
  };

  // Helper para proteger por rol
  const RoleRoute = ({ children, allowedRoles }) => {
    const rol = localStorage.getItem('rol');
    if (!isAuth) return <Navigate to="/login" />;
    if (!allowedRoles.includes(rol)) return <Navigate to="/admin" />;
    return <>{children}</>;
  };

  return (
    <div lang="es" style={{ 
      backgroundColor: '#fff', 
      color: '#000', 
      minHeight: '100vh', 
      margin: 0,
      padding: 0 
    }}>

      <Router>
        <Routes>
          {/* ==========================================
              🌐 SECCIÓN PÚBLICA
              ========================================== */}
          <Route path="/" element={<Inicio />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/agendar-cita" element={<Citas />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/galeria-videos" element={<GaleriaVideos />} />

          {/* ==========================================
              🔐 PANTALLA DE ACCESO (LOGIN)
              ========================================== */}
          <Route path="/login" element={
            isAuth ? <Navigate to="/admin" /> : <Login setIsAuth={setIsAuth} />
          } />

          {/* ==========================================
              ⚙️ INTRANET PROTEGIDA
              ========================================== */}

          {/* Rutas que requieren estar logueado (Cualquiera) */}
          <Route path="/admin" element={
            <PrivateRoute><AdminHeader /><Admin /></PrivateRoute>
          } />

          <Route path="/registro-laboral" element={
            <PrivateRoute><AdminHeader /><RegistroLaboral /></PrivateRoute>
          } />

          {/* Rutas que requieren ser ADMINISTRADOR */}
          <Route path="/gestion-usuarios" element={
            <PrivateRoute><ProtectedAdminRoute><AdminHeader />
            <GestionUsuarios /></ProtectedAdminRoute></PrivateRoute>
          } />

          {/* ==========================================
              💼 MÓDULO DE NÓMINA
              ========================================== */}

          {/* Dashboard de Nómina - Todos los autenticados */}
          <Route path="/nomina" element={
            <PrivateRoute><AdminHeader /><Nomina /></PrivateRoute>
          } />

          {/* Registro de Asistencia - Admin, Gerente, Secretaria, Supervisor */}
          <Route path="/nomina/asistencia" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente', 'secretaria', 'supervisor']}>
              <AdminHeader /><RegistroAsistencia />
            </RoleRoute></PrivateRoute>
          } />

          {/* Aprobar Extras - Solo Gerente/Admin */}
          <Route path="/nomina/aprobar-extras" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente']}>
              <AdminHeader /><AprobacionExtras />
            </RoleRoute></PrivateRoute>
          } />

          {/* Novedades - Admin, Gerente, Secretaria */}
          <Route path="/nomina/novedades" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente', 'secretaria']}>
              <AdminHeader /><GestionNovedades />
            </RoleRoute></PrivateRoute>
          } />

          {/* Generar Nómina - Admin, Gerente, Secretaria */}
          <Route path="/nomina/generar" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente', 'secretaria']}>
              <AdminHeader /><GenerarNomina />
            </RoleRoute></PrivateRoute>
          } />

          {/* GESTIÓN DE DESCUENTOS - Admin, Gerente, Contabilidad */}
          <Route path="/nomina/descuentos" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente', 'contabilidad']}>
              <AdminHeader /><GestionDescuentos />
            </RoleRoute></PrivateRoute>
          } />

           {/* CESANTIAS-FONDO */}
          <Route path="/nomina/cesantias-fondo" element={
           <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente', 'contabilidad']}>
              <AdminHeader /><ConsignacionCesantias />
          </RoleRoute></PrivateRoute>
          } />
          
          {/* Comprobantes - Todos los roles */}
          <Route path="/nomina/comprobantes" element={
            <PrivateRoute><AdminHeader /><ComprobantePago /></PrivateRoute>
          } />

          {/* Reportes - Admin, Gerente, Contabilidad */}
          <Route path="/nomina/reportes" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente', 'contabilidad']}>
              <AdminHeader /><GenerarNomina /> {/* O un componente ReportesNomina si lo creas */}
            </RoleRoute></PrivateRoute>
          } />

          {/* Liquidación - Solo Admin/Gerente */}
          <Route path="/nomina/liquidacion" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente']}>
              <AdminHeader /><Liquidacion />
            </RoleRoute></PrivateRoute>
          } />

          {/* Liquidación - Solo Admin/Gerente */}
          <Route path="/liquidaciones-historial" element={
            <PrivateRoute><RoleRoute allowedRoles={['admin', 'gerente']}>
              <AdminHeader /><LiquidacionesHistorial/>
            </RoleRoute></PrivateRoute>
          } />
          

          {/* Rutas existentes */}
          <Route path="/admin-servicios" element={
            <PrivateRoute><AdminHeader /><Servicios /></PrivateRoute>
          } />

          <Route path="/admin-dashboard" element={
            <PrivateRoute><AdminHeader /><Dashboard /></PrivateRoute>
          } />

          <Route path="/proyectos" element={
            <PrivateRoute><AdminHeader /><Proyectos /></PrivateRoute>
          } />

          <Route path="/facturas" element={
            <PrivateRoute><AdminHeader /><Facturas/></PrivateRoute>
          } />

          <Route path="/clientes" element={
            <PrivateRoute><AdminHeader /><Clientes /></PrivateRoute>
          } />

          <Route path="/cotizacion" element={
            <PrivateRoute><AdminHeader /><Cotizacion /></PrivateRoute>
          } />

          <Route path="/gestion-cotizaciones" element={
            <PrivateRoute><AdminHeader /><GestionCotizaciones /></PrivateRoute>
          } />

          <Route path="/editar-cotizacion/:id" element={
            <PrivateRoute><AdminHeader /><EditarCotizacion /></PrivateRoute>
          } />

          {/* Redirección de seguridad */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
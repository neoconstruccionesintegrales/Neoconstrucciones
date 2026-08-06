import React, { useState } from 'react';
import '../style/login.css';

function Login({ setIsAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('auth', 'true');
        localStorage.setItem('rol', data.rol.toLowerCase());
        localStorage.setItem('email', data.email);

        setIsAuth(true);
      } else {
        setError(data.error || 'Credenciales incorrectas.');
      }
    } catch (err) {
      setError('No se pudo establecer conexión con el servidor de Neoconstrucciones.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Acceso Privado</h1>
        <p className="login-subtitle">Neoconstrucciones S.A.S</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            className="login-input"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="login-input"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn">
            🔓 Iniciar Sesión
          </button>
        </form>

        <div className="login-help">
          <p><strong>Acceso Seguro:</strong> Gestión de base de datos </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
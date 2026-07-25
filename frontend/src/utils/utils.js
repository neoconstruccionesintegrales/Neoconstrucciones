// src/utils/authUtils.js
export const esAdmin = () => {
    const rol = localStorage.getItem('rol');
    return rol?.toLowerCase() === 'admin'|| rol === 'gerente';
};
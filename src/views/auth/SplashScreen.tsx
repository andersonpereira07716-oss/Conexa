import React from 'react';

export const SplashScreen: React.FC = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F17', color: '#F8FAFC' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#6366F1', letterSpacing: '2px' }}>CONEXA</h1>
      <p style={{ color: '#94A3B8', marginTop: '8px' }}>Carregando sua rede social...</p>
    </div>
  );
};

import React from 'react';

export const LandingView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg)', height: '100vh', color: 'var(--text)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '3rem', color: '#6366F1', marginBottom: '12px' }}>CONEXA</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Conecte-se com pessoas, comunidades e oportunidades em um só lugar.</p>
      
      <button onClick={() => onNavigate('login')} style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#6366F1', color: '#FFF', fontWeight: 'bold', marginBottom: '12px' }}>
        Entrar na Conta
      </button>
      
      <button onClick={() => onNavigate('register')} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontWeight: 'bold' }}>
        Criar Nova Conta
      </button>
    </div>
  );
};

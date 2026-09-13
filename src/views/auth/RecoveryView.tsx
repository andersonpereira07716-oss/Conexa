import React, { useState } from 'react';

export const RecoveryView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: '#6366F1' }}>Recuperar Senha</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Digite seu e-mail cadastrado para receber as instruções</p>

      {!sent ? (
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="email" 
            placeholder="Seu e-mail" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: '#FFF', width: '100%', boxSizing: 'border-box' }} 
          />
          <button 
            type="submit" 
            style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#6366F1', color: '#FFF', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer' }}
          >
            Enviar Instruções
          </button>
        </form>
      ) : (
        <div style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid #10B981', borderRadius: '12px', marginBottom: '20px', color: '#10B981' }}>
          E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.
        </div>
      )}

      <p style={{ color: '#06B6D4', textAlign: 'center', marginTop: '24px', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => onNavigate('login')}>
        Voltar para o Login
      </p>
    </div>
  );
};
export default RecoveryView;

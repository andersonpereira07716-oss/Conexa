import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err?.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : (err?.message || 'Erro ao entrar.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0B0F17', minHeight: '100vh', color: '#F8FAFC', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Entrar na CONEXA</h2>
      <p style={{ color: '#94A3B8', marginBottom: '24px' }}>Digite seus dados para acessar sua conta</p>

      {error && (
        <p style={{ color: '#FF5555', backgroundColor: '#2A1215', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem' }}>
          {error}
        </p>
      )}

      <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#161F30', border: '1px solid #1E293B', color: '#FFF', marginBottom: '16px' }} />
      <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#161F30', border: '1px solid #1E293B', color: '#FFF', marginBottom: '16px' }} />

      <button onClick={handleLogin} disabled={submitting} style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: submitting ? '#334155' : '#6366F1', color: '#FFF', fontWeight: 'bold', marginBottom: '16px', cursor: submitting ? 'default' : 'pointer' }}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>

      <p style={{ color: '#06B6D4', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center' }} onClick={() => onNavigate('register')}>
        Não tem conta? Cadastre-se
      </p>
      <p style={{ color: '#94A3B8', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', marginTop: '8px' }} onClick={() => onNavigate('landing')}>
        Voltar para a página inicial
      </p>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const RegisterView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await signUp(email.trim(), password, fullName.trim());
      if (!data?.session) {
        setInfo('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
      }
    } catch (err: any) {
      setError(err?.message === 'User already registered' ? 'Esse e-mail já está cadastrado.' : (err?.message || 'Erro ao cadastrar.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: '#6366F1' }}>Criar Conta</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Preencha os dados abaixo para começar na CONEXA</p>
      {error && (<p style={{ color: '#FF5555', backgroundColor: '#2A1215', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.85rem' }}>{error}</p>)}
      {info && (<p style={{ color: '#4ADE80', backgroundColor: '#132A1D', padding: '10px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.85rem' }}>{info}</p>)}
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input type="text" placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: '#FFF', width: '100%', boxSizing: 'border-box' }} />
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: '#FFF', width: '100%', boxSizing: 'border-box' }} />
        <input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: '#FFF', width: '100%', boxSizing: 'border-box' }} />
        <button type="submit" disabled={submitting} style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: submitting ? '#334155' : '#6366F1', color: '#FFF', fontWeight: 'bold', marginTop: '12px', cursor: submitting ? 'default' : 'pointer' }}>{submitting ? 'Cadastrando...' : 'Cadastrar'}</button>
      </form>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '24px' }}>Já possui uma conta?{' '}<span style={{ color: '#06B6D4', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('login')}>Entrar</span></p>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => onNavigate('landing')}>Voltar ao início</p>
    </div>
  );
};
export default RegisterView;

import React from 'react';

export const OnboardingView: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div style={{ padding: '24px', backgroundColor: '#0B0F17', minHeight: '100vh', color: '#F8FAFC', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '1.8rem', color: '#6366F1', marginBottom: '8px' }}>Conta Criada!</h2>
        <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>Personalize seu perfil para começar a explorar a CONEXA.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input 
          type="text" 
          placeholder="Nome de usuário (@exemplo)" 
          style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#161F30', border: '1px solid #1E293B', color: '#FFF', width: '100%', boxSizing: 'border-box' }} 
        />
        <textarea 
          placeholder="Conte um pouco sobre você (Bio)..." 
          rows={3}
          style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#161F30', border: '1px solid #1E293B', color: '#FFF', width: '100%', boxSizing: 'border-box', resize: 'none' }} 
        />
      </div>

      <button 
        onClick={() => onNavigate('home')} 
        style={{ padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#6366F1', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Concluir e Ir para o Feed
      </button>
    </div>
  );
};
export default OnboardingView;

import React, { useState } from 'react';
import { supabase } from '../../services/supabase';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366F1, #818CF8)',
  'linear-gradient(135deg, #06B6D4, #22D3EE)',
  'linear-gradient(135deg, #F472B6, #FB7185)',
  'linear-gradient(135deg, #34D399, #6EE7B7)',
  'linear-gradient(135deg, #FBBF24, #FCD34D)',
];

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

interface Props {
  onSelectUser: (userId: string) => void;
}

export const SearchUsersView: React.FC<Props> = ({ onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
      .limit(20);
    if (!error && data) setResults(data);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px', boxSizing: 'border-box', maxWidth: '560px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: 700 }}>Buscar pessoas</h2>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome ou @usuário"
          style={{ flex: 1, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px 16px', color: '#FFF', fontSize: '0.9rem', outline: 'none' }}
        />
        <button type="submit" disabled={!query.trim()} style={{ background: query.trim() ? '#6366F1' : '#334155', border: 'none', color: '#FFF', borderRadius: '14px', padding: '0 20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
          Buscar
        </button>
      </form>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Buscando...</p>
      ) : searched && results.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum usuário encontrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {results.map((p) => {
            const displayName = p.full_name || 'Usuário CONEXA';
            const handle = '@' + (p.username || 'usuario');
            const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
            return (
              <div
                key={p.id}
                onClick={() => onSelectUser(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px 14px', cursor: 'pointer' }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avatarColor(handle), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--bg)', flexShrink: 0 }}>
                  {initial}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{displayName}</p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{handle}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default SearchUsersView;

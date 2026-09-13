import React, { useEffect, useState } from 'react';
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
  userId: string;
  mode: 'followers' | 'following';
  onBack: () => void;
  onSelectUser: (userId: string) => void;
}

export const FollowListView: React.FC<Props> = ({ userId, mode, onBack, onSelectUser }) => {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      const column = mode === 'followers' ? 'followed_id' : 'follower_id';
      const targetColumn = mode === 'followers' ? 'follower_id' : 'followed_id';
      const { data: relations } = await supabase.from('follows').select(targetColumn).eq(column, userId);
      const ids = (relations || []).map((r: any) => r[targetColumn]);
      if (ids.length === 0) {
        setPeople([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
      setPeople(profiles || []);
      setLoading(false);
    };
    fetchList();
  }, [userId, mode]);

  const title = mode === 'followers' ? 'Seguidores' : 'Seguindo';

  return (
    <div style={{ padding: '20px', paddingBottom: '90px', boxSizing: 'border-box', maxWidth: '560px', margin: '0 auto', color: '#F8FAFC' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.85rem', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>← Voltar</button>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: 700 }}>{title}</h2>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748B' }}>Carregando...</p>
      ) : people.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748B' }}>{mode === 'followers' ? 'Ninguém segue essa conta ainda.' : 'Ainda não segue ninguém.'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {people.map((p) => {
            const displayName = p.full_name || 'Usuário CONEXA';
            const handle = '@' + (p.username || 'usuario');
            const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
            return (
              <div
                key={p.id}
                onClick={() => onSelectUser(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#161F30', border: '1px solid #232C3D', borderRadius: '14px', padding: '12px 14px', cursor: 'pointer' }}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avatarColor(handle), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#0B0F17', flexShrink: 0 }}>
                    {initial}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{displayName}</p>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{handle}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default FollowListView;

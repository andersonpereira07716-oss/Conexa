import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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

export const ProfileProvisorioView: React.FC = () => {
  const { user, signOut } = useAuth();
  const [postsCount, setPostsCount] = useState<number | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  const fullName = (user?.user_metadata?.full_name as string) || 'Usuário CONEXA';
  const handle = '@' + (user?.email?.split('@')[0] || 'usuario');
  const initial = fullName.trim().charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;
      const { count: posts } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setPostsCount(posts ?? 0);
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', user.id);
      setFollowersCount(followers ?? 0);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
      setFollowingCount(following ?? 0);
    };
    fetchCounts();
  }, [user]);

  return (
    <div style={{ padding: '20px', color: '#F8FAFC', paddingBottom: '90px', boxSizing: 'border-box', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '24px' }}>
        <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: avatarColor(handle), margin: '0 auto 12px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#0B0F17', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>{initial}</div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700 }}>{fullName}</h3>
        <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem' }}>{handle}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#161F30', border: '1px solid #232C3D', padding: '18px', borderRadius: '16px', marginBottom: '24px', textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
        <div><strong style={{ display: 'block', fontSize: '1.15rem' }}>{postsCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Publicações</span></div>
        <div><strong style={{ display: 'block', fontSize: '1.15rem' }}>{followersCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguidores</span></div>
        <div><strong style={{ display: 'block', fontSize: '1.15rem' }}>{followingCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguindo</span></div>
      </div>

      <div style={{ backgroundColor: '#161F30', border: '1px solid #232C3D', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '15px 16px', borderBottom: '1px solid #232C3D', fontSize: '0.9rem', cursor: 'pointer' }}>⚙️ Configurações da Conta</div>
        <div style={{ padding: '15px 16px', borderBottom: '1px solid #232C3D', fontSize: '0.9rem', cursor: 'pointer' }}>🔒 Privacidade e Segurança</div>
        <div onClick={signOut} style={{ padding: '15px 16px', color: '#EF4444', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>🚪 Sair da Conta</div>
      </div>
    </div>
  );
};
export default ProfileProvisorioView;

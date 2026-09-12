import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

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
    <div style={{ padding: '20px', color: '#F8FAFC', paddingBottom: '80px', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#6366F1', margin: '0 auto 12px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', border: '2px solid #818CF8' }}>{initial}</div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>{fullName}</h3>
        <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem' }}>{handle}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#161F30', border: '1px solid #1E293B', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
        <div><strong style={{ display: 'block', fontSize: '1.1rem' }}>{postsCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Publicações</span></div>
        <div><strong style={{ display: 'block', fontSize: '1.1rem' }}>{followersCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguidores</span></div>
        <div><strong style={{ display: 'block', fontSize: '1.1rem' }}>{followingCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguindo</span></div>
      </div>

      <div style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E293B', fontSize: '0.9rem', cursor: 'pointer' }}>⚙️ Configurações da Conta</div>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E293B', fontSize: '0.9rem', cursor: 'pointer' }}>🔒 Privacidade e Segurança</div>
        <div onClick={signOut} style={{ padding: '14px 16px', color: '#EF4444', fontSize: '0.9rem', cursor: 'pointer' }}>🚪 Sair da Conta</div>
      </div>
    </div>
  );
};
export default ProfileProvisorioView;

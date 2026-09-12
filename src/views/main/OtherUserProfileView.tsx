import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

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
  onBack: () => void;
}

export const OtherUserProfileView: React.FC<Props> = ({ userId, onBack }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      setProfile(profileData);

      const { data: postsData } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setPosts(postsData || []);

      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId);
      setFollowersCount(followers ?? 0);

      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId);
      setFollowingCount(following ?? 0);

      if (user) {
        const { data: followRow } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('followed_id', userId).maybeSingle();
        setIsFollowing(!!followRow);
      }
      setLoading(false);
    };
    fetchAll();
  }, [userId, user]);

  const handleFollow = async () => {
    if (!user) return;
    setIsFollowing(true);
    setFollowersCount((c) => c + 1);
    const { error } = await supabase.from('follows').insert([{ follower_id: user.id, followed_id: userId }]);
    if (error) { setIsFollowing(false); setFollowersCount((c) => c - 1); return; }
    const myName = (user.user_metadata?.full_name as string) || 'Alguém';
    await supabase.from('notifications').insert([{ user_id: userId, actor_id: user.id, actor_name: myName, type: 'follow' }]);
  };

  const handleUnfollow = async () => {
    if (!user) return;
    setIsFollowing(false);
    setFollowersCount((c) => Math.max(0, c - 1));
    const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', userId);
    if (error) { setIsFollowing(true); setFollowersCount((c) => c + 1); }
  };

  const displayName = profile?.full_name || 'Usuário CONEXA';
  const handle = '@' + (profile?.username || 'usuario');
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
  const isOwnProfile = user?.id === userId;

  if (loading) {
    return <div style={{ padding: '20px', color: '#64748B', textAlign: 'center' }}>Carregando perfil...</div>;
  }

  return (
    <div style={{ padding: '20px', color: '#F8FAFC', paddingBottom: '80px', boxSizing: 'border-box', maxWidth: '560px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.85rem', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>← Voltar</button>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: avatarColor(handle), margin: '0 auto 12px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#0B0F17' }}>{initial}</div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>{displayName}</h3>
        <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem' }}>{handle}</p>

        {!isOwnProfile && (
          <button
            onClick={() => (isFollowing ? handleUnfollow() : handleFollow())}
            style={{ marginTop: '14px', background: isFollowing ? 'transparent' : '#6366F1', border: isFollowing ? '1px solid #232C3D' : 'none', color: isFollowing ? '#94A3B8' : '#FFF', borderRadius: '18px', padding: '8px 22px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#161F30', border: '1px solid #232C3D', padding: '16px', borderRadius: '14px', marginBottom: '24px', textAlign: 'center' }}>
        <div><strong style={{ display: 'block', fontSize: '1.1rem' }}>{posts.length}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Publicações</span></div>
        <div><strong style={{ display: 'block', fontSize: '1.1rem' }}>{followersCount}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguidores</span></div>
        <div><strong style={{ display: 'block', fontSize: '1.1rem' }}>{followingCount}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguindo</span></div>
      </div>

      {posts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748B' }}>Nenhuma publicação ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {posts.map((post) => (
            <div key={post.id} style={{ backgroundColor: '#161F30', border: '1px solid #232C3D', borderRadius: '14px', padding: '14px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>{post.content}</p>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>❤️ {post.likes_count || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OtherUserProfileView;

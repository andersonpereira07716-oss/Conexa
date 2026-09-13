import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ userId, onBack }) => {
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados de seguidores
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProfileAndPosts();
  }, [userId]);

  const fetchProfileAndPosts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Buscar contagem e status de seguidores
      fetchFollowStats(user?.id);

      // Buscar posts do usuário
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsData && postsData.length > 0) {
        setUserPosts(postsData);
        setProfile({
          full_name: postsData[0].author_name,
          username: postsData[0].author_name.toLowerCase().replace(/\s+/g, ''),
          bio: 'Membro da comunidade CONEXA ✨',
          avatar_url: null
        });
      } else {
        setProfile({
          full_name: 'Usuário CONEXA',
          username: 'usuario',
          bio: 'Membro da comunidade CONEXA ✨',
          avatar_url: null
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStats = async (currentUserId?: string) => {
    // Quantos seguidores este perfil tem
    const { count: followers } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    setFollowersCount(followers || 0);

    // Quantas pessoas este perfil segue
    const { count: following } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    setFollowingCount(following || 0);

    // Checar se o usuário logado segue este perfil
    if (currentUserId && currentUserId !== userId) {
      const { data } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
        .maybeSingle();

      setIsFollowing(!!data);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser || currentUser.id === userId || actionLoading) return;

    setActionLoading(true);
    if (isFollowing) {
      // Deixar de seguir
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);

      if (!error) {
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      }
    } else {
      // Seguir
      const { error } = await supabase
        .from('followers')
        .insert([{ follower_id: currentUser.id, following_id: userId }]);

      if (!error) {
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);

        // Notificar o usuário que ganhou um seguidor
        await supabase.from('notifications').insert([{
          user_id: userId,
          actor_id: currentUser.id,
          actor_name: currentUser.user_metadata?.full_name || 'Alguém',
          type: 'follow',
          post_id: null
        }]);
      }
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando perfil...
      </div>
    );
  }

  const isSelf = currentUser?.id === userId;

  return (
    <div style={{ padding: '20px', paddingBottom: '80px', color: 'var(--text)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: '#38BDF8',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '16px'
        }}
      >
        ← Voltar
      </button>

      {/* Cartão de Perfil */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#6366F1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#FFF',
          margin: '0 auto 16px auto',
          border: '3px solid #38BDF8'
        }}>
          {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'CX'}
        </div>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '0 0 4px 0' }}>{profile?.full_name}</h2>
        <p style={{ fontSize: '0.85rem', color: '#38BDF8', margin: '0 0 12px 0' }}>@{profile?.username}</p>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', margin: '0 0 16px 0', lineHeight: '1.4' }}>
          {profile?.bio}
        </p>

        {/* Contador de Seguidores */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '20px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
          <div>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text)', display: 'block' }}>{followersCount}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Seguidores</span>
          </div>
          <div>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text)', display: 'block' }}>{followingCount}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Seguindo</span>
          </div>
        </div>

        {/* Botão de Seguir */}
        {!isSelf && (
          <button
            onClick={handleToggleFollow}
            disabled={actionLoading}
            style={{
              width: '100%',
              backgroundColor: isFollowing ? 'transparent' : '#6366F1',
              border: isFollowing ? '1px solid #475569' : 'none',
              color: isFollowing ? 'var(--text-secondary)' : '#FFF',
              padding: '10px 20px',
              borderRadius: '24px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {actionLoading ? 'Processando...' : isFollowing ? 'Seguindo' : 'Seguir'}
          </button>
        )}
      </div>

      {/* Lista de Publicações do Usuário */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-body)' }}>
        Publicações
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {userPosts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '20px 0' }}>
            Nenhuma publicação feita ainda.
          </p>
        ) : (
          userPosts.map((post) => (
            <div key={post.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', margin: '0 0 12px 0', lineHeight: '1.4' }}>{post.content}</p>

              {post.image_url && (
                <div style={{ marginBottom: '12px', borderRadius: '12px', overflow: 'hidden' }}>
                  <img src={post.image_url} alt="Conteúdo" style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '12px' }} />
                </div>
              )}

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                ❤️ {post.likes_count || 0} curtidas
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default UserProfileView;

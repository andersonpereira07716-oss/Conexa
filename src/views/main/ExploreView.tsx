import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_following?: boolean;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
}

interface ExploreViewProps {
  onBack: () => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Perfil selecionado
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const cleanTerm = searchTerm.replace('@', '').trim();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio')
        .or(`full_name.ilike.%${cleanTerm}%,username.ilike.%${cleanTerm}%`)
        .limit(20);

      if (error) throw error;

      if (data && user) {
        // Verificar se o usuário logado segue cada resultado
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = (followData || []).map((f) => f.following_id);

        const formatted = data.map((p) => ({
          ...p,
          is_following: followingIds.includes(p.id),
        }));

        setSearchResults(formatted);
      } else {
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (profile: UserProfile) => {
    setSelectedProfile(profile);
    setLoadingProfile(true);
    try {
      // 1. Contador de Seguidores
      const { count: fersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);

      // 2. Contador de Seguindo
      const { count: fingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id);

      setFollowersCount(fersCount || 0);
      setFollowingCount(fingCount || 0);

      // 3. Posts do usuário
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, image_url, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      setUserPosts(postsData || []);
    } catch (err) {
      console.error('Erro ao carregar detalhes do perfil:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleToggleFollow = async (profileId: string, isCurrentlyFollowing?: boolean) => {
    if (!user || user.id === profileId) return;

    // Atualiza estado local
    if (selectedProfile && selectedProfile.id === profileId) {
      setSelectedProfile({ ...selectedProfile, is_following: !isCurrentlyFollowing });
      setFollowersCount((prev) => (isCurrentlyFollowing ? prev - 1 : prev + 1));
    }

    setSearchResults((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, is_following: !isCurrentlyFollowing } : p))
    );

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profileId);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: user.id, following_id: profileId }]);

        await supabase.from('notifications').insert([
          {
            user_id: profileId,
            actor_id: user.id,
            type: 'follow',
          },
        ]);
      }
    } catch (err) {
      console.error('Erro ao seguir/deixar de seguir:', err);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
        <button
          onClick={selectedProfile ? () => setSelectedProfile(null) : onBack}
          style={{
            backgroundColor: '#1E293B',
            color: '#FFF',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← {selectedProfile ? 'Voltar à busca' : 'Voltar'}
        </button>
        <h1 style={{ color: '#818CF8', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
          {selectedProfile ? 'Perfil' : 'Explorar'}
        </h1>
      </div>

      {!selectedProfile ? (
        <>
          {/* Campo de Busca */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Buscar por nome ou @username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#131B2E',
                border: '1px solid #1E293B',
                borderRadius: '20px',
                padding: '12px 18px',
                color: '#FFF',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Resultados */}
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6366F1', padding: '20px' }}>Buscando usuários...</div>
          ) : searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px' }}>
              {searchTerm.trim().length > 1
                ? 'Nenhum usuário encontrado.'
                : 'Digite o nome ou @username de alguém para pesquisar.'}
            </div>
          ) : (
            searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleViewProfile(item)}
                style={{
                  backgroundColor: '#131B2E',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {item.avatar_url ? (
                    <img
                      src={item.avatar_url}
                      alt="Avatar"
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: '#6366F1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: '#FFF',
                      }}
                    >
                      {getInitials(item.full_name)}
                    </div>
                  )}

                  <div>
                    <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: '15px' }}>{item.full_name}</div>
                    <div style={{ color: '#94A3B8', fontSize: '13px' }}>@{item.username}</div>
                  </div>
                </div>

                {user && user.id !== item.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFollow(item.id, item.is_following);
                    }}
                    style={{
                      backgroundColor: item.is_following ? '#1E293B' : '#6366F1',
                      color: item.is_following ? '#94A3B8' : '#FFF',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {item.is_following ? 'Seguindo' : '+ Seguir'}
                  </button>
                )}
              </div>
            ))
          )}
        </>
      ) : (
        /* Detalhes do Perfil Selecionado */
        <div>
          <div style={{ backgroundColor: '#131B2E', padding: '20px', borderRadius: '20px', marginBottom: '20px', textAlign: 'center' }}>
            {selectedProfile.avatar_url ? (
              <img
                src={selectedProfile.avatar_url}
                alt="Avatar"
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '28px',
                  color: '#FFF',
                  margin: '0 auto 12px',
                }}
              >
                {getInitials(selectedProfile.full_name)}
              </div>
            )}

            <h2 style={{ color: '#FFF', fontSize: '20px', margin: '0 0 4px 0' }}>{selectedProfile.full_name}</h2>
            <div style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '12px' }}>@{selectedProfile.username}</div>

            {selectedProfile.bio && (
              <div style={{ color: '#CBD5E1', fontSize: '14px', marginBottom: '16px' }}>{selectedProfile.bio}</div>
            )}

            {/* Contadores */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', margin: '16px 0' }}>
              <div>
                <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: '18px' }}>{followersCount}</div>
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>Seguidores</div>
              </div>
              <div>
                <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: '18px' }}>{followingCount}</div>
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>Seguindo</div>
              </div>
            </div>

            {/* Botão Seguir */}
            {user && user.id !== selectedProfile.id && (
              <button
                onClick={() => handleToggleFollow(selectedProfile.id, selectedProfile.is_following)}
                style={{
                  backgroundColor: selectedProfile.is_following ? '#1E293B' : '#6366F1',
                  color: selectedProfile.is_following ? '#94A3B8' : '#FFF',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '200px',
                }}
              >
                {selectedProfile.is_following ? 'Seguindo' : '+ Seguir'}
              </button>
            )}
          </div>

          <h3 style={{ color: '#818CF8', fontSize: '18px', marginBottom: '16px' }}>Publicações</h3>

          {loadingProfile ? (
            <div style={{ textAlign: 'center', color: '#6366F1', padding: '20px' }}>Carregando perfil...</div>
          ) : userPosts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>Este usuário ainda não publicou nada.</div>
          ) : (
            userPosts.map((post) => (
              <div key={post.id} style={{ backgroundColor: '#131B2E', padding: '16px', borderRadius: '16px', marginBottom: '12px' }}>
                {post.content && (
                  <div style={{ color: '#E2E8F0', fontSize: '14px', lineHeight: '1.5', marginBottom: '8px' }}>
                    {post.content}
                  </div>
                )}
                {post.image_url && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', backgroundColor: '#0B0F17' }}>
                    <img src={post.image_url} alt="Mídia" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
                  {new Date(post.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ExploreView;

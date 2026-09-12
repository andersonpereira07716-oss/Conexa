import React, { useState, useEffect } from 'react';
import BottomNavigation from '../../components/layout/BottomNavigation';
import ProfileProvisorioView from './ProfileProvisorioView';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export const HomeProvisoriaView: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) console.error('Erro ao buscar posts:', error);
      else if (data) setPosts(data);
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);
    if (!error && data) {
      setFollowingIds(new Set(data.map((f: any) => f.followed_id)));
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchFollowing();
  }, [user]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user) return;

    const authorName = (user.user_metadata?.full_name as string) || 'Você';
    const authorHandle = '@' + (user.email?.split('@')[0] || 'usuario');

    try {
      const { data, error } = await supabase.from('posts').insert([{ content: newPost, user_id: user.id, author_name: authorName, author_handle: authorHandle }]).select();
      if (error) alert('Erro ao publicar: ' + error.message);
      else if (data) { setPosts([data[0], ...posts]); setNewPost(''); }
    } catch (err) {
      console.error('Erro na gravação do post:', err);
    }
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    const updatedLikes = (currentLikes || 0) + 1;
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes_count: updatedLikes } : p)));
    const { error } = await supabase.from('posts').update({ likes_count: updatedLikes }).eq('id', postId);
    if (error) {
      console.error('Erro ao curtir post:', error);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes_count: currentLikes } : p)));
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return;

    // Atualização otimista
    setFollowingIds((prev) => new Set(prev).add(targetUserId));

    const { error } = await supabase.from('follows').insert([{ follower_id: user.id, followed_id: targetUserId }]);
    if (error) {
      console.error('Erro ao seguir:', error);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;

    setFollowingIds((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });

    const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', targetUserId);
    if (error) {
      console.error('Erro ao deixar de seguir:', error);
      setFollowingIds((prev) => new Set(prev).add(targetUserId));
    }
  };

  return (
    <div style={{ backgroundColor: '#0B0F17', minHeight: '100vh', color: '#F8FAFC', position: 'relative' }}>
      {activeTab === 'profile' ? (
        <ProfileProvisorioView />
      ) : (
        <div style={{ padding: '20px', paddingBottom: '90px', boxSizing: 'border-box' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: '#6366F1', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>CONEXA</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#161F30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '1px solid #1E293B', cursor: 'pointer' }}>🔔</div>
              <button onClick={signOut} style={{ background: 'none', border: '1px solid #1E293B', color: '#94A3B8', borderRadius: '20px', padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer' }}>Sair</button>
            </div>
          </header>

          <form onSubmit={handleCreatePost} style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '14px', marginBottom: '20px' }}>
            <textarea placeholder="O que está acontecendo?" value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={2} style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: '#FFF', fontSize: '0.95rem', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" disabled={!newPost.trim()} style={{ backgroundColor: newPost.trim() ? '#6366F1' : '#334155', color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', cursor: newPost.trim() ? 'pointer' : 'default' }}>Publicar</button>
            </div>
          </form>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8' }}>Carregando publicações...</p>
          ) : posts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma publicação ainda. Seja o primeiro!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map((post) => {
                const isOwnPost = post.user_id === user?.id;
                const isFollowing = followingIds.has(post.user_id);
                return (
                  <div key={post.id} style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {post.author_name ? post.author_name.substring(0, 2).toUpperCase() : 'CX'}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{post.author_name || 'Usuário'}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{post.author_handle || '@conexa'}</span>
                        </div>
                      </div>
                      {!isOwnPost && post.user_id && (
                        <button
                          onClick={() => (isFollowing ? handleUnfollow(post.user_id) : handleFollow(post.user_id))}
                          style={{
                            background: isFollowing ? 'transparent' : '#6366F1',
                            border: isFollowing ? '1px solid #1E293B' : 'none',
                            color: isFollowing ? '#94A3B8' : '#FFF',
                            borderRadius: '16px',
                            padding: '6px 14px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {isFollowing ? 'Seguindo' : 'Seguir'}
                        </button>
                      )}
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#CBD5E1', lineHeight: '1.4' }}>{post.content}</p>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#94A3B8' }}>
                      <button onClick={() => handleLike(post.id, post.likes_count)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                        ❤️ {post.likes_count || 0}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default HomeProvisoriaView;

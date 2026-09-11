import React, { useState, useEffect } from 'react';
import BottomNavigation from '../../components/layout/BottomNavigation';
import ProfileProvisorioView from './ProfileProvisorioView';
import { supabase } from '../../services/supabase';

export const HomeProvisoriaView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados para Gerenciamento de Comentários
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<{ [postId: string]: any[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({});

  // Carregar dados da sessão, posts e seguidores
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);

      // 1. Buscar posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Erro ao buscar posts:', postsError);
      } else if (postsData) {
        setPosts(postsData);
      }

      // 2. Buscar lista de pessoas que o usuário segue
      if (user) {
        const { data: followsData, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followsError) {
          console.error('Erro ao buscar seguidores:', followsError);
        } else if (followsData) {
          setFollowingIds(followsData.map((f) => f.following_id));
        }
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Publicar novo post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            content: newPost,
            user_id: currentUser.id,
            author_name: currentUser.user_metadata?.full_name || 'Usuário CONEXA',
            author_handle: currentUser.email || '@conexa_user'
          }
        ])
        .select();

      if (error) {
        alert('Erro ao publicar: ' + error.message);
      } else if (data) {
        setPosts([data[0], ...posts]);
        setNewPost('');
      }
    } catch (err) {
      console.error('Erro na gravação do post:', err);
    }
  };

  // Curtiu o post
  const handleLike = async (postId: string, currentLikes: number) => {
    const updatedLikes = (currentLikes || 0) + 1;

    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === postId ? { ...p, likes_count: updatedLikes } : p
      )
    );

    const { error } = await supabase
      .from('posts')
      .update({ likes_count: updatedLikes })
      .eq('id', postId);

    if (error) {
      console.error('Erro ao curtir post:', error);
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId ? { ...p, likes_count: currentLikes } : p
        )
      );
    }
  };

  // Alternar ação de Seguir / Deixar de Seguir
  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser || !targetUserId || targetUserId === currentUser.id) return;

    const isFollowing = followingIds.includes(targetUserId);

    if (isFollowing) {
      setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId);

      if (error) {
        console.error('Erro ao deixar de seguir:', error);
        setFollowingIds((prev) => [...prev, targetUserId]);
      }
    } else {
      setFollowingIds((prev) => [...prev, targetUserId]);

      const { error } = await supabase
        .from('follows')
        .insert([
          {
            follower_id: currentUser.id,
            following_id: targetUserId
          }
        ]);

      if (error) {
        console.error('Erro ao seguir:', error);
        setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
      }
    }
  };

  // Alternar visualização da seção de comentários
  const toggleCommentsSection = async (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      return;
    }

    setOpenCommentsPostId(postId);

    // Carregar comentários se ainda não tiverem sido buscados
    if (!commentsMap[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar comentários:', error);
      } else if (data) {
        setCommentsMap((prev) => ({ ...prev, [postId]: data }));
      }
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Enviar novo comentário
  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content || !content.trim() || !currentUser) return;

    const authorName = currentUser.user_metadata?.full_name || 'Usuário CONEXA';

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: currentUser.id,
            author_name: authorName,
            content: content.trim()
          }
        ])
        .select();

      if (error) {
        alert('Erro ao comentar: ' + error.message);
      } else if (data) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data[0]]
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      }
    } catch (err) {
      console.error('Erro ao publicar comentário:', err);
    }
  };

  return (
    <div style={{ backgroundColor: '#0B0F17', minHeight: '100vh', color: '#F8FAFC', position: 'relative' }}>
      
      {activeTab === 'profile' ? (
        <ProfileProvisorioView />
      ) : (
        <div style={{ padding: '20px', paddingBottom: '90px', boxSizing: 'border-box' }}>
          
          {/* Header */}
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: '#6366F1', margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>CONEXA</h1>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#161F30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '1px solid #1E293B', cursor: 'pointer' }}>
              🔔
            </div>
          </header>

          {/* Form de Novo Post */}
          <form onSubmit={handleCreatePost} style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '14px', marginBottom: '20px' }}>
            <textarea
              placeholder="O que está acontecendo?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={2}
              style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: '#FFF', fontSize: '0.95rem', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={!newPost.trim()}
                style={{
                  backgroundColor: newPost.trim() ? '#6366F1' : '#334155',
                  color: '#FFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: newPost.trim() ? 'pointer' : 'default'
                }}
              >
                Publicar
              </button>
            </div>
          </form>

          {/* Lista de Posts */}
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8' }}>Carregando publicações...</p>
          ) : posts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma publicação ainda. Seja o primeiro!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map((post) => {
                const isMyPost = currentUser && post.user_id === currentUser.id;
                const isFollowing = post.user_id && followingIds.includes(post.user_id);
                const isCommentsOpen = openCommentsPostId === post.id;
                const postComments = commentsMap[post.id] || [];

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

                      {/* Botão Seguir / Seguindo */}
                      {!isMyPost && post.user_id && (
                        <button
                          onClick={() => handleToggleFollow(post.user_id)}
                          style={{
                            backgroundColor: isFollowing ? 'transparent' : '#6366F1',
                            color: isFollowing ? '#94A3B8' : '#FFF',
                            border: isFollowing ? '1px solid #334155' : 'none',
                            padding: '6px 14px',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {isFollowing ? 'Seguindo' : 'Seguir'}
                        </button>
                      )}
                    </div>

                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#CBD5E1', lineHeight: '1.4' }}>
                      {post.content}
                    </p>

                    {/* Botões de Ação */}
                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#94A3B8' }}>
                      <button 
                        onClick={() => handleLike(post.id, post.likes_count)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                      >
                        ❤️ {post.likes_count || 0}
                      </button>

                      <button 
                        onClick={() => toggleCommentsSection(post.id)}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                      >
                        💬 {postComments.length > 0 ? postComments.length : 'Comentar'}
                      </button>
                    </div>

                    {/* Seção Expandível de Comentários */}
                    {isCommentsOpen && (
                      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1E293B' }}>
                        
                        {/* Lista de Comentários */}
                        {loadingComments[post.id] ? (
                          <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Carregando comentários...</p>
                        ) : postComments.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '12px' }}>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                            {postComments.map((comment) => (
                              <div key={comment.id} style={{ backgroundColor: '#0B0F17', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6366F1' }}>
                                    {comment.author_name}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#E2E8F0' }}>
                                  {comment.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Campo para Escrever Comentário */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Escreva um comentário..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            style={{
                              flex: 1,
                              backgroundColor: '#0B0F17',
                              border: '1px solid #334155',
                              borderRadius: '20px',
                              padding: '8px 14px',
                              color: '#FFF',
                              fontSize: '0.85rem',
                              outline: 'none'
                            }}
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                            style={{
                              backgroundColor: commentInputs[post.id]?.trim() ? '#6366F1' : '#334155',
                              color: '#FFF',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              cursor: commentInputs[post.id]?.trim() ? 'pointer' : 'default'
                            }}
                          >
                            Enviar
                          </button>
                        </div>

                      </div>
                    )}

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

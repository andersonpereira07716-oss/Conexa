import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { UserProfileView } from './UserProfileView';

export const FeedView: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Perfil Público Selecionado
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Aba selecionada: 'all' (Para você) ou 'following' (Seguindo)
  const [feedTab, setFeedTab] = useState<'all' | 'following'>('all');
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  // Estados de Notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Estados dos comentários
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Estado das curtidas
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  // Estado da Pesquisa
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUserAndPosts();
  }, []);

  const fetchUserAndPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchUserLikes(user.id);
      fetchNotifications(user.id);
      fetchFollowingList(user.id);
    }
    fetchPosts();
  };

  const fetchFollowingList = async (userId: string) => {
    const { data } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId);

    if (data) {
      setFollowingUserIds(data.map(item => item.following_id));
    }
  };

  const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  };

  const markNotificationsAsRead = async () => {
    if (!user || unreadCount === 0) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setUnreadCount(0);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const toggleNotificationsModal = () => {
    if (!showNotifications) {
      markNotificationsAsRead();
    }
    setShowNotifications(!showNotifications);
  };

  const fetchUserLikes = async (userId: string) => {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);

    if (!error && data) {
      setUserLikes(new Set(data.map((item: any) => item.post_id)));
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
  };

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setPostImage(null);
    setImagePreview(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !postImage) || !user) return;

    setLoading(true);
    let uploadedImageUrl = null;

    try {
      if (postImage) {
        const fileExt = postImage.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, postImage);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('posts').getPublicUrl(filePath);
        uploadedImageUrl = data.publicUrl;
      }

      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          content: content,
          image_url: uploadedImageUrl,
          author_name: user.user_metadata?.full_name || 'Usuário CONEXA',
          likes_count: 0
        }
      ]);

      if (error) throw error;

      setContent('');
      setPostImage(null);
      setImagePreview(null);
      fetchPosts();
    } catch (error: any) {
      alert('Erro ao publicar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (confirm('Deseja realmente excluir esta publicação?')) {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (!error) {
        setPosts(posts.filter(p => p.id !== id));
      }
    }
  };

  const handleToggleLike = async (post: any) => {
    if (!user) return;

    const isLiked = userLikes.has(post.id);
    const newLikesCount = isLiked ? Math.max(0, (post.likes_count || 1) - 1) : (post.likes_count || 0) + 1;

    setPosts(posts.map(p => p.id === post.id ? { ...p, likes_count: newLikesCount } : p));
    const newSet = new Set(userLikes);
    if (isLiked) {
      newSet.delete(post.id);
    } else {
      newSet.add(post.id);
    }
    setUserLikes(newSet);

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: post.id, user_id: user.id }]);

      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: post.user_id,
          actor_id: user.id,
          actor_name: user.user_metadata?.full_name || 'Alguém',
          type: 'like',
          post_id: post.id
        }]);
      }
    }

    await supabase.from('posts').update({ likes_count: newLikesCount }).eq('id', post.id);
  };

  const openComments = async (post: any) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
    setLoadingComments(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !selectedPost) return;

    const { error } = await supabase.from('comments').insert([
      {
        post_id: selectedPost.id,
        user_id: user.id,
        author_name: user.user_metadata?.full_name || 'Usuário CONEXA',
        content: newComment
      }
    ]);

    if (!error) {
      if (selectedPost.user_id !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: selectedPost.user_id,
          actor_id: user.id,
          actor_name: user.user_metadata?.full_name || 'Alguém',
          type: 'comment',
          post_id: selectedPost.id
        }]);
      }

      setNewComment('');
      fetchComments(selectedPost.id);
    } else {
      alert('Erro ao comentar: ' + error.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments(comments.filter(c => c.id !== commentId));
    }
  };

  // Filtragem dos posts
  const filteredPosts = posts.filter((post) => {
    // Filtro por Aba (Seguindo)
    if (feedTab === 'following') {
      if (!followingUserIds.includes(post.user_id)) return false;
    }

    // Filtro de Busca
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    const contentMatch = post.content?.toLowerCase().includes(query);
    const authorMatch = post.author_name?.toLowerCase().includes(query);
    return contentMatch || authorMatch;
  });

  if (viewingUserId) {
    return (
      <UserProfileView
        userId={viewingUserId}
        onBack={() => setViewingUserId(null)}
      />
    );
  }

  const currentUserAvatar = user?.user_metadata?.avatar_url;

  return (
    <div style={{ padding: '20px', paddingBottom: '80px', color: '#F8FAFC', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#6366F1', margin: 0 }}>CONEXA</h1>
        
        {/* Botão Notificações */}
        <button
          onClick={toggleNotificationsModal}
          style={{
            position: 'relative',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '1.3rem',
            cursor: 'pointer'
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#EF4444',
              color: '#FFF',
              borderRadius: '50%',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Abas do Feed (Para Você / Seguindo) */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1E293B', marginBottom: '16px' }}>
        <button
          onClick={() => setFeedTab('all')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: feedTab === 'all' ? '2px solid #6366F1' : 'none',
            color: feedTab === 'all' ? '#6366F1' : '#94A3B8',
            fontWeight: feedTab === 'all' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Para Você
        </button>
        <button
          onClick={() => setFeedTab('following')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: feedTab === 'following' ? '2px solid #6366F1' : 'none',
            color: feedTab === 'following' ? '#6366F1' : '#94A3B8',
            fontWeight: feedTab === 'following' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Seguindo
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#161F30',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '8px 16px',
          gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#94A3B8' }}>🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar publicações ou pessoas..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#F8FAFC',
              outline: 'none',
              fontSize: '0.85rem'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Caixa de Publicação */}
      <form onSubmit={handleCreatePost} style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que está acontecendo?"
          rows={3}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#F8FAFC',
            resize: 'none',
            outline: 'none',
            fontSize: '0.95rem',
            boxSizing: 'border-box'
          }}
        />

        {imagePreview && (
          <div style={{ position: 'relative', marginBottom: '12px', borderRadius: '12px', overflow: 'hidden' }}>
            <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '12px' }} />
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#FFF',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontSize: '0.85rem', fontWeight: 'bold' }}>
            📷 Adicionar Foto
            <input type="file" accept="image/*" onChange={handleSelectImage} style={{ display: 'none' }} />
          </label>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !postImage)}
            style={{
              backgroundColor: '#6366F1',
              color: '#FFF',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: loading || (!content.trim() && !postImage) ? 0.6 : 1
            }}
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>

      {/* Lista de Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredPosts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', margin: '30px 0' }}>
            {feedTab === 'following'
              ? 'Você ainda não segue ninguém ou as pessoas que você segue não publicaram nada.'
              : searchTerm
              ? `Nenhuma publicação ou pessoa encontrada para "${searchTerm}".`
              : 'Nenhuma publicação ainda.'}
          </p>
        ) : (
          filteredPosts.map((post) => {
            const isMyPost = user && post.user_id === user.id;
            const isLiked = userLikes.has(post.id);
            const avatarToDisplay = isMyPost ? currentUserAvatar : null;

            return (
              <div key={post.id} style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div 
                    onClick={() => setViewingUserId(post.user_id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    {avatarToDisplay ? (
                      <img
                        src={avatarToDisplay}
                        alt={post.author_name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #6366F1' }}
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#FFF' }}>
                        {post.author_name ? post.author_name.substring(0, 2).toUpperCase() : 'CX'}
                      </div>
                    )}
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: 0 }}>{post.author_name}</h3>
                      <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>@{post.author_name?.toLowerCase().replace(/\s+/g, '')}</p>
                    </div>
                  </div>

                  {isMyPost && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1rem' }}
                      title="Excluir post"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {post.content && (
                  <p style={{ fontSize: '0.9rem', color: '#E2E8F0', margin: '0 0 12px 0', lineHeight: '1.4' }}>{post.content}</p>
                )}

                {post.image_url && (
                  <div style={{ marginBottom: '12px', borderRadius: '12px', overflow: 'hidden' }}>
                    <img
                      src={post.image_url}
                      alt="Conteúdo da publicação"
                      style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '20px', color: '#94A3B8', fontSize: '0.85rem' }}>
                  <button
                    onClick={() => handleToggleLike(post)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: isLiked ? '#EF4444' : '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: isLiked ? 'bold' : 'normal'
                    }}
                  >
                    {isLiked ? '❤️' : '🤍'} {post.likes_count || 0}
                  </button>
                  <button 
                    onClick={() => openComments(post)} 
                    style={{ backgroundColor: 'transparent', border: 'none', color: '#6366F1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                  >
                    💬 Comentar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Notificações */}
      {showNotifications && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '40px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1E293B', width: '90%', maxWidth: '500px', maxHeight: '70vh', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>Notificações</h2>
              <button onClick={() => setShowNotifications(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem', margin: '20px 0' }}>Nenhuma notificação por enquanto.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {n.type === 'like' ? '❤️' : n.type === 'follow' ? '👤' : '💬'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.85rem', margin: 0, color: '#E2E8F0' }}>
                        <strong style={{ color: '#38BDF8' }}>{n.actor_name}</strong>{' '}
                        {n.type === 'like'
                          ? 'curtiu sua publicação.'
                          : n.type === 'follow'
                          ? 'começou a te seguir.'
                          : 'comentou na sua publicação.'}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal de Comentários */}
      {selectedPost && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1E293B', width: '100%', maxWidth: '600px', height: '80vh', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '20px', paddingBottom: '70px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>Comentários</h2>
              <button onClick={() => setSelectedPost(null)} style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#6366F1' }}>{selectedPost.author_name}</strong>
              {selectedPost.content && <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0', color: '#CBD5E1' }}>{selectedPost.content}</p>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {loadingComments ? (
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Carregando comentários...</p>
              ) : comments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>Seja o primeiro a comentar!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} style={{ backgroundColor: '#0F172A', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <strong 
                        onClick={() => {
                          setSelectedPost(null);
                          setViewingUserId(comment.user_id);
                        }}
                        style={{ fontSize: '0.8rem', color: '#38BDF8', cursor: 'pointer' }}
                      >
                        {comment.author_name}
                      </strong>
                      <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0', color: '#E2E8F0' }}>{comment.content}</p>
                    </div>
                    {user && comment.user_id === user.id && (
                      <button onClick={() => handleDeleteComment(comment.id)} style={{ backgroundColor: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
                    )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                style={{
                  flex: 1,
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: '20px',
                  padding: '12px 16px',
                  color: '#FFF',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                style={{
                  backgroundColor: '#6366F1',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '12px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: !newComment.trim() ? 0.6 : 1
                }}
              >
                Enviar
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default FeedView;

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { NotificationsView } from './NotificationsView';
import { ExploreView } from './ExploreView';
import { ProfileEditView } from './ProfileEditView';
import { TrendingTopicsView } from './TrendingTopicsView';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
  is_following_author?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    username: string;
  };
}

export const FeedView: React.FC = () => {
  const { user, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Telas
  const [showNotifications, setShowNotifications] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');

  // Estados de Edição de Post
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState('');

  // Modal de Comentários
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Estados de Edição de Comentário
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  useEffect(() => {
    fetchPosts();
    fetchUnreadNotifications();
  }, [user, activeTab]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Erro ao verificar notificações:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);

      let followingUserIds: string[] = [];
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        followingUserIds = (followData || []).map((f) => f.following_id);
      }

      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          user_id,
          profiles (full_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'following') {
        if (followingUserIds.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }
        query = query.in('user_id', followingUserIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const postsWithCounts = await Promise.all(
          data.map(async (post) => {
            const { count: likesCount } = await supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);

            const { count: commentsCount } = await supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);

            let userHasLiked = false;
            if (user) {
              const { data: likeData } = await supabase
                .from('likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', user.id)
                .single();
              userHasLiked = !!likeData;
            }

            const isFollowingAuthor = followingUserIds.includes(post.user_id);

            return {
              ...post,
              likes_count: likesCount || 0,
              comments_count: commentsCount || 0,
              user_has_liked: userHasLiked,
              is_following_author: isFollowingAuthor,
            };
          })
        );
        setPosts(postsWithCounts as any);
      }
    } catch (err) {
      console.error('Erro ao carregar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (authorId: string, isCurrentlyFollowing?: boolean) => {
    if (!user || user.id === authorId) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.user_id === authorId ? { ...p, is_following_author: !isCurrentlyFollowing } : p
      )
    );

    try {
      if (isCurrentlyFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', authorId);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: user.id, following_id: authorId }]);

        await supabase.from('notifications').insert([
          {
            user_id: authorId,
            actor_id: user.id,
            type: 'follow',
          },
        ]);
      }
    } catch (err) {
      console.error('Erro ao alternar conexão:', err);
      fetchPosts();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if ((!newPost.trim() && !selectedFile) || !user) return;
    setSubmitting(true);
    try {
      let uploadedImageUrl = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrlData.publicUrl;
      }

      const { error: postError } = await supabase
        .from('posts')
        .insert([
          {
            content: newPost.trim(),
            image_url: uploadedImageUrl,
            user_id: user.id,
          },
        ]);

      if (postError) throw postError;

      setNewPost('');
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchPosts();
    } catch (err: any) {
      console.error('Erro ao criar post:', err);
      alert('Erro ao enviar post: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditingPostContent(post.content);
  };

  const handleSaveEditPost = async (postId: string) => {
    if (!editingPostContent.trim()) return;
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editingPostContent.trim() })
        .eq('id', postId);

      if (error) throw error;

      setEditingPostId(null);
      fetchPosts();
    } catch (err) {
      console.error('Erro ao editar publicação:', err);
      alert('Não foi possível salvar a edição.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta publicação?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      fetchPosts();
    } catch (err) {
      console.error('Erro ao excluir publicação:', err);
      alert('Erro ao excluir publicação.');
    }
  };

  const handleToggleLike = async (post: Post) => {
    if (!user) return;

    const currentLiked = !!post.user_has_liked;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              user_has_liked: !currentLiked,
              likes_count: currentLiked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1,
            }
          : p
      )
    );

    try {
      if (currentLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert([{ post_id: post.id, user_id: user.id }]);

        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert([
            {
              user_id: post.user_id,
              actor_id: user.id,
              type: 'like',
              post_id: post.id,
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Erro ao curtir post:', err);
      fetchPosts();
    }
  };

  const handleOpenComments = async (post: Post) => {
    setSelectedPost(post);
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (full_name, username)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as any) || []);
    } catch (err) {
      console.error('Erro ao carregar comentários:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !selectedPost) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{ post_id: selectedPost.id, user_id: user.id, content: newComment.trim() }]);

      if (error) throw error;

      if (selectedPost.user_id !== user.id) {
        await supabase.from('notifications').insert([
          {
            user_id: selectedPost.user_id,
            actor_id: user.id,
            type: 'comment',
            post_id: selectedPost.id,
          },
        ]);
      }

      setNewComment('');
      handleOpenComments(selectedPost);
      fetchPosts();
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    }
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editingCommentContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      setEditingCommentId(null);
      if (selectedPost) handleOpenComments(selectedPost);
    } catch (err) {
      console.error('Erro ao editar comentário:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Excluir este comentário?')) return;
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      if (selectedPost) {
        handleOpenComments(selectedPost);
        fetchPosts();
      }
    } catch (err) {
      console.error('Erro ao excluir comentário:', err);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (showNotifications) {
    return (
      <NotificationsView
        onBack={() => {
          setShowNotifications(false);
          fetchUnreadNotifications();
        }}
      />
    );
  }

  if (showExplore) {
    return (
      <ExploreView
        onBack={() => {
          setShowExplore(false);
          fetchPosts();
        }}
      />
    );
  }

  if (showEditProfile) {
    return (
      <ProfileEditView
        onBack={() => {
          setShowEditProfile(false);
          fetchPosts();
        }}
      />
    );
  }

  if (showTrending) {
    return (
      <TrendingTopicsView
        onBack={() => {
          setShowTrending(false);
        }}
      />
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ color: '#818CF8', fontSize: '24px', fontWeight: 'bold' }}>CONEXA</h1>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => setShowTrending(true)}
            style={{
              backgroundColor: '#1E293B',
              color: '#FFF',
              border: 'none',
              padding: '8px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            🔥 Trends
          </button>

          <button
            onClick={() => setShowExplore(true)}
            style={{
              backgroundColor: '#1E293B',
              color: '#FFF',
              border: 'none',
              padding: '8px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            🔍 Busca
          </button>

          <button
            onClick={() => setShowEditProfile(true)}
            style={{
              backgroundColor: '#1E293B',
              color: '#FFF',
              border: 'none',
              padding: '8px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            👤 Perfil
          </button>

          <button
            onClick={() => setShowNotifications(true)}
            style={{
              backgroundColor: '#1E293B',
              color: '#FFF',
              border: 'none',
              padding: '8px 10px',
              borderRadius: '20px',
              cursor: 'pointer',
              position: 'relative',
              fontSize: '13px',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#EF4444',
                  color: '#FFF',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={signOut}
            style={{
              backgroundColor: '#1E293B',
              color: '#94A3B8',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Abas Para você / Seguindo */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1E293B', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('for_you')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'for_you' ? '3px solid #6366F1' : 'none',
            color: activeTab === 'for_you' ? '#818CF8' : '#94A3B8',
            fontWeight: activeTab === 'for_you' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '15px',
          }}
        >
          Para você
        </button>
        <button
          onClick={() => setActiveTab('following')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'following' ? '3px solid #6366F1' : 'none',
            color: activeTab === 'following' ? '#818CF8' : '#94A3B8',
            fontWeight: activeTab === 'following' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '15px',
          }}
        >
          Seguindo
        </button>
      </div>

      {/* Caixa de Novo Post */}
      <div style={{ backgroundColor: '#131B2E', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
        <textarea
          placeholder="O que está acontecendo? Use #hashtags!"
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#FFF',
            fontSize: '16px',
            resize: 'none',
            outline: 'none',
            minHeight: '70px',
          }}
        />

        {previewUrl && (
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{ borderRadius: '12px', overflow: 'hidden', maxHeight: '200px' }}>
              <img src={previewUrl} alt="Prévia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              style={{
                marginTop: '6px',
                backgroundColor: '#EF4444',
                color: '#FFF',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Remover Foto
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <label
            style={{
              color: '#818CF8',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📷 Escolher Foto
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          <button
            onClick={handleCreatePost}
            disabled={submitting || (!newPost.trim() && !selectedFile)}
            style={{
              backgroundColor: '#6366F1',
              color: '#FFF',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: submitting || (!newPost.trim() && !selectedFile) ? 0.5 : 1,
            }}
          >
            {submitting ? 'Enviando...' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* Lista de Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#6366F1', padding: '20px' }}>Carregando feed...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
          {activeTab === 'following'
            ? 'Você ainda não segue ninguém ou quem você segue não publicou nada.'
            : 'Nenhuma publicação encontrada.'}
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} style={{ backgroundColor: '#131B2E', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {post.profiles?.avatar_url ? (
                  <img
                    src={post.profiles.avatar_url}
                    alt="Avatar"
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '12px' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#6366F1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      marginRight: '12px',
                      color: '#FFF',
                    }}
                  >
                    {getInitials(post.profiles?.full_name)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 'bold', color: '#FFF' }}>{post.profiles?.full_name || 'Usuário'}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>@{post.profiles?.username || 'usuario'}</div>
                </div>
              </div>

              {/* Ações do autor ou Botão Seguir */}
              {user && user.id === post.user_id ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleStartEditPost(post)}
                    style={{ background: 'none', border: 'none', color: '#818CF8', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '13px' }}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              ) : (
                user && (
                  <button
                    onClick={() => handleToggleFollow(post.user_id, post.is_following_author)}
                    style={{
                      backgroundColor: post.is_following_author ? '#1E293B' : '#6366F1',
                      color: post.is_following_author ? '#94A3B8' : '#FFF',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    {post.is_following_author ? 'Seguindo' : '+ Seguir'}
                  </button>
                )
              )}
            </div>

            {/* Conteúdo ou formulário de edição */}
            {editingPostId === post.id ? (
              <div style={{ marginBottom: '12px' }}>
                <textarea
                  value={editingPostContent}
                  onChange={(e) => setEditingPostContent(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0B0F17',
                    border: '1px solid #6366F1',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#FFF',
                    outline: 'none',
                    minHeight: '60px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleSaveEditPost(post.id)}
                    style={{
                      backgroundColor: '#6366F1',
                      color: '#FFF',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingPostId(null)}
                    style={{
                      backgroundColor: '#1E293B',
                      color: '#94A3B8',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              post.content && (
                <div style={{ color: '#E2E8F0', fontSize: '15px', lineHeight: '1.5', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </div>
              )
            )}

            {post.image_url && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', backgroundColor: '#0B0F17' }}>
                <img
                  src={post.image_url}
                  alt="Post Mídia"
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: '#94A3B8' }}>
              <button
                onClick={() => handleToggleLike(post)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: post.user_has_liked ? '#EF4444' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ❤️ {post.likes_count || 0}
              </button>

              <button
                onClick={() => handleOpenComments(post)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                💬 {post.comments_count || 0} Comentários
              </button>
            </div>
          </div>
        ))
      )}

      {/* Modal de Comentários */}
      {selectedPost && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#131B2E',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#FFF' }}>Comentários</h3>
              <button
                onClick={() => setSelectedPost(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#0B0F17', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', color: '#CBD5E1' }}>
              <strong>{selectedPost.profiles?.full_name}:</strong> {selectedPost.content}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              {loadingComments ? (
                <div style={{ color: '#6366F1', textAlign: 'center', padding: '10px' }}>Carregando respostas...</div>
              ) : comments.length === 0 ? (
                <div style={{ color: '#94A3B8', textAlign: 'center', padding: '10px' }}>Seja o primeiro a comentar!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ marginBottom: '12px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#818CF8' }}>
                        {c.profiles?.full_name || 'Usuário'}
                      </div>
                      {user && user.id === c.user_id && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingCommentContent(c.content);
                            }}
                            style={{ background: 'none', border: 'none', color: '#818CF8', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>

                    {editingCommentId === c.id ? (
                      <div style={{ marginTop: '6px' }}>
                        <input
                          type="text"
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                          style={{
                            width: '100%',
                            backgroundColor: '#0B0F17',
                            border: '1px solid #6366F1',
                            borderRadius: '6px',
                            padding: '6px',
                            color: '#FFF',
                            outline: 'none',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <button
                            onClick={() => handleSaveEditComment(c.id)}
                            style={{ backgroundColor: '#6366F1', color: '#FFF', border: 'none', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            style={{ backgroundColor: '#1E293B', color: '#94A3B8', border: 'none', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '14px', color: '#E2E8F0', marginTop: '2px' }}>{c.content}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Escreva um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#0B0F17',
                  border: '1px solid #1E293B',
                  borderRadius: '20px',
                  padding: '10px 16px',
                  color: '#FFF',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                style={{
                  backgroundColor: '#6366F1',
                  color: '#FFF',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: !newComment.trim() ? 0.5 : 1,
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedView;

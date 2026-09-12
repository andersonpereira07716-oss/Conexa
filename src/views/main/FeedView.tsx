import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

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
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estado para Modal de Comentários
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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

            return {
              ...post,
              likes_count: likesCount || 0,
              comments_count: commentsCount || 0,
              user_has_liked: userHasLiked,
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

  const handleCreatePost = async () => {
    if ((!newPost.trim() && !imageUrl.trim()) || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert([
          { 
            content: newPost.trim(), 
            image_url: imageUrl.trim() || null, 
            user_id: user.id 
          }
        ]);

      if (error) throw error;
      setNewPost('');
      setImageUrl('');
      setShowImageInput(false);
      fetchPosts();
    } catch (err) {
      console.error('Erro ao criar post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string, currentLiked: boolean) => {
    if (!user) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
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
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: user.id }]);
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
      setNewComment('');
      handleOpenComments(selectedPost);
      fetchPosts();
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#818CF8', fontSize: '24px', fontWeight: 'bold' }}>CONEXA</h1>
        <button
          onClick={signOut}
          style={{
            backgroundColor: '#1E293B',
            color: '#94A3B8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>

      {/* Caixa de Novo Post */}
      <div style={{ backgroundColor: '#131B2E', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
        <textarea
          placeholder="O que está acontecendo?"
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

        {/* Input da Imagem (ocultável) */}
        {showImageInput && (
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Cole a URL da imagem (ex: https://site.com/foto.jpg)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '10px',
                padding: '8px 12px',
                color: '#FFF',
                outline: 'none',
                fontSize: '14px',
              }}
            />
            {imageUrl.trim() && (
              <div style={{ marginTop: '8px', borderRadius: '10px', overflow: 'hidden', maxHeight: '180px' }}>
                <img src={imageUrl} alt="Prévia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <button
            onClick={() => setShowImageInput(!showImageInput)}
            style={{
              background: 'none',
              border: 'none',
              color: showImageInput ? '#818CF8' : '#94A3B8',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🖼️ {showImageInput ? 'Remover Imagem' : 'Adicionar Foto'}
          </button>

          <button
            onClick={handleCreatePost}
            disabled={submitting || (!newPost.trim() && !imageUrl.trim())}
            style={{
              backgroundColor: '#6366F1',
              color: '#FFF',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: submitting || (!newPost.trim() && !imageUrl.trim()) ? 0.5 : 1,
            }}
          >
            {submitting ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* Lista de Posts */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#6366F1', padding: '20px' }}>Carregando feed...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>Nenhuma publicação encontrada.</div>
      ) : (
        posts.map((post) => (
          <div key={post.id} style={{ backgroundColor: '#131B2E', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
            {/* Header do Autor */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
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
                    color: '#FFF'
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

            {/* Conteúdo de Texto */}
            {post.content && (
              <div style={{ color: '#E2E8F0', fontSize: '15px', lineHeight: '1.5', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                {post.content}
              </div>
            )}

            {/* Imagem do Post */}
            {post.image_url && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', backgroundColor: '#0B0F17' }}>
                <img
                  src={post.image_url}
                  alt="Post Mídia"
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Ações (Curtir / Comentar) */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: '#94A3B8' }}>
              <button
                onClick={() => handleToggleLike(post.id, !!post.user_has_liked)}
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
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#FFF' }}>Comentários</h3>
              <button
                onClick={() => setSelectedPost(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Post Original Resumido */}
            <div style={{ backgroundColor: '#0B0F17', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', color: '#CBD5E1' }}>
              <strong>{selectedPost.profiles?.full_name}:</strong> {selectedPost.content}
            </div>

            {/* Lista de Comentários */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              {loadingComments ? (
                <div style={{ color: '#6366F1', textAlign: 'center', padding: '10px' }}>Carregando respostas...</div>
              ) : comments.length === 0 ? (
                <div style={{ color: '#94A3B8', textAlign: 'center', padding: '10px' }}>Seja o primeiro a comentar!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} style={{ marginBottom: '12px', borderBottom: '1px solid #1E293B', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#818CF8' }}>
                      {c.profiles?.full_name || 'Usuário'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#E2E8F0', marginTop: '2px' }}>{c.content}</div>
                  </div>
                ))
              )}
            </div>

            {/* Campo de Novo Comentário */}
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

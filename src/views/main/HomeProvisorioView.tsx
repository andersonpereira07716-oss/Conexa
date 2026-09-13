import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  author_name: string;
  author_username: string;
  content: string;
  likes_count: number;
  created_at: string;
  is_liked?: boolean;
  comments_count?: number;
}

export const FeedView: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activePostForComments, setActivePostForComments] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchCurrentUserAndPosts();
  }, []);

  const fetchCurrentUserAndPosts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (postsData && user) {
        const { data: userLikes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

        const { data: allComments } = await supabase
          .from('comments')
          .select('post_id');

        const commentCounts: Record<string, number> = {};
        allComments?.forEach(c => {
          commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
        });

        const formattedPosts = postsData.map((post: Post) => ({
          ...post,
          is_liked: likedPostIds.has(post.id),
          comments_count: commentCounts[post.id] || 0
        }));

        setPosts(formattedPosts);
      } else {
        setPosts(postsData || []);
      }
    } catch (err) {
      console.error('Erro ao carregar feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !currentUser) return;

    try {
      setPublishing(true);
      const authorName = currentUser.user_metadata?.full_name || 'Usuário CONEXA';
      const authorUsername = currentUser.email ? currentUser.email.split('@')[0] : 'usuario';

      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: currentUser.id,
            author_name: authorName,
            author_username: authorUsername,
            content: newPost.trim(),
            likes_count: 0
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPosts([{ ...data, is_liked: false, comments_count: 0 }, ...posts]);
        setNewPost('');
      }
    } catch (err: any) {
      alert('Erro ao publicar: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja realmente apagar esta publicação?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      if (activePostForComments === postId) {
        setActivePostForComments(null);
      }
    } catch (err: any) {
      alert('Erro ao deletar post: ' + err.message);
    }
  };

  const handleToggleLike = async (post: Post) => {
    if (!currentUser) return;

    const newIsLiked = !post.is_liked;
    const newLikesCount = newIsLiked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1);

    setPosts(posts.map(p => p.id === post.id ? { ...p, is_liked: newIsLiked, likes_count: newLikesCount } : p));

    try {
      if (newIsLiked) {
        await supabase.from('likes').insert([{ user_id: currentUser.id, post_id: post.id }]);
      } else {
        await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('post_id', post.id);
      }

      await supabase.from('posts').update({ likes_count: newLikesCount }).eq('id', post.id);
    } catch (err) {
      console.error('Erro ao curtir post:', err);
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (activePostForComments === postId) {
      setActivePostForComments(null);
      return;
    }

    setActivePostForComments(postId);

    if (!commentsMap[postId]) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setCommentsMap(prev => ({ ...prev, [postId]: data }));
        }
      } catch (err) {
        console.error('Erro ao buscar comentários:', err);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newCommentText.trim() || !currentUser) return;

    try {
      setSubmittingComment(true);
      const authorName = currentUser.user_metadata?.full_name || 'Usuário CONEXA';

      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: currentUser.id,
            author_name: authorName,
            content: newCommentText.trim()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data]
        }));

        setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
        setNewCommentText('');
      }
    } catch (err: any) {
      alert('Erro ao comentar: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Deseja realmente apagar este comentário?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
      }));

      setPosts(posts.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) } : p));
    } catch (err: any) {
      alert('Erro ao apagar comentário: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px', color: 'var(--text)', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#6366F1', margin: 0, letterSpacing: '1px' }}>CONEXA</h1>
        <span style={{ fontSize: '1.2rem' }}>🔔</span>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
        <textarea
          placeholder="O que está acontecendo?"
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text)',
            fontSize: '0.95rem',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            onClick={handleCreatePost}
            disabled={publishing || !newPost.trim()}
            style={{
              backgroundColor: '#6366F1',
              color: '#FFF',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: publishing || !newPost.trim() ? 'not-allowed' : 'pointer',
              opacity: publishing || !newPost.trim() ? 0.6 : 1
            }}
          >
            {publishing ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando publicações...</p>
      ) : posts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma publicação ainda. Seja o primeiro!</p>
      ) : (
        posts.map((post) => (
          <div key={post.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#FFF' }}>
                  {post.author_name ? post.author_name.substring(0, 2).toUpperCase() : 'CX'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>{post.author_name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{post.author_username}</span>
                </div>
              </div>

              {currentUser && currentUser.id === post.user_id && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  title="Apagar publicação"
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                >
                  🗑️
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', margin: '0 0 14px 0', lineHeight: '1.4' }}>
              {post.content}
            </p>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <button
                onClick={() => handleToggleLike(post)}
                style={{ backgroundColor: 'transparent', border: 'none', color: post.is_liked ? '#EF4444' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: 0 }}
              >
                <span>{post.is_liked ? '❤️' : '🤍'}</span>
                <span>{post.likes_count}</span>
              </button>

              <button
                onClick={() => handleToggleComments(post.id)}
                style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: 0 }}
              >
                <span>💬</span>
                <span>{post.comments_count && post.comments_count > 0 ? post.comments_count : 'Comentar'}</span>
              </button>
            </div>

            {activePostForComments === post.id && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {(commentsMap[post.id] || []).length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Nenhum comentário ainda.</p>
                  ) : (
                    commentsMap[post.id].map((comment) => (
                      <div key={comment.id} style={{ backgroundColor: 'var(--bg)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#818CF8', display: 'block' }}>{comment.author_name}</span>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', margin: '2px 0 0 0' }}>{comment.content}</p>
                        </div>

                        {currentUser && currentUser.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(post.id, comment.id)}
                            title="Apagar comentário"
                            style={{ backgroundColor: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Escreva um comentário..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg)',
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
                    disabled={submittingComment || !newCommentText.trim()}
                    style={{
                      backgroundColor: '#6366F1',
                      color: '#FFF',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Enviar
                  </button>
                </div>

              </div>
            )}

          </div>
        ))
      )}

    </div>
  );
};

export default FeedView;

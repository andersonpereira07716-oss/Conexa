import React, { useState, useEffect } from 'react';
import BottomNavigation from '../../components/layout/BottomNavigation';
import ProfileProvisorioView from './ProfileProvisorioView';
import { OtherUserProfileView } from './OtherUserProfileView';
import { SearchUsersView } from './SearchUsersView';
import { FollowListView } from './FollowListView';
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export const HomeProvisoriaView: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [newPost, setNewPost] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [followListState, setFollowListState] = useState<{ userId: string; mode: 'followers' | 'following' } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

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
    if (!error && data) setFollowingIds(new Set(data.map((f: any) => f.followed_id)));
  };

  const fetchCommentCounts = async () => {
    const { data, error } = await supabase.from('comments').select('post_id');
    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((c: any) => { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
      setCommentCounts(counts);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (!error && data) setNotifications(data);
  };

  const fetchMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
    setMyAvatarUrl(data?.avatar_url || null);
  };

  useEffect(() => {
    fetchPosts();
    fetchFollowing();
    fetchCommentCounts();
    fetchNotifications();
    fetchMyProfile();
  }, [user]);

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPostImage(file);
    setNewPostImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setNewPostImage(null);
    setNewPostImagePreview(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !newPostImage) || !user) return;
    const authorName = (user.user_metadata?.full_name as string) || 'Você';
    const authorHandle = '@' + (user.email?.split('@')[0] || 'usuario');

    try {
      let imageUrl: string | null = null;
      if (newPostImage) {
        setUploadingImage(true);
        const ext = newPostImage.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('posts').upload(path, newPostImage);
        setUploadingImage(false);
        if (uploadError) { alert('Erro ao enviar imagem: ' + uploadError.message); return; }
        const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(path);
        imageUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase.from('posts').insert([{ content: newPost, user_id: user.id, author_name: authorName, author_handle: authorHandle, image_url: imageUrl }]).select();
      if (error) alert('Erro ao publicar: ' + error.message);
      else if (data) { setPosts([data[0], ...posts]); setNewPost(''); handleRemoveImage(); }
    } catch (err) {
      console.error('Erro na gravação do post:', err);
      setUploadingImage(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Apagar esta publicação?')) return;
    const backup = posts;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { alert('Erro ao apagar: ' + error.message); setPosts(backup); }
  };

  const handleLike = async (post: any) => {
    const updatedLikes = (post.likes_count || 0) + 1;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes_count: updatedLikes } : p)));
    const { error } = await supabase.from('posts').update({ likes_count: updatedLikes }).eq('id', post.id);
    if (error) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes_count: post.likes_count } : p)));
      return;
    }
    if (user && post.user_id && post.user_id !== user.id) {
      const myName = (user.user_metadata?.full_name as string) || 'Alguém';
      supabase.from('notifications').insert([{ user_id: post.user_id, actor_id: user.id, actor_name: myName, type: 'like', post_id: post.id }]).then(() => {});
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return;
    setFollowingIds((prev) => new Set(prev).add(targetUserId));
    const { error } = await supabase.from('follows').insert([{ follower_id: user.id, followed_id: targetUserId }]);
    if (error) { setFollowingIds((prev) => { const next = new Set(prev); next.delete(targetUserId); return next; }); return; }
    const myName = (user.user_metadata?.full_name as string) || 'Alguém';
    supabase.from('notifications').insert([{ user_id: targetUserId, actor_id: user.id, actor_name: myName, type: 'follow' }]).then(() => {});
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;
    setFollowingIds((prev) => { const next = new Set(prev); next.delete(targetUserId); return next; });
    const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', targetUserId);
    if (error) setFollowingIds((prev) => new Set(prev).add(targetUserId));
  };

  const toggleComments = async (postId: string) => {
    if (openComments.has(postId)) {
      setOpenComments((prev) => { const next = new Set(prev); next.delete(postId); return next; });
      return;
    }
    setOpenComments((prev) => new Set(prev).add(postId));
    if (!comments[postId]) {
      setLoadingComments((prev) => new Set(prev).add(postId));
      const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
      if (!error && data) setComments((prev) => ({ ...prev, [postId]: data }));
      setLoadingComments((prev) => { const next = new Set(prev); next.delete(postId); return next; });
    }
  };

  const handleAddComment = async (post: any) => {
    const text = (commentInputs[post.id] || '').trim();
    if (!text || !user) return;
    const authorName = (user.user_metadata?.full_name as string) || 'Você';
    const authorHandle = '@' + (user.email?.split('@')[0] || 'usuario');
    const { data, error } = await supabase.from('comments').insert([{ post_id: post.id, user_id: user.id, author_name: authorName, author_handle: authorHandle, content: text }]).select();
    if (error) { alert('Erro ao comentar: ' + error.message); return; }
    if (data) {
      setComments((prev) => ({ ...prev, [post.id]: [...(prev[post.id] || []), data[0]] }));
      setCommentCounts((prev) => ({ ...prev, [post.id]: (prev[post.id] || 0) + 1 }));
      setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
      if (post.user_id && post.user_id !== user.id) {
        supabase.from('notifications').insert([{ user_id: post.user_id, actor_id: user.id, actor_name: authorName, type: 'comment', post_id: post.id }]).then(() => {});
      }
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const backup = comments[postId] || [];
    setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).filter((c) => c.id !== commentId) }));
    setCommentCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }));
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      alert('Erro ao apagar comentário: ' + error.message);
      setComments((prev) => ({ ...prev, [postId]: backup }));
      setCommentCounts((prev) => ({ ...prev, [postId]: backup.length }));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggleNotifications = async () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && unreadCount > 0 && user) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    }
  };

  const notifText = (n: any) => {
    if (n.type === 'follow') return `${n.actor_name} começou a seguir você`;
    if (n.type === 'like') return `${n.actor_name} curtiu sua publicação`;
    if (n.type === 'comment') return `${n.actor_name} comentou na sua publicação`;
    return '';
  };

  if (followListState) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
        <FollowListView
          userId={followListState.userId}
          mode={followListState.mode}
          onBack={() => setFollowListState(null)}
          onSelectUser={(id) => { setFollowListState(null); setViewingUserId(id); }}
        />
        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => { setFollowListState(null); setActiveTab(tab); }} />
      </div>
    );
  }

  if (viewingUserId) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
        <OtherUserProfileView
          userId={viewingUserId}
          onBack={() => setViewingUserId(null)}
          onOpenFollowList={(uid, mode) => setFollowListState({ userId: uid, mode })}
        />
        <BottomNavigation activeTab={activeTab} onTabChange={(tab) => { setViewingUserId(null); setActiveTab(tab); }} />
      </div>
    );
  }

  if (activeTab === 'search') {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
        <SearchUsersView onSelectUser={(id) => setViewingUserId(id)} />
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  if (activeTab === 'profile') {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
        <ProfileProvisorioView onOpenFollowList={(mode) => user && setFollowListState({ userId: user.id, mode })} />
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', position: 'relative' }}>
      <div style={{ padding: '20px', paddingBottom: '90px', boxSizing: 'border-box', maxWidth: '560px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative' }}>
          <h1 style={{ color: '#818CF8', margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.5px' }}>CONEXA</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <div onClick={handleToggleNotifications} style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '1px solid var(--border)', cursor: 'pointer' }}>🔔</div>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#EF4444', color: '#FFF', fontSize: '0.65rem', fontWeight: 700, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>
              )}
              {notifOpen && (
                <div style={{ position: 'absolute', top: '46px', right: 0, width: '280px', maxHeight: '360px', overflowY: 'auto', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 20 }}>
                  {notifications.length === 0 ? (
                    <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>Nenhuma notificação ainda.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} onClick={() => { setNotifOpen(false); setViewingUserId(n.actor_id); }} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: n.read ? 'transparent' : 'rgba(99,102,241,0.08)' }}>
                        <p style={{ margin: 0, color: 'var(--text)' }}>{notifText(n)}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button onClick={signOut} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '20px', padding: '7px 14px', fontSize: '0.75rem', cursor: 'pointer' }}>Sair</button>
          </div>
        </header>

        <form onSubmit={handleCreatePost} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px', marginBottom: '24px', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
          <textarea placeholder="O que está acontecendo?" value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={2} style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.95rem', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          {newPostImagePreview && (
            <div style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
              <img src={newPostImagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', display: 'block' }} />
              <button type="button" onClick={handleRemoveImage} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#FFF', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <label style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
              🖼️
              <input type="file" accept="image/*" onChange={handleSelectImage} style={{ display: 'none' }} />
            </label>
            <button type="submit" disabled={(!newPost.trim() && !newPostImage) || uploadingImage} style={{ backgroundColor: (newPost.trim() || newPostImage) && !uploadingImage ? '#6366F1' : '#334155', color: '#FFF', border: 'none', padding: '9px 20px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', cursor: (newPost.trim() || newPostImage) && !uploadingImage ? 'pointer' : 'default' }}>
              {uploadingImage ? 'Enviando...' : 'Publicar'}
            </button>
          </div>
        </form>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando publicações...</p>
        ) : posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma publicação ainda. Seja o primeiro!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {posts.map((post) => {
              const isOwnPost = post.user_id === user?.id;
              const isFollowing = followingIds.has(post.user_id);
              const initials = post.author_name ? post.author_name.substring(0, 2).toUpperCase() : 'CX';
              return (
                <div key={post.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div
                      onClick={() => { if (post.user_id) { isOwnPost ? setActiveTab('profile') : setViewingUserId(post.user_id); } }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: post.user_id ? 'pointer' : 'default' }}
                    >
                      {isOwnPost && myAvatarUrl ? (
                        <img src={myAvatarUrl} alt="avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avatarColor(post.author_handle || post.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#0B0F17' }}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{post.author_name || 'Usuário'}</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{post.author_handle || '@conexa'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!isOwnPost && post.user_id && (
                        <button
                          onClick={() => (isFollowing ? handleUnfollow(post.user_id) : handleFollow(post.user_id))}
                          style={{ background: isFollowing ? 'transparent' : '#6366F1', border: isFollowing ? '1px solid var(--border)' : 'none', color: isFollowing ? 'var(--text-secondary)' : '#FFF', borderRadius: '16px', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                        >
                          {isFollowing ? 'Seguindo' : 'Seguir'}
                        </button>
                      )}
                      {isOwnPost && (
                        <button onClick={() => handleDeletePost(post.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                  {post.content && (
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.92rem', color: 'var(--text-body)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{post.content}</p>
                  )}
                  {post.image_url && (
                    <img src={post.image_url} alt="post" style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', borderRadius: '14px', marginBottom: '14px', display: 'block' }} />
                  )}
                  <div style={{ display: 'flex', gap: '22px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <button onClick={() => handleLike(post)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                      ❤️ {post.likes_count || 0}
                    </button>
                    <button onClick={() => toggleComments(post.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                      💬 {commentCounts[post.id] || 0}
                    </button>
                  </div>
                  {openComments.has(post.id) && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                      {loadingComments.has(post.id) ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Carregando comentários...</p>
                      ) : (comments[post.id] || []).length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum comentário ainda.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                          {(comments[post.id] || []).map((c: any) => (
                            <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: avatarColor(c.author_handle || c.id), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#0B0F17' }}>
                                {(c.author_name || 'U').substring(0, 2).toUpperCase()}
                              </div>
                              <div style={{ backgroundColor: 'var(--surface-alt)', borderRadius: '12px', padding: '8px 12px', flex: 1 }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '2px', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{c.author_name}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.author_handle}</span>
                                  </div>
                                  {c.user_id === user?.id && (
                                    <button onClick={() => handleDeleteComment(post.id, c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>🗑️</button>
                                  )}
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)' }}>{c.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post); }}
                          placeholder="Escreva um comentário..."
                          style={{ flex: 1, backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '14px', padding: '8px 12px', color: 'var(--text)', fontSize: '0.82rem', outline: 'none' }}
                        />
                        <button
                          onClick={() => handleAddComment(post)}
                          disabled={!(commentInputs[post.id] || '').trim()}
                          style={{ background: (commentInputs[post.id] || '').trim() ? '#6366F1' : '#334155', border: 'none', color: '#FFF', borderRadius: '14px', padding: '0 16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
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
      <BottomNavigation activeTab={activeTab} onTabChange={(tab) => { setViewingUserId(null); setActiveTab(tab); }} />
    </div>
  );
};

export default HomeProvisoriaView;

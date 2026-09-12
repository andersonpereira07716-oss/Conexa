import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

interface Post {
  id: string | number;
  content: string;
  created_at?: string;
  author_email?: string;
}

export function FeedView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchPosts = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Erro ao buscar posts:', error.message);
    } else {
      setPosts(data || []);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;

    const { error } = await supabase.from('posts').insert([
      {
        content: newPostContent,
        author_email: user?.email || 'Usuário Conexa',
      },
    ]);

    if (error) {
      alert('Erro ao publicar: ' + error.message);
    } else {
      setNewPostContent('');
      fetchPosts();
    }
    setLoading(false);
  };

  const handleDeletePost = async (id: string | number) => {
    if (!confirm('Deseja realmente excluir esta publicação?')) return;

    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchPosts();
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4 text-white pb-24">
      <h1 className="text-2xl font-bold mb-6 text-center">Feed Conexa</h1>

      <form onSubmit={handleCreatePost} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-lg">
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="No que você está pensando?"
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none mb-3"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !newPostContent.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {fetching ? (
          <p className="text-center text-slate-400 text-sm">Carregando feed...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-slate-400 text-sm">Nenhuma publicação nesta comunidade ainda.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-400">
                  {post.author_email || 'Usuário Conexa'}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">
                    {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Hoje'}
                  </span>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-xs text-red-400 hover:text-red-300 ml-2 transition-colors px-1 font-bold"
                    title="Excluir post"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-200 whitespace-pre-wrap">{post.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

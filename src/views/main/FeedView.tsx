import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Share } from 'react-native';
import { supabase } from '../../services/supabaseClient';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string };
  likes_count?: number;
  user_liked?: boolean;
}

export default function FeedView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles ( username ),
          post_likes ( user_id )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        likes_count: item.post_likes?.length || 0,
        user_liked: item.post_likes?.some((l: any) => l.user_id === user?.id)
      }));

      setPosts(formatted);
    } catch (error: any) {
      console.error('Erro ao buscar posts:', error.message);
    }
  }

  async function togglePostLike(postId: string, userLiked: boolean) {
    if (!currentUserId) return;
    try {
      if (userLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
      }
      fetchPosts();
    } catch (error: any) {
      console.error('Erro ao curtir post:', error);
    }
  }

  async function createPost() {
    if (!newPostContent.trim()) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('posts').insert({
        content: newPostContent,
        user_id: user.id
      });

      if (error) throw error;
      setNewPostContent('');
      fetchPosts();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(postId: string) {
    Alert.alert('Excluir Post', 'Deseja apagar esta publicação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('posts').delete().eq('id', postId);
          fetchPosts();
        }
      }
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed da Comunidade</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="O que você está pensando?"
          placeholderTextColor="#64748b"
          value={newPostContent}
          onChangeText={setNewPostContent}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={createPost} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Publicando...' : 'Publicar'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.postAuthor}>@{item.profiles?.username || 'Anônimo'}</Text>
              {currentUserId === item.user_id && (
                <TouchableOpacity onPress={() => deletePost(item.id)}>
                  <Text style={styles.deleteText}>Apagar</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.postContent}>{item.content}</Text>
            
            <View style={styles.postActions}>
              <TouchableOpacity onPress={() => togglePostLike(item.id, !!item.user_liked)}>
                <Text style={[styles.likeText, item.user_liked && styles.liked]}>
                  ❤️ {item.likes_count || 0} Curtidas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Share.share({ message: `Veja este post no Conexa: "${item.content}"` })}>
                <Text style={styles.shareText}>Compartilhar ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  inputContainer: { backgroundColor: '#1e293b', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  input: { color: '#fff', minHeight: 60, textAlignVertical: 'top', marginBottom: 10, fontSize: 16 },
  button: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  postCard: { backgroundColor: '#1e293b', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  postAuthor: { color: '#38bdf8', fontWeight: 'bold', fontSize: 14 },
  deleteText: { color: '#ef4444', fontSize: 12 },
  postContent: { color: '#e2e8f0', fontSize: 15, marginBottom: 10 },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 },
  likeText: { color: '#94a3b8', fontSize: 13 },
  liked: { color: '#ef4444', fontWeight: 'bold' },
  shareText: { color: '#94a3b8', fontSize: 13 }
});

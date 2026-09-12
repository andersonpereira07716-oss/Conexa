import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Share } from 'react-native';
import { supabase } from '../../services/supabaseClient';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
  };
}

export default function FeedView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles ( username )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar posts:', error.message);
    }
  }

  async function createPost() {
    if (!newPostContent.trim()) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('posts')
        .insert({
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

  async function handleShare(content: string) {
    try {
      await Share.share({
        message: `Olha esse post no Conexa: "${content}"\n\nVenha conferir na plataforma!`,
      });
    } catch (error: any) {
      Alert.alert('Erro ao compartilhar', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feed da Comunidade</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="No que você está pensando?"
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
            <Text style={styles.postAuthor}>@{item.profiles?.username || 'Anônimo'}</Text>
            <Text style={styles.postContent}>{item.content}</Text>
            
            <View style={styles.postActions}>
              <TouchableOpacity onPress={() => handleShare(item.content)} style={styles.shareButton}>
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
  postAuthor: { color: '#38bdf8', fontWeight: 'bold', marginBottom: 6, fontSize: 14 },
  postContent: { color: '#e2e8f0', fontSize: 15, marginBottom: 10 },
  postActions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 },
  shareButton: { paddingVertical: 4, paddingHorizontal: 8 }
});

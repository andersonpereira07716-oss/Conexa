import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { supabase } from '../../services/supabaseClient';
import { Theme } from '../../styles/theme';

const SafeFlatList = FlatList as unknown as React.ComponentType<any>;

interface FeedViewProps {
  currentCommunity?: string;
}

export default function FeedView({ currentCommunity }: FeedViewProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [newContent, setNewContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchPosts();
  }, [currentCommunity]);

  async function fetchPosts() {
    let query = supabase.from('posts').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false });
    
    if (currentCommunity) {
      query = query.eq('community', currentCommunity);
    }

    const { data, error } = await query;
    if (!error && data) {
      setPosts(data);
    }
  }

  async function createPost() {
    if (!newContent.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: newContent,
      community: currentCommunity || 'geral',
    });

    if (!error) {
      setNewContent('');
      fetchPosts();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={currentCommunity ? `Postar em #${currentCommunity}...` : "No que você está pensando?"}
          placeholderTextColor={Theme.colors.textSecondary}
          value={newContent}
          onChangeText={setNewContent}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={createPost}>
          <Text style={styles.buttonText}>Publicar</Text>
        </TouchableOpacity>
      </View>

      <SafeFlatList
        data={posts}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.author}>@{item.profiles?.username || 'usuário'}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.content}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma publicação nesta comunidade ainda.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, padding: 16 },
  inputContainer: { backgroundColor: Theme.colors.surface, padding: 12, borderRadius: Theme.radius.md, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
  input: { color: Theme.colors.textPrimary, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  button: { backgroundColor: Theme.colors.primary, padding: 10, borderRadius: Theme.radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  postCard: { backgroundColor: Theme.colors.surface, padding: 16, borderRadius: Theme.radius.md, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  author: { fontWeight: 'bold', color: Theme.colors.accent },
  date: { fontSize: 12, color: Theme.colors.textSecondary },
  content: { color: Theme.colors.textPrimary, fontSize: 14 },
  empty: { textAlign: 'center', color: Theme.colors.textSecondary, marginTop: 24 }
});

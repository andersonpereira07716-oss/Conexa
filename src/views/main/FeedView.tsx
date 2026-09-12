import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Share, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/supabaseClient';
import { Theme } from '../../styles/theme';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  community_id?: string;
  profiles?: { username: string; avatar_url?: string };
  communities?: { name: string; slug: string };
  likes_count?: number;
  user_liked?: boolean;
}

interface Community {
  id: string;
  name: string;
  slug: string;
}

export default function FeedView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchCommunities();
    fetchPosts();
  }, [selectedCommunity]);

  async function fetchCommunities() {
    const { data } = await supabase.from('communities').select('*');
    if (data) setCommunities(data);
  }

  async function fetchPosts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          user_id,
          community_id,
          profiles ( username, avatar_url ),
          communities ( name, slug ),
          post_likes ( user_id )
        `)
        .order('created_at', { ascending: false });

      if (selectedCommunity) {
        query = query.eq('community_id', selectedCommunity);
      }

      const { data, error } = await query;
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

  async function pickImage() {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function uploadImageAndGetUrl(uri: string): Promise<string | null> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `post_${Date.now()}.jpg`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('conexa-storage')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('conexa-storage')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Erro no upload da imagem:', error.message);
      return null;
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
    if (!newPostContent.trim() && !imageUri) return;
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let uploadedImageUrl = null;
      if (imageUri) {
        uploadedImageUrl = await uploadImageAndGetUrl(imageUri);
      }

      const defaultCommunity = communities[0]?.id;

      const { error } = await supabase.from('posts').insert({
        content: newPostContent,
        image_url: uploadedImageUrl,
        user_id: user.id,
        community_id: selectedCommunity || defaultCommunity
      });

      if (error) throw error;
      setNewPostContent('');
      setImageUri(null);
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
      <Text style={styles.title}>Conexa Feed</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterChip, !selectedCommunity && styles.filterChipActive]}
          onPress={() => setSelectedCommunity(null)}
        >
          <Text style={[styles.filterText, !selectedCommunity && styles.filterTextActive]}>🌐 Todos</Text>
        </TouchableOpacity>
        {communities.map(c => (
          <TouchableOpacity 
            key={c.id} 
            style={[styles.filterChip, selectedCommunity === c.id && styles.filterChipActive]}
            onPress={() => setSelectedCommunity(c.id)}
          >
            <Text style={[styles.filterText, selectedCommunity === c.id && styles.filterTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Compartilhe algo com sua comunidade..."
          placeholderTextColor={Theme.colors.textSecondary}
          value={newPostContent}
          onChangeText={setNewPostContent}
          multiline
        />

        {imageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImageBtn}>
              <Text style={styles.removeImageText}>✕ Remover</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.postActionsBar}>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            <Text style={styles.imagePickerText}>🖼️ Adicionar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={createPost} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Publicando...' : 'Publicar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View>
                <Text style={styles.postAuthor}>@{item.profiles?.username || 'Anônimo'}</Text>
                {item.communities?.name && (
                  <Text style={styles.communityTag}>#{item.communities.name}</Text>
                )}
              </View>
              {currentUserId === item.user_id && (
                <TouchableOpacity onPress={() => deletePost(item.id)}>
                  <Text style={styles.deleteText}>Apagar</Text>
                </TouchableOpacity>
              )}
            </View>

            {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}

            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.postImage} />
            )}
            
            <View style={styles.postFooterActions}>
              <TouchableOpacity onPress={() => togglePostLike(item.id, !!item.user_liked)}>
                <Text style={[styles.likeText, item.user_liked && styles.liked]}>
                  💜 {item.likes_count || 0} Curtidas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Share.share({ message: `Veja este post no Conexa: "${item.content || 'Foto'}"` })}>
                <Text style={styles.shareText}>Compartilhar ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma publicação nesta comunidade ainda.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: Theme.colors.textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: 0.5 },
  filterContainer: { maxHeight: 45, marginBottom: 14 },
  filterChip: { backgroundColor: Theme.colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Theme.radius.full, marginRight: 8, borderWidth: 1, borderColor: Theme.colors.border, height: 36, justifyContent: 'center' },
  filterChipActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  filterText: { color: Theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  inputContainer: { backgroundColor: Theme.colors.surface, padding: 14, borderRadius: Theme.radius.md, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
  input: { color: Theme.colors.textPrimary, minHeight: 60, textAlignVertical: 'top', marginBottom: 10, fontSize: 15 },
  imagePreviewContainer: { marginBottom: 12, position: 'relative' },
  imagePreview: { width: '100%', height: 160, borderRadius: Theme.radius.sm, resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  removeImageText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  postActionsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 10 },
  imagePickerBtn: { padding: 8 },
  imagePickerText: { color: Theme.colors.accent, fontWeight: '600', fontSize: 13 },
  button: { backgroundColor: Theme.colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Theme.radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  postCard: { backgroundColor: Theme.colors.surface, padding: 16, borderRadius: Theme.radius.md, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  postAuthor: { color: Theme.colors.accent, fontWeight: 'bold', fontSize: 14 },
  communityTag: { color: Theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  deleteText: { color: Theme.colors.danger, fontSize: 12 },
  postContent: { color: Theme.colors.textPrimary, fontSize: 15, marginBottom: 10, lineHeight: 22 },
  postImage: { width: '100%', height: 200, borderRadius: Theme.radius.sm, marginBottom: 12, resizeMode: 'cover' },
  postFooterActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 10 },
  likeText: { color: Theme.colors.textSecondary, fontSize: 13 },
  liked: { color: Theme.colors.accent, fontWeight: 'bold' },
  shareText: { color: Theme.colors.textSecondary, fontSize: 13 },
  empty: { color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }
});

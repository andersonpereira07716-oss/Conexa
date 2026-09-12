import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { supabase } from '../../services/supabaseClient';

export default function ProfileView() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, website, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setUsername(data.username || '');
        setBio(data.bio || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        username,
        bio,
        website,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      Alert.alert('Sucesso!', 'Perfil atualizado com sucesso.');
    } catch (error: any) {
      Alert.alert('Erro ao atualizar', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Meu Perfil</Text>
      
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>?</Text>
        </View>
      )}

      <Text style={styles.label}>Nome de Usuário</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Seu nome" placeholderTextColor="#64748b" />

      <Text style={styles.label}>Biografia</Text>
      <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder="Fale um pouco sobre você..." placeholderTextColor="#64748b" multiline />

      <Text style={styles.label}>Website / GitHub</Text>
      <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="https://seu-site.com" placeholderTextColor="#64748b" />

      <TouchableOpacity style={styles.button} onPress={updateProfile} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Salvando...' : 'Salvar Alterações'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 20 },
  avatarPlaceholder: { backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, color: '#fff' },
  label: { color: '#94a3b8', marginBottom: 5, fontSize: 14 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

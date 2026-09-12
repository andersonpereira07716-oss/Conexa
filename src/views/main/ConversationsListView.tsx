import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../services/supabaseClient';

interface Profile {
  id: string;
  username: string;
  bio?: string;
}

export default function ConversationsListView({ onSelectUser }: { onSelectUser: (userId: string, username: string) => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, bio')
        .neq('id', user?.id || '');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mensagens & Conversas</Text>
      
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => onSelectUser(item.id, item.username)}
          >
            <View>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.bio} numberOfLines={1}>{item.bio || 'Sem bio cadastrada.'}</Text>
            </View>
            <Text style={styles.chatAction}>Conversar 💬</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum outro usuário encontrado.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#1e293b', padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { color: '#38bdf8', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  bio: { color: '#94a3b8', fontSize: 13, maxWidth: '70%' },
  chatAction: { color: '#3b82f6', fontWeight: 'bold', fontSize: 13 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 }
});

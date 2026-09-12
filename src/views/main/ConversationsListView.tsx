import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../services/supabaseClient';
import { Theme } from '../../styles/theme';

const SafeFlatList = FlatList as unknown as React.ComponentType<any>;

interface ConversationsListViewProps {
  onSelectUser: (userId: string, userName: string) => void;
}

export default function ConversationsListView({ onSelectUser }: ConversationsListViewProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        fetchProfiles(user.id);
      }
    });
  }, []);

  async function fetchProfiles(currentId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentId);

    if (!error && data) {
      setProfiles(data);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mensagens</Text>
      <SafeFlatList
        data={profiles}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity style={styles.userCard} onPress={() => onSelectUser(item.id, item.username)}>
            <Text style={styles.username}>@{item.username}</Text>
            <Text style={styles.action}>Iniciar chat →</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum outro usuário encontrado.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.textPrimary, marginBottom: 16 },
  userCard: { backgroundColor: Theme.colors.surface, padding: 16, borderRadius: Theme.radius.md, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  username: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.accent },
  action: { fontSize: 14, color: Theme.colors.textSecondary },
  empty: { textAlign: 'center', color: Theme.colors.textSecondary, marginTop: 24 }
});

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../services/supabaseClient';
import { Theme } from '../../styles/theme';

interface MessagesViewProps {
  receiverId: string;
  receiverName: string;
  onBack?: () => void;
}

const SafeFlatList = FlatList as unknown as React.ComponentType<any>;

export default function MessagesView({ receiverId, receiverName, onBack }: MessagesViewProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchMessages();
  }, [receiverId]);

  async function fetchMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: newMessage,
    });

    if (!error) {
      setNewMessage('');
      fetchMessages();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Chat com @{receiverName}</Text>
      </View>

      <SafeFlatList
        data={messages}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => {
          const isMe = item.sender_id === currentUserId;
          return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          );
        }}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite sua mensagem..."
          placeholderTextColor={Theme.colors.textSecondary}
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Theme.colors.surface, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  backButton: { marginRight: 12 },
  backText: { color: Theme.colors.accent, fontSize: 14, fontWeight: 'bold' },
  title: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.textPrimary },
  messageList: { padding: 16 },
  messageBubble: { padding: 12, borderRadius: Theme.radius.md, marginBottom: 8, maxWidth: '80%' },
  myMessage: { backgroundColor: Theme.colors.primary, alignSelf: 'flex-end' },
  theirMessage: { backgroundColor: Theme.colors.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: Theme.colors.border },
  messageText: { color: '#fff', fontSize: 14 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  input: { flex: 1, backgroundColor: Theme.colors.background, color: Theme.colors.textPrimary, padding: 10, borderRadius: Theme.radius.sm, borderWidth: 1, borderColor: Theme.colors.border, marginRight: 8 },
  sendButton: { backgroundColor: Theme.colors.primary, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Theme.radius.sm },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});

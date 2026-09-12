import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../services/supabaseClient';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

export default function MessagesView({ receiverId, receiverName }: { receiverId: string, receiverName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchMessages();

    // Inscrição em tempo real para novas mensagens
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [receiverId]);

  async function fetchMessages() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar mensagens:', error.message);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentUserId) return;

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: newMessage
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Chat com @{receiverName}</Text>
      
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMe = item.sender_id === currentUserId;
          return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#64748b"
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
  container: { flex: 1, backgroundColor: '#0f172a', padding: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12, textAlign: 'center' },
  bubble: { padding: 10, borderRadius: 10, marginVertical: 4, maxWidth: '75%' },
  myBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end' },
  theirBubble: { backgroundColor: '#1e293b', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#334155' },
  messageText: { color: '#fff', fontSize: 14 },
  inputContainer: { flexDirection: 'row', marginTop: 8 },
  input: { flex: 1, backgroundColor: '#1e293b', color: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginRight: 8 },
  sendButton: { backgroundColor: '#3b82f6', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' }
});

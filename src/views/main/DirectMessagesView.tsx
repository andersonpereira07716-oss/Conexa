import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface DirectMessagesViewProps {
  onBack: () => void;
}

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Profile[]>([]);
  const [activeContact, setActiveContact] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.id);
      const subscription = subscribeToMessages();
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [activeContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      setLoadingContacts(true);
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id, follower_id')
        .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

      const contactIds = new Set<string>();
      if (followsData) {
        followsData.forEach((f) => {
          if (f.follower_id !== user.id) contactIds.add(f.follower_id);
          if (f.following_id !== user.id) contactIds.add(f.following_id);
        });
      }

      if (contactIds.size === 0) {
        setConversations([]);
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', Array.from(contactIds));

      setConversations(profilesData || []);
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user?.id && newMsg.receiver_id === activeContact?.id) ||
            (newMsg.sender_id === activeContact?.id && newMsg.receiver_id === user?.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !activeContact) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const { error } = await supabase.from('messages').insert([
        {
          sender_id: user.id,
          receiver_id: activeContact.id,
          content: text,
        },
      ]);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: 'var(--border)',
            color: '#FFF',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← Voltar
        </button>
        <h2 style={{ color: '#FFF', margin: 0, fontSize: '20px' }}>💬 Mensagens Diretas</h2>
      </div>

      <div style={{ display: 'flex', flex: 1, backgroundColor: '#131B2E', borderRadius: '16px', overflow: 'hidden' }}>
        <div
          style={{
            width: activeContact ? '35%' : '100%',
            borderRight: activeContact ? '1px solid var(--border)' : 'none',
            overflowY: 'auto',
            padding: '12px',
          }}
        >
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>CONVERSAS</h3>
          {loadingContacts ? (
            <div style={{ color: '#6366F1', fontSize: '13px' }}>Carregando contatos...</div>
          ) : conversations.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Siga outros usuários para conversar com eles.</div>
          ) : (
            conversations.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: activeContact?.id === contact.id ? 'var(--border)' : 'transparent',
                  cursor: 'pointer',
                  marginBottom: '6px',
                }}
              >
                {contact.avatar_url ? (
                  <img
                    src={contact.avatar_url}
                    alt="Avatar"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#6366F1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  >
                    {getInitials(contact.full_name)}
                  </div>
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: '14px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {contact.full_name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>@{contact.username}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {activeContact && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontWeight: 'bold', color: '#FFF' }}>{activeContact.full_name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>@{activeContact.username}</div>
              </div>
              <button
                onClick={() => setActiveContact(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingMessages ? (
                <div style={{ color: '#6366F1', textAlign: 'center' }}>Carregando conversa...</div>
              ) : messages.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>Nenhuma mensagem ainda. Diga olá! 👋</div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        backgroundColor: isMine ? '#6366F1' : 'var(--border)',
                        color: '#FFF',
                        padding: '10px 14px',
                        borderRadius: isMine ? '16px 16px 0px 16px' : '16px 16px 16px 0px',
                        maxWidth: '75%',
                        fontSize: '14px',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Escreva uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '8px 14px',
                  color: '#FFF',
                  outline: 'none',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                style={{
                  backgroundColor: '#6366F1',
                  color: '#FFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: !newMessage.trim() ? 0.5 : 1,
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessagesView;

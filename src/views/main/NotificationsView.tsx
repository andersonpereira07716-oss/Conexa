import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface Notification {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  post_id?: string;
  actor: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

interface NotificationsViewProps {
  onBack: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          read,
          created_at,
          post_id,
          actor:actor_id (full_name, username, avatar_url)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data as any) || []);

      // Marcar notificações como lidas
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: '#1E293B',
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
        <h1 style={{ color: '#818CF8', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Notificações</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#6366F1', padding: '20px' }}>Carregando notificações...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px' }}>Você ainda não tem notificações.</div>
      ) : (
        notifications.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: item.read ? '#131B2E' : '#1E293B',
              padding: '14px 16px',
              borderRadius: '16px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderLeft: item.read ? 'none' : '4px solid #6366F1',
            }}
          >
            {item.actor?.avatar_url ? (
              <img
                src={item.actor.avatar_url}
                alt="Avatar"
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#FFF',
                  flexShrink: 0,
                }}
              >
                {getInitials(item.actor?.full_name)}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ color: '#FFF', fontSize: '14px' }}>
                <strong>{item.actor?.full_name || 'Usuário'}</strong>{' '}
                {item.type === 'like' ? 'curtiu a sua publicação.' : 'comentou na sua publicação.'}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                {new Date(item.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationsView;

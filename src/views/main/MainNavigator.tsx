import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import FeedView from './FeedView';
import ConversationsListView from './ConversationsListView';
import MessagesView from './MessagesView';
import NotificationsView from './NotificationsView';
import ProfileView from './ProfileView';

export default function MainNavigator() {
  const [currentTab, setCurrentTab] = useState<'feed' | 'chats' | 'notifications' | 'profile'>('feed');
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeChat ? (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.backButton} onPress={() => setActiveChat(null)}>
              <Text style={styles.backText}>← Voltar para Conversas</Text>
            </TouchableOpacity>
            <MessagesView receiverId={activeChat.id} receiverName={activeChat.name} />
          </View>
        ) : (
          <>
            {currentTab === 'feed' && <FeedView />}
            {currentTab === 'chats' && (
              <ConversationsListView 
                onSelectUser={(id, name) => setActiveChat({ id, name })} 
              />
            )}
            {currentTab === 'notifications' && <NotificationsView />}
            {currentTab === 'profile' && <ProfileView />}
          </>
        )}
      </View>

      {/* Barra de Abas Inferior */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setCurrentTab('feed'); setActiveChat(null); }}>
          <Text style={[styles.tabText, currentTab === 'feed' && !activeChat && styles.activeTab]}>🏠 Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setCurrentTab('chats'); setActiveChat(null); }}>
          <Text style={[styles.tabText, currentTab === 'chats' || activeChat && styles.activeTab]}>💬 Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setCurrentTab('notifications'); setActiveChat(null); }}>
          <Text style={[styles.tabText, currentTab === 'notifications' && !activeChat && styles.activeTab]}>🔔 Avisos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setCurrentTab('profile'); setActiveChat(null); }}>
          <Text style={[styles.tabText, currentTab === 'profile' && !activeChat && styles.activeTab]}>👤 Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { flex: 1 },
  backButton: { padding: 12, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  backText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 14 },
  tabBar: { height: 60, backgroundColor: '#1e293b', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#334155', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: '#94a3b8', fontSize: 12 },
  activeTab: { color: '#38bdf8', fontWeight: 'bold' }
});

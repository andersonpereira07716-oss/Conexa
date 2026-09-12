import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme } from '../../styles/theme';
import FeedView from './FeedView';
import ConversationsListView from './ConversationsListView';
import MessagesView from './MessagesView';
import TrendingTopicsView from './TrendingTopicsView';
import NotificationsView from './NotificationsView';
import ProfileView from './ProfileView';

export function MainNavigator() {
  const [currentTab, setCurrentTab] = useState<'feed' | 'chats' | 'trending' | 'notifications' | 'profile'>('feed');
  const [activeChat, setActiveChat] = useState<{ userId: string; username: string } | null>(null);

  function handleSelectUser(userId: string, username: string) {
    setActiveChat({ userId, username });
    setCurrentTab('chats');
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {currentTab === 'feed' && <FeedView />}
        {currentTab === 'chats' && (
          activeChat ? (
            <MessagesView receiverId={activeChat.userId} receiverName={activeChat.username} onBack={() => setActiveChat(null)} />
          ) : (
            <ConversationsListView onSelectUser={handleSelectUser} />
          )
        )}
        {currentTab === 'trending' && <TrendingTopicsView onSelectHashtag={(tag) => {}} />}
        {currentTab === 'notifications' && <NotificationsView onBack={() => setCurrentTab('feed')} />}
        {currentTab === 'profile' && <ProfileView />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setActiveChat(null); setCurrentTab('feed'); }}>
          <Text style={[styles.tabText, currentTab === 'feed' && styles.activeTabText]}>🏠 Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setActiveChat(null); setCurrentTab('chats'); }}>
          <Text style={[styles.tabText, (currentTab === 'chats' || activeChat) && styles.activeTabText]}>💬 Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setActiveChat(null); setCurrentTab('trending'); }}>
          <Text style={[styles.tabText, currentTab === 'trending' && styles.activeTabText]}>🔥 Em alta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setActiveChat(null); setCurrentTab('notifications'); }}>
          <Text style={[styles.tabText, currentTab === 'notifications' && styles.activeTabText]}>🔔 Avisos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => { setActiveChat(null); setCurrentTab('profile'); }}>
          <Text style={[styles.tabText, currentTab === 'profile' && styles.activeTabText]}>👤 Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border, height: 60, justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabText: { color: Theme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  activeTabText: { color: Theme.colors.accent, fontWeight: 'bold' }
});

export default MainNavigator;

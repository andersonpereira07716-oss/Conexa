import React, { lazy, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Theme } from '../styles/theme';

const AuthView = lazy(() => import('../views/auth/AuthView').then(m => ({ default: m.AuthView || m.default })));
const MainNavigator = lazy(() => import('../views/main/MainNavigator').then(m => ({ default: m.MainNavigator || m.default })));
const FeedView = lazy(() => import('../views/main/FeedView'));
const ProfileView = lazy(() => import('../views/main/ProfileView'));

interface AppRoutesProps {
  session: any;
}

export default function AppRoutes({ session }: AppRoutesProps) {
  return (
    <Suspense fallback={
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    }>
      {session ? <MainNavigator /> : <AuthView />}
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: Theme.colors.background, justifyContent: 'center', alignItems: 'center' }
});

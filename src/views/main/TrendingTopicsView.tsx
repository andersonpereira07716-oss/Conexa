import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../services/supabaseClient';
import { Theme } from '../../styles/theme';

const SafeFlatList = FlatList as unknown as React.ComponentType<any>;

interface TrendingTopicsViewProps {
  onSelectHashtag: (hashtag: string) => void;
}

export default function TrendingTopicsView({ onSelectHashtag }: TrendingTopicsViewProps) {
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    fetchTrending();
  }, []);

  async function fetchTrending() {
    const { data, error } = await supabase
      .from('posts')
      .select('content');

    if (!error && data) {
      const hashtagCounts: { [key: string]: number } = {};
      data.forEach((post) => {
        const matches = post.content.match(/#[\wá-úÁ-Ú]+/g);
        if (matches) {
          matches.forEach((tag: string) => {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
          });
        }
      });

      const formatted = Object.keys(hashtagCounts).map((tag) => ({
        tag,
        count: hashtagCounts[tag],
      })).sort((a, b) => b.count - a.count);

      setTopics(formatted);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assuntos em Alta</Text>
      <SafeFlatList
        data={topics}
        keyExtractor={(item: any) => item.tag}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity style={styles.item} onPress={() => onSelectHashtag(item.tag.replace('#', ''))}>
            <Text style={styles.tag}>{item.tag}</Text>
            <Text style={styles.count}>{item.count} publicações</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma hashtag encontrada ainda.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.textPrimary, marginBottom: 16 },
  item: { backgroundColor: Theme.colors.surface, padding: 16, borderRadius: Theme.radius.md, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  tag: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.accent },
  count: { fontSize: 12, color: Theme.colors.textSecondary },
  empty: { textAlign: 'center', color: Theme.colors.textSecondary, marginTop: 24 }
});

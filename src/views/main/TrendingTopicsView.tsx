import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

interface HashtagCount {
  tag: string;
  count: number;
}

interface TrendingTopicsViewProps {
  onBack: () => void;
  onSelectTag?: (tag: string) => void;
}

export const TrendingTopicsView: React.FC<TrendingTopicsViewProps> = ({ onBack, onSelectTag }) => {
  const [hashtags, setHashtags] = useState<HashtagCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  const fetchTrendingHashtags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const counts: { [key: string]: number } = {};
      const regex = /#[\wà-úÀ-Ú]+/gi;

      if (data) {
        data.forEach((post) => {
          if (post.content) {
            const matches = post.content.match(regex);
            if (matches) {
              const uniqueTagsInPost = Array.from(new Set(matches.map((t) => t.toLowerCase())));
              uniqueTagsInPost.forEach((tag) => {
                counts[tag] = (counts[tag] || 0) + 1;
              });
            }
          }
        });
      }

      const sorted = Object.keys(counts)
        .map((tag) => ({ tag, count: counts[tag] }))
        .sort((a, b) => b.count - a.count);

      setHashtags(sorted);
    } catch (err) {
      console.error('Erro ao carregar Trending Topics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
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
        <h2 style={{ color: '#FFF', margin: 0, fontSize: '20px' }}>🔥 Assuntos do Momento</h2>
      </div>

      <div style={{ backgroundColor: '#131B2E', padding: '20px', borderRadius: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6366F1', padding: '20px' }}>Carregando tendências...</div>
        ) : hashtags.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
            Nenhuma hashtag em alta no momento. Crie um post usando `#` para começar!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {hashtags.map((item, index) => (
              <div
                key={item.tag}
                onClick={() => onSelectTag && onSelectTag(item.tag)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#0B0F17',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: '#94A3B8', display: 'block' }}>
                    #{index + 1} · Tendência no Conexa
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#818CF8', fontSize: '16px' }}>
                    {item.tag}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                  {item.count} {item.count === 1 ? 'publicação' : 'publicações'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingTopicsView;

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

// Lista de Avatares Predefinidos (Cyber/Minimalista)
const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Conexa1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Conexa2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Conexa3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
];

export const ProfileProvisorioView: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({ bio: '', avatar_url: '' });
  const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const currentUser = session.user;
        setUser(currentUser);

        // Buscar dados da tabela de profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setEditBio(profileData.bio || '');
          setSelectedAvatar(profileData.avatar_url || AVATAR_OPTIONS[0]);
        } else {
          setSelectedAvatar(AVATAR_OPTIONS[0]);
        }

        // Contador de Posts
        const { count: postsCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id);

        // Contador de Seguidores
        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', currentUser.id);

        // Contador de Seguindo
        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', currentUser.id);

        setStats({
          postsCount: postsCount || 0,
          followersCount: followersCount || 0,
          followingCount: followingCount || 0
        });
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const updates = {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Usuário CONEXA',
        bio: editBio,
        avatar_url: selectedAvatar,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) {
        alert('Erro ao salvar perfil: ' + error.message);
      } else {
        setProfile({ bio: editBio, avatar_url: selectedAvatar });
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Erro no salvamento:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px', color: '#F8FAFC', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>Meu Perfil</h2>
        <button 
          onClick={handleSignOut}
          style={{ backgroundColor: '#EF4444', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Sair
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94A3B8' }}>Carregando perfil...</p>
      ) : (
        <>
          {/* Card de Perfil */}
          <div style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
            
            {/* Foto de Avatar */}
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px auto', border: '2px solid #6366F1', backgroundColor: '#0B0F17' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {user?.email ? user.email.substring(0, 2).toUpperCase() : 'CX'}
                </div>
              )}
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{user?.user_metadata?.full_name || 'Usuário CONEXA'}</h3>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8', display: 'block', marginBottom: '10px' }}>{user?.email || '@conexa_user'}</span>

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontSize: '0.85rem', color: '#CBD5E1', margin: '0 0 16px 0', fontStyle: 'italic', padding: '0 10px' }}>
                "{profile.bio}"
              </p>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                backgroundColor: 'transparent',
                color: '#6366F1',
                border: '1px solid #6366F1',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
            </button>

            {/* Estatísticas */}
            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #1E293B', paddingTop: '16px' }}>
              <div>
                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', color: '#FFF' }}>{stats.postsCount}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Posts</span>
              </div>
              <div>
                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', color: '#FFF' }}>{stats.followersCount}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguidores</span>
              </div>
              <div>
                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '1.1rem', color: '#FFF' }}>{stats.followingCount}</span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguindo</span>
              </div>
            </div>
          </div>

          {/* Form de Edição de Perfil */}
          {isEditing && (
            <div style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem' }}>Escolha seu Avatar:</h4>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                {AVATAR_OPTIONS.map((avatar, idx) => (
                  <img
                    key={idx}
                    src={avatar}
                    alt="Opção Avatar"
                    onClick={() => setSelectedAvatar(avatar)}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: selectedAvatar === avatar ? '3px solid #6366F1' : '2px solid transparent',
                      backgroundColor: '#0B0F17'
                    }}
                  />
                ))}
              </div>

              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>Biografia:</h4>
              <textarea
                placeholder="Conte algo sobre você..."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  backgroundColor: '#0B0F17',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#FFF',
                  padding: '10px',
                  fontSize: '0.85rem',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '14px'
                }}
              />

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                style={{
                  width: '100%',
                  backgroundColor: '#6366F1',
                  color: '#FFF',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default ProfileProvisorioView;

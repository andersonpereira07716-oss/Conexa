import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProfileData {
  full_name: string;
  username: string;
  bio: string;
  avatar_url: string;
}

export const ProfileView: React.FC = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    username: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, bio, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || user.user_metadata?.full_name || '',
          username: data.username || user.email?.split('@')[0] || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates = {
        id: user.id,
        full_name: profile.full_name,
        username: profile.username,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      setIsEditing(false);
      alert('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      alert('Erro ao salvar perfil: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: '#6366F1', padding: '40px' }}>
        Carregando perfil...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Visualização do Perfil */}
      <div style={{ backgroundColor: '#131B2E', padding: '24px', borderRadius: '20px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #6366F1' }}
            />
          ) : (
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                backgroundColor: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#FFF',
              }}
            >
              {getInitials(profile.full_name)}
            </div>
          )}
        </div>

        <h2 style={{ color: '#FFF', margin: '0 0 4px 0', fontSize: '22px' }}>{profile.full_name || 'Seu Nome'}</h2>
        <div style={{ color: '#818CF8', fontSize: '14px', marginBottom: '12px' }}>@{profile.username || 'usuario'}</div>

        <p style={{ color: '#CBD5E1', fontSize: '14px', margin: '0 0 20px 0', minHeight: '20px', whiteSpace: 'pre-wrap' }}>
          {profile.bio || 'Nenhuma biografia adicionada ainda.'}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              backgroundColor: '#6366F1',
              color: '#FFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {isEditing ? 'Cancelar' : 'Editar Perfil'}
          </button>
          <button
            onClick={signOut}
            style={{
              backgroundColor: '#1E293B',
              color: '#EF4444',
              border: '1px solid #EF4444',
              padding: '10px 20px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Formulário de Edição */}
      {isEditing && (
        <div style={{ backgroundColor: '#131B2E', padding: '20px', borderRadius: '20px' }}>
          <h3 style={{ color: '#FFF', marginTop: 0, marginBottom: '16px' }}>Editar Informações</h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Nome Completo</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '10px',
                padding: '10px',
                color: '#FFF',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Nome de Usuário (@username)</label>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '10px',
                padding: '10px',
                color: '#FFF',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Biografia / Sobre você</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '10px',
                padding: '10px',
                color: '#FFF',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#94A3B8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>URL da Foto de Perfil (Avatar)</label>
            <input
              type="text"
              placeholder="https://exemplo.com/minha-foto.jpg"
              value={profile.avatar_url}
              onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '10px',
                padding: '10px',
                color: '#FFF',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              backgroundColor: '#10B981',
              color: '#FFF',
              border: 'none',
              padding: '12px',
              borderRadius: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileView;

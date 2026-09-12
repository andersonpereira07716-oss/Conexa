import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProfileEditViewProps {
  onBack: () => void;
}

export const ProfileEditView: React.FC<ProfileEditViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, bio, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim(),
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      alert('Perfil atualizado com sucesso!');
      onBack();
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      alert('Erro ao atualizar perfil: ' + (err.message || 'Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#6366F1', padding: '40px' }}>Carregando perfil...</div>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
      {/* Top Header */}
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
        <h2 style={{ color: '#FFF', margin: 0, fontSize: '20px' }}>Editar Perfil</h2>
      </div>

      <div style={{ backgroundColor: '#131B2E', padding: '24px', borderRadius: '16px' }}>
        {/* Foto de Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '90px', height: '90px', marginBottom: '12px' }}>
            {previewUrl || avatarUrl ? (
              <img
                src={previewUrl || avatarUrl || ''}
                alt="Avatar"
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover' }}
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
                {getInitials(fullName)}
              </div>
            )}
          </div>

          <label
            style={{
              backgroundColor: '#1E293B',
              color: '#818CF8',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            📷 Alterar foto
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#94A3B8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Nome Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#FFF',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#94A3B8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Nome de Usuário (@username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#FFF',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#94A3B8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Bio / Apresentação</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Escreva algo sobre você..."
              style={{
                width: '100%',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E293B',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#FFF',
                outline: 'none',
                minHeight: '80px',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving || !fullName.trim()}
            style={{
              backgroundColor: '#6366F1',
              color: '#FFF',
              border: 'none',
              padding: '12px',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '10px',
              opacity: saving || !fullName.trim() ? 0.5 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditView;

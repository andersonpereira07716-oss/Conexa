import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

export const ProfileView: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setFullName(user.user_metadata?.full_name || '');
      setBio(user.user_metadata?.bio || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage('');

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem para enviar.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload para o bucket avatars no Supabase
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Pegar URL pública da imagem
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      setAvatarUrl(publicUrl);
      setMessage('Foto carregada com sucesso! Clique em "Salvar Alterações".');
    } catch (error: any) {
      alert('Erro ao enviar imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        bio: bio,
        avatar_url: avatarUrl
      }
    });

    setSaving(false);
    if (!error) {
      setMessage('Perfil atualizado com sucesso!');
    } else {
      alert('Erro ao atualizar perfil: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px', color: '#F8FAFC', maxWidth: '600px', margin: '0 auto', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#6366F1', marginBottom: '20px' }}>Meu Perfil</h1>

      <form onSubmit={handleUpdateProfile} style={{ backgroundColor: '#161F30', border: '1px solid #1E293B', borderRadius: '16px', padding: '20px' }}>
        
        {/* Preview do Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '90px', height: '90px', marginBottom: '12px' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366F1' }}
              />
            ) : (
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                {fullName ? fullName.substring(0, 2).toUpperCase() : 'CX'}
              </div>
            )}
          </div>

          <label style={{
            backgroundColor: '#1E293B',
            color: '#38BDF8',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '1px solid #334155'
          }}>
            {uploading ? 'Carregando...' : '📷 Alterar Foto'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Campo Nome */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '6px' }}>Nome Completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome"
            style={{
              width: '100%',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px',
              color: '#FFF',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Campo Bio */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '6px' }}>Bio / Descrição</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre você..."
            rows={3}
            style={{
              width: '100%',
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px',
              color: '#FFF',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {message && (
          <p style={{ color: '#10B981', fontSize: '0.85rem', textAlign: 'center', marginBottom: '16px' }}>{message}</p>
        )}

        {/* Botão Salvar */}
        <button
          type="submit"
          disabled={saving || uploading}
          style={{
            width: '100%',
            backgroundColor: '#6366F1',
            color: '#FFF',
            border: 'none',
            padding: '12px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            opacity: saving || uploading ? 0.6 : 1,
            marginBottom: '12px'
          }}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>

        {/* Botão Sair */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            color: '#EF4444',
            border: '1px solid #EF4444',
            padding: '10px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Sair da Conta
        </button>

      </form>
    </div>
  );
};

export default ProfileView;

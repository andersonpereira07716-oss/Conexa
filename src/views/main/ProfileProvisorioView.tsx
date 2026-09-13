import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366F1, #818CF8)',
  'linear-gradient(135deg, #06B6D4, #22D3EE)',
  'linear-gradient(135deg, #F472B6, #FB7185)',
  'linear-gradient(135deg, #34D399, #6EE7B7)',
  'linear-gradient(135deg, #FBBF24, #FCD34D)',
];

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

interface Props {
  onOpenFollowList?: (mode: 'followers' | 'following') => void;
}

export const ProfileProvisorioView: React.FC<Props> = ({ onOpenFollowList }) => {
  const { user, signOut } = useAuth();
  const [postsCount, setPostsCount] = useState<number | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      const { count: posts } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setPostsCount(posts ?? 0);
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', user.id);
      setFollowersCount(followers ?? 0);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
      setFollowingCount(following ?? 0);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile(profileData);
      setEditName(profileData?.full_name || (user.user_metadata?.full_name as string) || '');
      setEditBio(profileData?.bio || '');
    };
    fetchAll();
  }, [user]);

  const startEditing = () => {
    setEditName(profile?.full_name || (user?.user_metadata?.full_name as string) || '');
    setEditBio(profile?.bio || '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditing(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url || null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (uploadError) { alert('Erro ao enviar foto: ' + uploadError.message); setSaving(false); return; }
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = publicUrlData.publicUrl + '?t=' + Date.now();
      }
      const { error: profileError } = await supabase.from('profiles').update({ full_name: editName.trim(), bio: editBio.trim(), avatar_url: avatarUrl }).eq('id', user.id);
      if (profileError) { alert('Erro ao salvar perfil: ' + profileError.message); setSaving(false); return; }
      await supabase.auth.updateUser({ data: { full_name: editName.trim() } });
      setProfile((prev: any) => ({ ...prev, full_name: editName.trim(), bio: editBio.trim(), avatar_url: avatarUrl }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const fullName = profile?.full_name || (user?.user_metadata?.full_name as string) || 'Usuário CONEXA';
  const handle = '@' + (profile?.username || user?.email?.split('@')[0] || 'usuario');
  const initial = fullName.trim().charAt(0).toUpperCase() || 'U';
  const bio = profile?.bio || '';
  const avatarUrl = profile?.avatar_url;

  if (editing) {
    return (
      <div style={{ padding: '20px', color: '#F8FAFC', paddingBottom: '90px', boxSizing: 'border-box', maxWidth: '560px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: 700 }}>Editar perfil</h2>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <label style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
            {avatarPreview || avatarUrl ? (
              <img src={avatarPreview || avatarUrl} alt="avatar" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: avatarColor(handle), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#0B0F17' }}>{initial}</div>
            )}
            <div style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6366F1', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', border: '2px solid #0B0F17' }}>📷</div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
          <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '8px' }}>Toque para trocar a foto</p>
        </div>
        <label style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Nome</label>
        <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', backgroundColor: '#161F30', border: '1px solid #232C3D', borderRadius: '12px', padding: '12px 14px', color: '#FFF', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '16px' }} />
        <label style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Bio</label>
        <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} maxLength={160} placeholder="Fale um pouco sobre você..." style={{ width: '100%', backgroundColor: '#161F30', border: '1px solid #232C3D', borderRadius: '12px', padding: '12px 14px', color: '#FFF', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit', marginBottom: '20px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setEditing(false)} disabled={saving} style={{ flex: 1, background: 'none', border: '1px solid #232C3D', color: '#94A3B8', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSaveProfile} disabled={saving} style={{ flex: 1, background: saving ? '#334155' : '#6366F1', border: 'none', color: '#FFF', borderRadius: '12px', padding: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: '#F8FAFC', paddingBottom: '90px', boxSizing: 'border-box', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px auto', display: 'block', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }} />
        ) : (
          <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: avatarColor(handle), margin: '0 auto 12px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#0B0F17', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>{initial}</div>
        )}
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 700 }}>{fullName}</h3>
        <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem' }}>{handle}</p>
        {bio && <p style={{ margin: '10px auto 0 auto', color: '#CBD5E1', fontSize: '0.85rem', maxWidth: '320px' }}>{bio}</p>}
        <button onClick={startEditing} style={{ marginTop: '14px', background: 'none', border: '1px solid #232C3D', color: '#94A3B8', borderRadius: '18px', padding: '7px 18px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Editar perfil</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: '#161F30', border: '1px solid #232C3D', padding: '18px', borderRadius: '16px', marginBottom: '24px', textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
        <div><strong style={{ display: 'block', fontSize: '1.15rem' }}>{postsCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Publicações</span></div>
        <div onClick={() => onOpenFollowList && onOpenFollowList('followers')} style={{ cursor: onOpenFollowList ? 'pointer' : 'default' }}><strong style={{ display: 'block', fontSize: '1.15rem' }}>{followersCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguidores</span></div>
        <div onClick={() => onOpenFollowList && onOpenFollowList('following')} style={{ cursor: onOpenFollowList ? 'pointer' : 'default' }}><strong style={{ display: 'block', fontSize: '1.15rem' }}>{followingCount ?? '...'}</strong><span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Seguindo</span></div>
      </div>

      <div style={{ backgroundColor: '#161F30', border: '1px solid #232C3D', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '15px 16px', borderBottom: '1px solid #232C3D', fontSize: '0.9rem', cursor: 'pointer' }}>⚙️ Configurações da Conta</div>
        <div style={{ padding: '15px 16px', borderBottom: '1px solid #232C3D', fontSize: '0.9rem', cursor: 'pointer' }}>🔒 Privacidade e Segurança</div>
        <div onClick={signOut} style={{ padding: '15px 16px', color: '#EF4444', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>🚪 Sair da Conta</div>
      </div>
    </div>
  );
};
export default ProfileProvisorioView;

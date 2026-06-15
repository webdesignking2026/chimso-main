import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProfileSetupScreen() {
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          setAvatarPreview(result);
          setAvatarUrl(result);
        };
        reader.readAsDataURL(file);
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        setAvatarUrl(data.publicUrl);
        setAvatarPreview(data.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Please enter your name.'); return; }
    if (!user) return;
    setError('');
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName.trim()
    ? displayName.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: { xs: 8, md: 12 },
        pb: 8,
        px: 4,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        {/* Header */}
        <Stack spacing={2} sx={{ mb: 8, textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: 'primary.main' }}>
            Step 2 of 2
          </Typography>
          <Typography variant="h2" sx={{ color: 'text.primary' }}>
            Set up your profile
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Let your community know who you are.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Avatar */}
        <Stack alignItems="center" sx={{ mb: 8 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={avatarPreview}
              sx={{ width: 88, height: 88, fontSize: '1.5rem' }}
            >
              {initials}
            </Avatar>
            <IconButton
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              size="small"
              sx={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                color: '#fff',
                border: '2px solid #fff',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              {uploading
                ? <CircularProgress size={14} thickness={3} sx={{ color: 'white' }} />
                : <AddAPhotoIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ mt: 3, color: 'text.secondary' }}>
            {uploading ? 'Uploading…' : 'Upload a photo'}
          </Typography>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        </Stack>

        {/* Fields */}
        <Stack spacing={4}>
          <TextField
            label="Display name"
            fullWidth
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Grace Okonkwo"
          />
          <Box>
            <TextField
              label="Bio"
              fullWidth
              multiline
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your community a little about yourself…"
              inputProps={{ maxLength: 200 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'right', mt: 1 }}>
              {bio.length}/200
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSave}
            disabled={saving || uploading || !displayName.trim()}
            sx={{ py: 3.5, mt: 2 }}
          >
            {saving
              ? <CircularProgress size={18} thickness={2.5} sx={{ color: 'white' }} />
              : 'Enter Chimso'}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

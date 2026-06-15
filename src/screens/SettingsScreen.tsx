import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShieldIcon from '@mui/icons-material/Shield';
import InfoIcon from '@mui/icons-material/Info';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      await refreshProfile();
    }

    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      username: username.trim() || null,
      bio: bio.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    if (!error) {
      await refreshProfile();
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Settings
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Profile Section */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Profile
            </Typography>

            {/* Avatar */}
            <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={profile?.avatar_url || undefined}
                  sx={{ width: 80, height: 80, fontSize: '2rem' }}
                >
                  {profile ? initials(profile.display_name) : '?'}
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <IconButton
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  {uploadingAvatar ? (
                    <CircularProgress size={16} thickness={2.5} sx={{ color: 'white' }} />
                  ) : (
                    <AddAPhotoIcon sx={{ fontSize: 16, color: 'white' }} />
                  )}
                </IconButton>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {profile?.display_name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  @{profile?.username || 'user'}
                </Typography>
              </Box>
            </Stack>

            {/* Fields */}
            <Stack spacing={3}>
              <TextField
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                inputProps={{ maxLength: 50 }}
              />
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                fullWidth
                InputProps={{
                  startAdornment: <Typography sx={{ color: 'text.secondary' }}>@</Typography>,
                }}
                inputProps={{ maxLength: 30 }}
                helperText="Only lowercase letters, numbers, and underscores"
              />
              <TextField
                label="Bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                fullWidth
                multiline
                rows={3}
                inputProps={{ maxLength: 200 }}
                helperText={`${bio.length}/200`}
              />

              <Button
                variant="contained"
                size="large"
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                sx={{ py: 3.5 }}
              >
                {saving ? <CircularProgress size={18} thickness={2.5} sx={{ color: 'white' }} /> : 'Save Changes'}
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Notifications */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <NotificationsIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notifications
              </Typography>
            </Stack>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />}
                label="Email notifications"
              />
              <FormControlLabel
                control={<Switch checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />}
                label="Push notifications"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Privacy */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <ShieldIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Privacy & Security
              </Typography>
            </Stack>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Private profile"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Show activity status"
              />
            </Stack>
          </Box>

          <Divider />

          {/* About */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <InfoIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                About
              </Typography>
            </Stack>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1">Version</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>2.0.0</Typography>
              </Box>
              <Button
                variant="text"
                sx={{ justifyContent: 'flex-start', p: 0 }}
              >
                <Typography variant="body1">Terms of Service</Typography>
              </Button>
              <Button
                variant="text"
                sx={{ justifyContent: 'flex-start', p: 0 }}
              >
                <Typography variant="body1">Privacy Policy</Typography>
              </Button>
              <Button
                variant="text"
                sx={{ justifyContent: 'flex-start', p: 0 }}
              >
                <Typography variant="body1">Help Center</Typography>
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Logout */}
          <Button
            variant="outlined"
            color="error"
            size="large"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ py: 3.5 }}
          >
            Sign Out
          </Button>
        </Stack>
      </Container>
    </MainLayout>
  );
}

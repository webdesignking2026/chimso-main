import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created! Welcome to Chimso.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 6,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        {/* Logo */}
        <Stack alignItems="center" spacing={4} sx={{ mb: 8 }}>
          <Box
            component="img"
            src="/chimsologo.png"
            alt="Chimso"
            sx={{ width: 56, height: 56, borderRadius: '14px' }}
          />
          <Stack spacing={1} alignItems="center">
            <Typography variant="h2" sx={{ color: 'text.primary' }}>
              {mode === 'login' ? 'Welcome back' : 'Join Chimso'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              {mode === 'login'
                ? 'Sign in to your account to continue'
                : 'A community built on faith, purpose & connection'}
            </Typography>
          </Stack>
        </Stack>

        {/* Feedback */}
        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '12px', border: '1px solid', borderColor: 'error.light' }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 4, borderRadius: '12px' }}>
            {success}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="Email address"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputProps={{ style: { fontSize: '0.9375rem' } }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              helperText={mode === 'signup' ? 'Minimum 6 characters' : undefined}
              inputProps={{ style: { fontSize: '0.9375rem' } }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 1, py: 3.5 }}
            >
              {loading ? (
                <CircularProgress size={18} thickness={2.5} sx={{ color: 'white' }} />
              ) : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 6 }} />

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Box
            component="span"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </Box>
        </Typography>
      </Container>
    </Box>
  );
}

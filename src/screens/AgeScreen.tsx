import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Fade from '@mui/material/Fade';
import LockIcon from '@mui/icons-material/Lock';
import { supabase } from '../lib/supabase';

type Props = {
  onDone: () => void;
};

const AGE_STORAGE_KEY = 'chimso-age-collected';
const AGE_VALUE_KEY = 'chimso-user-age';

export function hasAgeBeenCollected(): boolean {
  return localStorage.getItem(AGE_STORAGE_KEY) === 'true';
}

export async function persistAgeIfNeeded(): Promise<void> {
  const ageStr = localStorage.getItem(AGE_VALUE_KEY);
  const collected = localStorage.getItem(AGE_STORAGE_KEY) === 'true';
  if (!ageStr || !collected) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('age')
    .eq('id', user.id)
    .maybeSingle();

  if (profile && profile.age === null) {
    await supabase
      .from('profiles')
      .update({ age: parseInt(ageStr, 10), updated_at: new Date().toISOString() })
      .eq('id', user.id);
  }
}

export default function AgeScreen({ onDone }: Props) {
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = () => {
    const numAge = parseInt(age, 10);

    if (!age.trim() || isNaN(numAge)) {
      setError('Please enter your age.');
      return;
    }
    if (numAge < 13 || numAge > 120) {
      setError('Please enter an age between 13 and 120.');
      return;
    }

    localStorage.setItem(AGE_VALUE_KEY, String(numAge));
    localStorage.setItem(AGE_STORAGE_KEY, 'true');
    onDone();
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
      <Fade in={show} timeout={{ enter: 700 }}>
        <Container maxWidth="xs" disableGutters>
          <Stack spacing={6} alignItems="center" sx={{ textAlign: 'center' }}>
            {/* Title */}
            <Stack spacing={2} alignItems="center">
              <Typography variant="h2" sx={{ color: 'text.primary' }}>
                How old are you?
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                We use this information only to better understand our community and improve your experience.
              </Typography>
            </Stack>

            {/* Age input */}
            <Box sx={{ width: '100%', maxWidth: 180 }}>
              <TextField
                fullWidth
                type="number"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                placeholder="—"
                inputProps={{
                  min: 13,
                  max: 120,
                  style: {
                    fontSize: '2rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    padding: '16px 8px',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'grey.50',
                  },
                }}
              />
            </Box>

            {/* Privacy notice */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'grey.50',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <LockIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Your age is private. It will never be displayed publicly and will not be shared with other users.
              </Typography>
            </Stack>

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ width: '100%', borderRadius: '12px' }}>
                {error}
              </Alert>
            )}

            {/* Continue */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSubmit}
              disabled={!age.trim()}
              sx={{ py: 3.5 }}
            >
              Continue
            </Button>
          </Stack>
        </Container>
      </Fade>
    </Box>
  );
}

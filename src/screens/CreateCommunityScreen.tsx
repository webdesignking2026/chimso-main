import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateCommunityScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [rules, setRules] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddRule = () => {
    if (rules.length < 10) {
      setRules([...rules, '']);
    }
  };

  const handleRuleChange = (idx: number, value: string) => {
    const newRules = [...rules];
    newRules[idx] = value;
    setRules(newRules);
  };

  const handleRemoveRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim()) {
      setError('Community name is required');
      return;
    }

    setLoading(true);
    setError('');

    const slug = generateSlug(name);
    const validRules = rules.filter((r) => r.trim());

    const { error: insertError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        slug,
        description: description.trim(),
        is_private: isPrivate,
        rules: validRules,
        creator_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    navigate(`/communities/${slug}`);
  };

  return (
    <MainLayout>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Create Community
            </Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Icon */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <Typography variant="h2" sx={{ color: 'text.secondary' }}>
                  {name[0]?.toUpperCase() || '+'}
                </Typography>
              </Box>
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <AddAPhotoIcon sx={{ fontSize: 16, color: 'white' }} />
              </IconButton>
            </Box>
          </Box>

          {/* Name */}
          <TextField
            label="Community name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            inputProps={{ maxLength: 50 }}
            helperText={`${name.length}/50`}
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            inputProps={{ maxLength: 200 }}
            helperText={`${description.length}/200`}
          />

          {/* Privacy */}
          <Box sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Switch checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              }
              label={
                <Box>
                  <Typography variant="subtitle1">Private community</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Only invited members can join and see posts
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* Rules */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Community Rules (optional)
            </Typography>
            <Stack spacing={2}>
              {rules.map((rule, idx) => (
                <Stack key={idx} direction="row" spacing={2}>
                  <TextField
                    value={rule}
                    onChange={(e) => handleRuleChange(idx, e.target.value)}
                    fullWidth
                    size="small"
                    placeholder={`Rule ${idx + 1}`}
                    inputProps={{ maxLength: 100 }}
                  />
                  {rules.length > 1 && (
                    <Button size="small" color="error" onClick={() => handleRemoveRule(idx)}>
                      Remove
                    </Button>
                  )}
                </Stack>
              ))}
              {rules.length < 10 && (
                <Button size="small" onClick={handleAddRule}>
                  Add rule
                </Button>
              )}
            </Stack>
          </Box>

          {/* Error */}
          {error && (
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          )}

          {/* Submit */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            sx={{ py: 3.5 }}
          >
            {loading ? <CircularProgress size={18} thickness={2.5} sx={{ color: 'white' }} /> : 'Create Community'}
          </Button>
        </Stack>
      </Container>
    </MainLayout>
  );
}

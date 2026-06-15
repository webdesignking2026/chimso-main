import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import GroupsIcon from '@mui/icons-material/Groups';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import type { SvgIconComponent } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import type { Niche } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const NICHE_ICONS: Record<string, SvgIconComponent> = {
  community: GroupsIcon,
  entrepreneurship: RocketLaunchIcon,
  faith: AutoStoriesIcon,
  family: FamilyRestroomIcon,
  prayer: SelfImprovementIcon,
  tech: LaptopMacIcon,
  wellness: FitnessCenterIcon,
  worship: MusicNoteIcon,
};

function getNicheIcon(name: string): SvgIconComponent {
  const key = name.toLowerCase();
  for (const [k, Icon] of Object.entries(NICHE_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return GroupsIcon;
}

export default function NicheSelectScreen({ onComplete }: { onComplete?: () => void }) {
  const { user, refreshProfile } = useAuth();
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('niches').select('*').order('name').then(({ data }) => {
      setNiches(data ?? []);
      setLoading(false);
    });
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleContinue = async () => {
    if (selected.length === 0) { setError('Select at least one community to continue.'); return; }
    if (!user) return;
    setError('');
    setSaving(true);
    try {
      await supabase.from('profile_niches').delete().eq('profile_id', user.id);
      const rows = selected.map((niche_id) => ({ profile_id: user.id, niche_id }));
      const { error } = await supabase.from('profile_niches').insert(rows);
      if (error) throw error;
      await refreshProfile();
      onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save your choices.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LinearProgress />;

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
      <Container maxWidth="sm" disableGutters>
        {/* Header */}
        <Stack spacing={2} sx={{ mb: 8, textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: 'primary.main' }}>
            Step 1 of 2
          </Typography>
          <Typography variant="h2" sx={{ color: 'text.primary' }}>
            Choose your communities
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Pick up to 3 spaces that resonate with you. Your feed will be built around them.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Interest list — X onboarding style */}
        <Box
          sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            mb: 6,
          }}
        >
          {niches.map((niche, idx) => {
            const isSelected = selected.includes(niche.id);
            const Icon = getNicheIcon(niche.name);
            return (
              <Box key={niche.id}>
                <Box
                  data-testid="niche-card"
                  onClick={() => toggle(niche.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 4,
                    py: 3.5,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'action.selected' : 'background.default',
                    borderLeft: '3px solid',
                    borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                    userSelect: 'none',
                    transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-left-color 150ms',
                    '&:hover': {
                      backgroundColor: isSelected ? 'action.selected' : 'action.hover',
                    },
                  }}
                >
                  {/* Left: name + description */}
                  <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ color: isSelected ? 'primary.main' : 'text.primary', fontWeight: isSelected ? 600 : 500 }}>
                      {niche.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {niche.description}
                    </Typography>
                  </Stack>

                  {/* Right: icon */}
                  <Box
                    sx={{
                      ml: 4,
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      bgcolor: isSelected ? 'primary.main' : 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <Icon sx={{ fontSize: 18, color: isSelected ? '#fff' : 'text.secondary' }} />
                  </Box>
                </Box>
                {idx < niches.length - 1 && <Divider />}
              </Box>
            );
          })}
        </Box>

        {/* Counter + CTA */}
        <Stack spacing={3} alignItems="center">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {selected.length} of 3 selected
          </Typography>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleContinue}
            disabled={saving || selected.length === 0}
            sx={{ py: 3.5 }}
          >
            {saving ? <CircularProgress size={18} thickness={2.5} sx={{ color: 'white' }} /> : 'Continue'}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

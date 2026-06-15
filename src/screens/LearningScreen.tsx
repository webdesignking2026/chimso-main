import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import ArticleIcon from '@mui/icons-material/Article';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { supabase } from '../lib/supabase';
import type { LearningTrack, Profile } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

type TrackWithProgress = LearningTrack & {
  profiles?: Profile;
  progress?: number;
  lessons_count?: number;
};

export default function LearningScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tracks, setTracks] = useState<TrackWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'courses' | 'guides' | 'resources'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTracks();
  }, [user, filter]);

  const loadTracks = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('learning_tracks')
      .select('*, profiles(display_name, avatar_url)')
      .eq('is_published', true);

    if (filter !== 'all') {
      const typeMap: Record<string, string> = {
        courses: 'course',
        guides: 'guide',
        resources: 'resource',
      };
      query = query.eq('track_type', typeMap[filter] || filter);
    }

    query = query.order('created_at', { ascending: false });

    const { data } = await query.limit(50);

    // Get lesson counts
    const enriched = await Promise.all(
      (data ?? []).map(async (track) => {
        const { count } = await supabase
          .from('learning_lessons')
          .select('*', { count: 'exact', head: true })
          .eq('track_id', track.id);

        return { ...track, lessons_count: count || 0 };
      })
    );

    setTracks(enriched);
    setLoading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return <SchoolIcon sx={{ fontSize: 18 }} />;
      case 'guide': return <MenuBookIcon sx={{ fontSize: 18 }} />;
      case 'article': return <ArticleIcon sx={{ fontSize: 18 }} />;
      default: return <LightbulbIcon sx={{ fontSize: 18 }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const filtered = tracks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Learn
          </Typography>
        </Container>

        {/* Tabs */}
        <Container maxWidth="sm" sx={{ pb: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Chip
              label="All"
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Courses"
              onClick={() => setFilter('courses')}
              variant={filter === 'courses' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Guides"
              onClick={() => setFilter('guides')}
              variant={filter === 'guides' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Resources"
              onClick={() => setFilter('resources')}
              variant={filter === 'resources' ? 'filled' : 'outlined'}
            />
          </Stack>
        </Container>

        {/* Search */}
        <Container maxWidth="sm" sx={{ pb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search learning content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '9999px',
                bgcolor: 'grey.50',
                '& fieldset': { borderColor: 'divider' },
              },
            }}
          />
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={20} thickness={2.5} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              No content found
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {filter !== 'all' ? 'Try a different category.' : 'Check back later for new content.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {filtered.map((track, idx) => (
              <Box key={track.id}>
                <Box
                  onClick={() => navigate(`/learn/${track.id}`)}
                  sx={{
                    display: 'flex',
                    gap: 3,
                    py: 3,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    mx: -3,
                    px: 3,
                  }}
                >
                  {/* Cover */}
                  {track.cover_url ? (
                    <Box
                      component="img"
                      src={track.cover_url}
                      alt={track.title}
                      sx={{ width: 100, height: 100, borderRadius: 2, objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getTypeIcon(track.track_type)}
                    </Box>
                  )}

                  {/* Content */}
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip
                        size="small"
                        icon={getTypeIcon(track.track_type)}
                        label={getTypeLabel(track.track_type)}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={track.difficulty}
                        color={getDifficultyColor(track.difficulty) as 'success' | 'warning' | 'error' | 'default'}
                      />
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {track.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {track.description || 'No description'}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {track.estimated_minutes}m
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {track.lessons_count} lessons
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
                {idx < filtered.length - 1 && <Divider />}
              </Box>
            ))}
          </Stack>
        )}
      </Container>
    </MainLayout>
  );
}

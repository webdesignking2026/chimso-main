import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '../lib/supabase';
import type { Event } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

type EventWithDetails = Event & {
  attendee_count?: number;
  user_status?: string;
};

export default function EventsScreen() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    setLoading(true);
    const now = new Date().toISOString();

    let query = supabase
      .from('events')
      .select('*')
      .eq('is_published', true);

    if (filter === 'upcoming') {
      query = query.gte('starts_at', now).order('starts_at', { ascending: true });
    } else {
      query = query.lt('starts_at', now).order('starts_at', { ascending: false });
    }

    const { data } = await query.limit(50);
    setEvents(data ?? []);
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'online': return 'Online';
      case 'physical': return 'In Person';
      case 'hybrid': return 'Hybrid';
      default: return type;
    }
  };

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Events
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              sx={{ px: 3 }}
            >
              Create
            </Button>
          </Stack>
        </Container>

        {/* Tabs */}
        <Container maxWidth="sm" sx={{ pb: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Chip
              label="Upcoming"
              onClick={() => setFilter('upcoming')}
              variant={filter === 'upcoming' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Past"
              onClick={() => setFilter('past')}
              variant={filter === 'past' ? 'filled' : 'outlined'}
            />
          </Stack>
        </Container>

        {/* Search */}
        <Container maxWidth="sm" sx={{ pb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search events..."
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
              No events{filter === 'upcoming' ? ' scheduled' : ''}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {filter === 'upcoming'
                ? 'Check back later for upcoming events.'
                : 'No past events to show.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {filtered.map((event, idx) => (
              <Box key={event.id}>
                <Box
                  onClick={() => navigate(`/events/${event.id}`)}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'border-color 150ms',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  {/* Cover Image */}
                  {event.image_url ? (
                    <Box
                      component="img"
                      src={event.image_url}
                      alt={event.title}
                      sx={{ width: '100%', height: 140, objectFit: 'cover' }}
                    />
                  ) : (
                    <Box sx={{ width: '100%', height: 140, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CalendarTodayIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Box>
                  )}

                  {/* Content */}
                  <Box sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip size="small" label={getEventTypeLabel(event.event_type)} />
                      {event.community_id && (
                        <GroupsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      )}
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                      {event.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {event.description}
                    </Typography>

                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {formatDate(event.starts_at)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {formatTime(event.starts_at)}
                        </Typography>
                      </Stack>
                      {event.location && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {event.location}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                </Box>
                {idx < filtered.length - 1 && <Divider sx={{ my: 1 }} />}
              </Box>
            ))}
          </Stack>
        )}
      </Container>
    </MainLayout>
  );
}

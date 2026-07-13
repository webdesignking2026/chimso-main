import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { supabase } from '../lib/supabase';
import type { Event, Profile } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { DetailSkeleton } from '../components/Skeletons';
import { useAuth } from '../context/AuthContext';

type RSVPStatus = 'going' | 'interested' | 'not_going';

export default function EventDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [attendees, setAttendees] = useState<Profile[]>([]);
  const [userStatus, setUserStatus] = useState<RSVPStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id || !user) return;

    // Step 1: fetch the event (with its creator profile) first.
    const { data: eventData } = await supabase
      .from('events')
      .select('*, profiles(display_name, avatar_url, username)')
      .eq('id', id)
      .maybeSingle();

    if (!eventData) {
      setEvent(null);
      setCreator(null);
      setLoading(false);
      return;
    }

    setEvent(eventData as Event);
    setCreator(eventData.profiles as Profile);

    // Step 2: fetch attendees + user status in parallel (previously a 3-step waterfall).
    const [attendeesRes, statusRes] = await Promise.all([
      supabase
        .from('event_attendees')
        .select('event_id, profile_id, status, profiles(display_name, avatar_url)')
        .eq('event_id', id)
        .limit(50),
      supabase
        .from('event_attendees')
        .select('status')
        .eq('event_id', id)
        .eq('profile_id', user.id)
        .maybeSingle(),
    ]);

    setAttendees((attendeesRes.data ?? []).map((a) => a.profiles as unknown as Profile));
    setUserStatus((statusRes.data?.status as RSVPStatus) || null);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleRSVP = useCallback(
    async (status: 'going' | 'interested') => {
      if (!event || !user) return;
      setUpdating(true);

      // Optimistic UI: immediately reflect the new status.
      const prevStatus = userStatus;
      setUserStatus(status);

      try {
        if (prevStatus) {
          await supabase.from('event_attendees').delete().match({
            event_id: event.id,
            profile_id: user.id,
          });
        }

        const { error } = await supabase.from('event_attendees').insert({
          event_id: event.id,
          profile_id: user.id,
          status,
        });

        if (error) throw error;

        // Reconcile with server state (keeps attendee list + status in sync).
        await loadEvent();
      } catch {
        // Roll back on failure.
        setUserStatus(prevStatus);
      } finally {
        setUpdating(false);
      }
    },
    [event, user, userStatus, loadEvent],
  );

  const handleRemoveRSVP = useCallback(async () => {
    if (!event || !user) return;
    setUpdating(true);

    // Optimistic UI: clear status immediately.
    const prevStatus = userStatus;
    setUserStatus(null);

    try {
      const { error } = await supabase.from('event_attendees').delete().match({
        event_id: event.id,
        profile_id: user.id,
      });

      if (error) throw error;

      // Reconcile with server state.
      await loadEvent();
    } catch {
      // Roll back on failure.
      setUserStatus(prevStatus);
    } finally {
      setUpdating(false);
    }
  }, [event, user, userStatus, loadEvent]);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, []);

  const getEventTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'online': return 'Online Event';
      case 'physical': return 'In Person';
      case 'hybrid': return 'Hybrid Event';
      default: return type;
    }
  }, []);

  const initials = useCallback(
    (name: string) =>
      name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    [],
  );

  const goingCount = useMemo(() => attendees.length, [attendees]);

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
          <Container maxWidth="sm">
            <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
              <IconButton disabled>
                <ArrowBackIcon />
              </IconButton>
              <Skeleton variant="text" width={80} height={28} />
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="sm">
          <DetailSkeleton />
        </Container>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h3">Event not found</Typography>
          <Button sx={{ mt: 4 }} onClick={() => navigate('/events')}>
            Back to events
          </Button>
        </Container>
      </MainLayout>
    );
  }

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
              Event
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Cover Image */}
      {event.image_url ? (
        <Box
          component="img"
          src={event.image_url}
          alt={event.title}
          sx={{ width: '100%', height: 200, objectFit: 'cover' }}
        />
      ) : (
        <Box sx={{ width: '100%', height: 200, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarTodayIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        </Box>
      )}

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Title & Type */}
          <Box>
            <Chip size="small" label={getEventTypeLabel(event.event_type)} sx={{ mb: 2 }} />
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {event.title}
            </Typography>
          </Box>

          {/* Date, Time, Location */}
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <CalendarTodayIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Box>
                <Typography variant="body1">{formatDate(event.starts_at)}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {formatTime(event.starts_at)}
                </Typography>
              </Box>
            </Stack>
            {event.location && (
              <Stack direction="row" spacing={2}>
                <LocationOnIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="body1">{event.location}</Typography>
              </Stack>
            )}
          </Stack>

          {/* Description */}
          <Divider />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              About this event
            </Typography>
            <Typography variant="body1">{event.description || 'No description provided.'}</Typography>
          </Box>

          {/* Host */}
          <Divider />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Hosted by
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={creator?.avatar_url || undefined}>
                {creator ? initials(creator.display_name) : '?'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {creator?.display_name || 'Unknown'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  @{creator?.username || 'user'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Attendees */}
          <Divider />
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Attendees ({goingCount})
              </Typography>
            </Stack>
            {attendees.length > 0 ? (
              <Stack direction="row" spacing={-1}>
                {attendees.slice(0, 10).map((a, idx) => (
                  <Avatar
                    key={idx}
                    src={a.avatar_url || undefined}
                    sx={{
                      width: 36,
                      height: 36,
                      border: '2px solid',
                      borderColor: 'background.default',
                      ml: idx > 0 ? -1 : 0,
                    }}
                  >
                    {initials(a.display_name)}
                  </Avatar>
                ))}
                {goingCount > 10 && (
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'grey.200', ml: -1, fontSize: '0.75rem', color: 'text.secondary' }}>
                    +{goingCount - 10}
                  </Avatar>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No one has RSVP'd yet. Be the first!
              </Typography>
            )}
          </Box>

          {/* RSVP Actions */}
          <Divider />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Your RSVP
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant={userStatus === 'going' ? 'contained' : 'outlined'}
                onClick={() => userStatus === 'going' ? handleRemoveRSVP() : handleRSVP('going')}
                disabled={updating}
                sx={{ flex: 1 }}
              >
                {updating ? <CircularProgress size={18} thickness={2.5} /> : userStatus === 'going' ? 'Going' : 'Going'}
              </Button>
              <Button
                variant={userStatus === 'interested' ? 'contained' : 'outlined'}
                color="secondary"
                onClick={() => userStatus === 'interested' ? handleRemoveRSVP() : handleRSVP('interested')}
                disabled={updating}
                sx={{ flex: 1 }}
              >
                {updating ? <CircularProgress size={18} thickness={2.5} /> : userStatus === 'interested' ? 'Interested' : 'Interested'}
              </Button>
            </Stack>
          </Box>

          {/* Share */}
          <Stack direction="row" spacing={2}>
            <IconButton>
              <ShareIcon />
            </IconButton>
            <IconButton>
              <BookmarkBorderIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Container>
    </MainLayout>
  );
}

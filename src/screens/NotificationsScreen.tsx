import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

const notificationIcons: Record<string, React.ReactElement> = {
  like: <FavoriteIcon sx={{ fontSize: 16, color: '#EF4444' }} />,
  follow: <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
  comment: <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
  mention: <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
  community_invite: <GroupsIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
  event_reminder: <EventIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
  announcement: <GroupsIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles(display_name, avatar_url)')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    setNotifications(data ?? []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', user.id)
      .is('read_at', null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Typography
                variant="body2"
                sx={{ color: 'primary.main', cursor: 'pointer' }}
                onClick={markAllRead}
              >
                Mark all read
              </Typography>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={20} thickness={2.5} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No notifications yet
            </Typography>
          </Box>
        ) : (
          notifications.map((notification, idx) => {
            const isRead = !!notification.read_at;
            const actor = notification.profiles as { display_name: string; avatar_url: string } | undefined;
            return (
              <Box key={notification.id}>
                <Box
                  onClick={() => markAsRead(notification.id)}
                  sx={{
                    py: 3,
                    bgcolor: isRead ? 'transparent' : 'action.selected',
                    mx: -3,
                    px: 3,
                    cursor: 'pointer',
                    transition: 'background-color 150ms',
                    '&:hover': { bgcolor: isRead ? 'action.hover' : 'action.selected' },
                  }}
                >
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        src={actor?.avatar_url || undefined}
                        sx={{ width: 44, height: 44 }}
                      >
                        {actor ? initials(actor.display_name) : '?'}
                      </Avatar>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: 'background.default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {notificationIcons[notification.type] || <PersonIcon sx={{ fontSize: 14 }} />}
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1">
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {notification.title}
                        </Box>
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        {notification.body}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
                        {formatTime(notification.created_at)}
                      </Typography>
                    </Box>
                    {!isRead && (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 2 }} />
                    )}
                  </Stack>
                </Box>
                {idx < notifications.length - 1 && <Divider />}
              </Box>
            );
          })
        )}
      </Container>
    </MainLayout>
  );
}

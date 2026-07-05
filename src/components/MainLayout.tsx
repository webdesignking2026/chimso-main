import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type BottomTab = 'home' | 'search' | 'communities' | 'notifications' | 'profile';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile path: prefer username, fall back to user ID so the profile page
  // can always look up the current user even before username is set.
  const profilePath = `/${profile?.username || user?.id || 'me'}`;

  useEffect(() => {
    if (!user) return;

    // Load initial unread count
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .is('read_at', null)
      .then(({ count }) => setUnreadCount(count ?? 0));

    // Subscribe to notification changes for live badge updates
    const channel = supabase
      .channel(`notifications-badge-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            // Re-fetch accurate count when notifications are read/deleted
            supabase
              .from('notifications')
              .select('id', { count: 'exact', head: true })
              .eq('profile_id', user.id)
              .is('read_at', null)
              .then(({ count }) => setUnreadCount(count ?? 0));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const getActiveTab = (): BottomTab => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/search') return 'search';
    if (location.pathname.startsWith('/communities')) return 'communities';
    if (location.pathname === '/notifications') return 'notifications';
    if (profile?.username && location.pathname === `/${profile.username}`) return 'profile';
    if (user?.id && location.pathname === `/${user.id}`) return 'profile';
    if (location.pathname === '/settings') return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  const tabs: { key: BottomTab; path: string; OutIcon: typeof HomeOutlinedIcon; FilledIcon: typeof HomeIcon }[] = [
    { key: 'home', path: '/', OutIcon: HomeOutlinedIcon, FilledIcon: HomeIcon },
    { key: 'search', path: '/search', OutIcon: SearchIcon, FilledIcon: SearchIcon },
    { key: 'communities', path: '/communities', OutIcon: GroupsOutlinedIcon, FilledIcon: GroupsIcon },
    { key: 'notifications', path: '/notifications', OutIcon: NotificationsOutlinedIcon, FilledIcon: NotificationsIcon },
    { key: 'profile', path: profilePath, OutIcon: PersonOutlineIcon, FilledIcon: PersonIcon },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main content */}
      <Box sx={{ flex: 1, pb: '72px' }}>
        {children}
      </Box>

      {/* Floating compose button */}
      <Box
        onClick={() => navigate('/')}
        sx={{
          position: 'fixed',
          bottom: 84,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '9999px',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
          boxShadow: '0 2px 12px rgba(15, 61, 145, 0.25)',
          transition: 'background-color 150ms',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <AddIcon sx={{ color: '#fff', fontSize: 24 }} />
      </Box>

      {/* Bottom navigation */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          bgcolor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid',
          borderColor: 'divider',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Stack direction="row" justifyContent="space-around" alignItems="center" sx={{ height: 64 }}>
            {tabs.map(({ key, path, OutIcon, FilledIcon }) => {
              const isActive = activeTab === key;
              const icon = isActive
                ? <FilledIcon sx={{ fontSize: 24 }} />
                : <OutIcon sx={{ fontSize: 24 }} />;
              return (
                <Box
                  key={key}
                  onClick={() => navigate(path)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flex: 1,
                    height: '100%',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    transition: 'color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {key === 'notifications' && unreadCount > 0 ? (
                    <Badge
                      badgeContent={unreadCount > 99 ? '99+' : unreadCount}
                      color="error"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem', minWidth: 16, height: 16, px: 0.5 } }}
                    >
                      {icon}
                    </Badge>
                  ) : icon}
                </Box>
              );
            })}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

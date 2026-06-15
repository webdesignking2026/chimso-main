import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './screens/AuthScreen';
import NicheSelectScreen from './screens/NicheSelectScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import FeedScreen from './screens/FeedScreen';
import SearchScreen from './screens/SearchScreen';
import CommunitiesScreen from './screens/CommunitiesScreen';
import CommunityDetailScreen from './screens/CommunityDetailScreen';
import CreateCommunityScreen from './screens/CreateCommunityScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import MessagesScreen from './screens/MessagesScreen';
import ConversationScreen from './screens/ConversationScreen';
import ProfileScreen from './screens/ProfileScreen';
import EventsScreen from './screens/EventsScreen';
import EventDetailScreen from './screens/EventDetailScreen';
import LearningScreen from './screens/LearningScreen';
import LearningTrackScreen from './screens/LearningTrackScreen';
import SettingsScreen from './screens/SettingsScreen';
import { supabase } from './lib/supabase';

function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={20} thickness={2.5} color="primary" />
    </Box>
  );
}

function OnboardingCheck({ userId }: { userId: string }) {
  const [step, setStep] = useState<'niches' | 'profile' | null>(null);

  useEffect(() => {
    supabase
      .from('profile_niches')
      .select('niche_id', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .then(({ count }) => {
        setStep((count ?? 0) > 0 ? 'profile' : 'niches');
      });
  }, [userId]);

  if (!step) return <LoadingScreen />;
  return step === 'niches'
    ? <NicheSelectScreen onComplete={() => setStep('profile')} />
    : <ProfileSetupScreen />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;
  if (!profile?.onboarding_complete) return <OnboardingCheck userId={user.id} />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><FeedScreen /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchScreen /></ProtectedRoute>} />
      <Route path="/communities" element={<ProtectedRoute><CommunitiesScreen /></ProtectedRoute>} />
      <Route path="/communities/create" element={<ProtectedRoute><CreateCommunityScreen /></ProtectedRoute>} />
      <Route path="/communities/:slug" element={<ProtectedRoute><CommunityDetailScreen /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesScreen /></ProtectedRoute>} />
      <Route path="/messages/:id" element={<ProtectedRoute><ConversationScreen /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><EventsScreen /></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute><EventDetailScreen /></ProtectedRoute>} />
      <Route path="/learn" element={<ProtectedRoute><LearningScreen /></ProtectedRoute>} />
      <Route path="/learn/:id" element={<ProtectedRoute><LearningTrackScreen /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
      <Route path="/:username" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

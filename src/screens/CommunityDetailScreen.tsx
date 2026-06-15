import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import SettingsIcon from '@mui/icons-material/Settings';
import { supabase } from '../lib/supabase';
import type { Post, Community, Profile } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

type PostWithProfile = Post & {
  profiles: Profile;
};

export default function CommunityDetailScreen() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCommunity();
  }, [slug, user]);

  const loadCommunity = async () => {
    if (!slug || !user) return;
    setLoading(true);

    // Get community
    const { data: communityData } = await supabase
      .from('communities')
      .select('*, profiles(display_name, avatar_url)')
      .eq('slug', slug)
      .maybeSingle();

    if (!communityData) {
      setCommunity(null);
      setLoading(false);
      return;
    }

    setCommunity(communityData as Community);

    // Check membership
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityData.id)
      .eq('profile_id', user.id)
      .maybeSingle();

    setIsMember(!!membership);
    setUserRole(membership?.role || null);

    // Get posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(name)')
      .eq('community_id', communityData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setPosts((postsData ?? []) as PostWithProfile[]);

    setLoading(false);
  };

  const handleJoinLeave = async () => {
    if (!community || !user) return;
    setJoining(true);

    if (isMember) {
      await supabase.from('community_members').delete().match({
        community_id: community.id,
        profile_id: user.id,
      });
    } else {
      await supabase.from('community_members').insert({
        community_id: community.id,
        profile_id: user.id,
        role: 'member',
      });
    }

    await loadCommunity();
    setJoining(false);
  };

  const toggleLike = (postId: string) => {
    setLiked((prev) => {
      const n = new Set(prev);
      n.has(postId) ? n.delete(postId) : n.add(postId);
      return n;
    });
  };

  const toggleBookmark = (postId: string) => {
    setBookmarked((prev) => {
      const n = new Set(prev);
      n.has(postId) ? n.delete(postId) : n.add(postId);
      return n;
    });
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

  if (loading) {
    return (
      <MainLayout>
        <LinearProgress />
      </MainLayout>
    );
  }

  if (!community) {
    return (
      <MainLayout>
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h3">Community not found</Typography>
          <Button sx={{ mt: 4 }} onClick={() => navigate('/communities')}>
            Back to communities
          </Button>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
              {community.name}
            </Typography>
            {(userRole === 'admin' || userRole === 'moderator') && (
              <IconButton onClick={() => navigate(`/communities/${slug}/settings`)}>
                <SettingsIcon />
              </IconButton>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Community Info */}
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center' }}>
          <Avatar
            src={community.icon_url || undefined}
            sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}
          >
            {community.name[0]}
          </Avatar>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            {community.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {community.description}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {community.member_count} members
          </Typography>
          <Button
            variant={isMember ? 'outlined' : 'contained'}
            size="large"
            onClick={handleJoinLeave}
            disabled={joining}
            sx={{ px: 6 }}
          >
            {joining ? <CircularProgress size={18} thickness={2.5} /> : isMember ? 'Joined' : 'Join'}
          </Button>
        </Stack>

        {/* Rules */}
        {community.rules.length > 0 && (
          <Box sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Community Rules
            </Typography>
            <Stack spacing={1}>
              {community.rules.map((rule, idx) => (
                <Typography key={idx} variant="body2" sx={{ color: 'text.secondary' }}>
                  {idx + 1}. {rule}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
      </Container>

      <Divider />

      {/* Tabs */}
      <Container maxWidth="sm" disableGutters>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="Posts" />
          <Tab label="Events" />
          <Tab label="Members" />
        </Tabs>
      </Container>

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 3 }}>
        {tab === 0 && (
          <Box>
            {posts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  No posts yet. Be the first to share!
                </Typography>
              </Box>
            ) : (
              posts.map((post, idx) => (
                <Box key={post.id}>
                  <Box sx={{ py: 3 }}>
                    <Stack direction="row" spacing={2}>
                      <Avatar src={post.profiles.avatar_url || undefined} sx={{ width: 40, height: 40 }}>
                        {initials(post.profiles.display_name)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {post.profiles.display_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {formatTime(post.created_at)}
                          </Typography>
                        </Stack>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {post.content}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                          <IconButton size="small">
                            <ChatBubbleOutlineIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => toggleLike(post.id)}>
                            {liked.has(post.id) ? (
                              <FavoriteIcon sx={{ fontSize: 17, color: '#EF4444' }} />
                            ) : (
                              <FavoriteBorderIcon sx={{ fontSize: 17 }} />
                            )}
                          </IconButton>
                          <IconButton size="small" onClick={() => toggleBookmark(post.id)}>
                            {bookmarked.has(post.id) ? (
                              <BookmarkIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                            ) : (
                              <BookmarkBorderIcon sx={{ fontSize: 17 }} />
                            )}
                          </IconButton>
                          <IconButton size="small">
                            <ShareIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                  {idx < posts.length - 1 && <Divider />}
                </Box>
              ))
            )}
          </Box>
        )}
        {tab === 1 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No upcoming events
            </Typography>
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {community.member_count} members
            </Typography>
          </Box>
        )}
      </Container>
    </MainLayout>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import { supabase } from '../lib/supabase';
import type { Post, Community } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';
import EditPostDialog from '../components/EditPostDialog';
import PostCard, { type FeedPost } from '../components/PostCard';
import { DetailSkeleton } from '../components/Skeletons';

const POST_PAGE_SIZE = 20;

export default function CommunityDetailScreen() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPost, setMenuPost] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [snackbar, setSnackbar] = useState('');

  const loadCommunity = useCallback(async () => {
    if (!slug || !user) return;
    setLoading(true);

    // Step 1: Fetch community first (needed for community_id)
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

    // Step 2: Fetch membership and posts in parallel
    const [{ data: membership }, { data: postsData }] = await Promise.all([
      supabase
        .from('community_members')
        .select('role')
        .eq('community_id', communityData.id)
        .eq('profile_id', user.id)
        .maybeSingle(),
      supabase
        .from('posts')
        .select('*, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(*)')
        .eq('community_id', communityData.id)
        .order('created_at', { ascending: false })
        .limit(POST_PAGE_SIZE),
    ]);

    const loadedPosts = (postsData ?? []) as FeedPost[];
    setIsMember(!!membership);
    setUserRole(membership?.role || null);
    setPosts(loadedPosts);

    // Step 3: Load interaction state (non-blocking)
    if (loadedPosts.length > 0) {
      const ids = loadedPosts.map((p) => p.id);
      const [{ data: likesData }, { data: bookmarksData }] = await Promise.all([
        supabase.from('likes').select('post_id').eq('profile_id', user.id).in('post_id', ids),
        supabase.from('bookmarks').select('post_id').eq('profile_id', user.id).in('post_id', ids),
      ]);
      setLiked(new Set((likesData ?? []).map((l) => l.post_id as string)));
      setBookmarked(new Set((bookmarksData ?? []).map((b) => b.post_id as string)));
    }

    setLoading(false);
  }, [slug, user]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  const handleJoinLeave = useCallback(async () => {
    if (!community || !user) return;
    setJoining(true);

    if (isMember) {
      setIsMember(false);
      setCommunity((prev) => prev ? { ...prev, member_count: Math.max(0, prev.member_count - 1) } : null);
      const { error } = await supabase.from('community_members').delete().match({
        community_id: community.id,
        profile_id: user.id,
      });
      if (error) {
        setIsMember(true);
        setCommunity((prev) => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : null);
      }
    } else {
      setIsMember(true);
      setCommunity((prev) => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : null);
      const { error } = await supabase.from('community_members').insert({
        community_id: community.id,
        profile_id: user.id,
        role: 'member',
      });
      if (error) {
        setIsMember(false);
        setCommunity((prev) => prev ? { ...prev, member_count: Math.max(0, prev.member_count - 1) } : null);
      }
    }

    setJoining(false);
  }, [community, user, isMember]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return;
    const isLiked = liked.has(postId);

    setLiked((prev) => {
      const n = new Set(prev);
      isLiked ? n.delete(postId) : n.add(postId);
      return n;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, like_count: Math.max(0, (p.like_count || 0) + (isLiked ? -1 : 1)) }
          : p
      )
    );

    if (isLiked) {
      const { error } = await supabase.from('likes').delete().match({ profile_id: user.id, post_id: postId });
      if (error) {
        setLiked((prev) => { const n = new Set(prev); n.add(postId); return n; });
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p)));
      }
    } else {
      const { error } = await supabase.from('likes').insert({ profile_id: user.id, post_id: postId });
      if (error) {
        setLiked((prev) => { const n = new Set(prev); n.delete(postId); return n; });
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) } : p)));
      }
    }
  }, [user, liked]);

  const toggleBookmark = useCallback(async (postId: string) => {
    if (!user) return;
    const isBookmarked = bookmarked.has(postId);

    setBookmarked((prev) => {
      const n = new Set(prev);
      isBookmarked ? n.delete(postId) : n.add(postId);
      return n;
    });

    if (isBookmarked) {
      const { error } = await supabase.from('bookmarks').delete().match({ profile_id: user.id, post_id: postId });
      if (error) {
        setBookmarked((prev) => { const n = new Set(prev); n.add(postId); return n; });
      } else {
        setSnackbar('Bookmark removed.');
      }
    } else {
      const { error } = await supabase.from('bookmarks').insert({ profile_id: user.id, post_id: postId });
      if (error) {
        setBookmarked((prev) => { const n = new Set(prev); n.delete(postId); return n; });
      } else {
        setSnackbar('Post saved!');
      }
    }
  }, [user, bookmarked]);

  const handleOpenEdit = useCallback(() => {
    const post = posts.find((p) => p.id === menuPost) ?? null;
    setEditingPost(post);
    setEditDialogOpen(true);
    setAnchorEl(null);
  }, [posts, menuPost]);

  const handleEditSaved = useCallback((updated: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? { ...p, content: updated.content ?? p.content, image_urls: updated.image_urls ?? p.image_urls, updated_at: updated.updated_at ?? p.updated_at }
          : p
      )
    );
    setSnackbar('Post updated.');
  }, []);

  const handleDelete = useCallback(async (postId: string) => {
    setAnchorEl(null);
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSnackbar('Post deleted.');
    } else {
      setSnackbar('Failed to delete post.');
    }
  }, []);

  const handleShare = useCallback(async (post: FeedPost) => {
    const url = `${window.location.origin}/post/${post.id}`;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, share_count: (p.share_count || 0) + 1 } : p)));
    const { error } = await supabase.rpc('increment_post_share_count', { post_id: post.id });
    if (error) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, share_count: Math.max(0, (p.share_count || 0) - 1) } : p)));
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setSnackbar('Link copied to clipboard!');
  }, []);

  const handleMenu = useCallback((e: React.MouseEvent<HTMLElement>, postId: string) => {
    setAnchorEl(e.currentTarget);
    setMenuPost(postId);
  }, []);

  const handleComment = useCallback((_postId: string) => {
    // Could open a comment drawer in the future
  }, []);

  const postCardProps = useMemo(() => ({
    onLike: toggleLike,
    onBookmark: toggleBookmark,
    onShare: handleShare,
    onComment: handleComment,
    onMenu: handleMenu,
  }), [toggleLike, toggleBookmark, handleShare, handleComment, handleMenu]);

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
          <Container maxWidth="sm">
            <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
              <IconButton onClick={() => navigate(-1)}>
                <ArrowBackIcon />
              </IconButton>
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="sm">
          <DetailSkeleton />
        </Container>
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
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLiked={liked.has(post.id)}
                  isBookmarked={bookmarked.has(post.id)}
                  isOwn={post.profile_id === user?.id}
                  showDivider={true}
                  {...postCardProps}
                />
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

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={handleOpenEdit} sx={{ fontSize: '0.9375rem' }}>Edit post</MenuItem>
        <MenuItem onClick={() => handleDelete(menuPost)} sx={{ color: 'error.main', fontSize: '0.9375rem' }}>Delete post</MenuItem>
      </Menu>

      <EditPostDialog
        post={editingPost}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSaved={handleEditSaved}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </MainLayout>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { supabase } from '../lib/supabase';
import type { Profile, Post, ProfileBadge } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';
import PostCommentDrawer from '../components/PostCommentDrawer';

type ProfileWithExtras = Profile & {
  badges?: ProfileBadge[];
  is_following?: boolean;
};

export default function ProfileScreen() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileWithExtras | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [uploadingCover, setUploadingCover] = useState(false);
  const [commentDrawerPostId, setCommentDrawerPostId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, [username, user]);

  useEffect(() => {
    if (tab === 3 && profile && user && profile.id === user.id && savedPosts.length === 0) {
      loadSavedPosts();
    }
  }, [tab]);

  const loadProfile = async () => {
    if (!username || !user) return;
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq.${username},id.eq.${username}`)
      .maybeSingle();

    if (!profileData) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', profileData.id)
      .maybeSingle();

    setProfile({ ...profileData, is_following: !!followData } as ProfileWithExtras);
    setFollowing(!!followData);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*, niches(name)')
      .eq('profile_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const loadedPosts = (postsData ?? []) as Post[];
    setPosts(loadedPosts);

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
  };

  const loadSavedPosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookmarks')
      .select('post_id, posts(*, niches(name))')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const loaded = (data ?? [])
      .map((b) => b.posts as unknown as Post | null)
      .filter(Boolean) as Post[];
    setSavedPosts(loaded);

    // Load interaction state for saved posts too
    if (loaded.length > 0) {
      const ids = loaded.map((p) => p.id);
      const [{ data: likesData }, { data: bookmarksData }] = await Promise.all([
        supabase.from('likes').select('post_id').eq('profile_id', user.id).in('post_id', ids),
        supabase.from('bookmarks').select('post_id').eq('profile_id', user.id).in('post_id', ids),
      ]);
      setLiked((prev) => new Set([...prev, ...(likesData ?? []).map((l) => l.post_id as string)]));
      setBookmarked((prev) => new Set([...prev, ...(bookmarksData ?? []).map((b) => b.post_id as string)]));
    }
  };

  const handleFollow = async () => {
    if (!profile || !user) return;
    if (following) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: profile.id });
      setFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
      setFollowing(true);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    setUploadingCover(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/cover-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(fileName, file);

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(fileName);
      await supabase.from('profiles').update({ cover_url: publicUrl }).eq('id', user.id);
      setProfile((prev) => prev ? { ...prev, cover_url: publicUrl } : null);
    }

    setUploadingCover(false);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const isLiked = liked.has(postId);

    setLiked((prev) => {
      const n = new Set(prev);
      isLiked ? n.delete(postId) : n.add(postId);
      return n;
    });
    const updateCount = (arr: Post[]) =>
      arr.map((p) =>
        p.id === postId
          ? { ...p, like_count: Math.max(0, (p.like_count || 0) + (isLiked ? -1 : 1)) }
          : p
      );
    setPosts(updateCount);
    setSavedPosts(updateCount);

    if (isLiked) {
      await supabase.from('likes').delete().match({ profile_id: user.id, post_id: postId });
    } else {
      await supabase.from('likes').insert({ profile_id: user.id, post_id: postId });
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    const isBookmarked = bookmarked.has(postId);

    setBookmarked((prev) => {
      const n = new Set(prev);
      isBookmarked ? n.delete(postId) : n.add(postId);
      return n;
    });

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().match({ profile_id: user.id, post_id: postId });
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    } else {
      await supabase.from('bookmarks').insert({ profile_id: user.id, post_id: postId });
    }
  };

  const handleShare = async (post: Post) => {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${profile.username || profile.id}`;
    const shareData = {
      title: `${profile.display_name} on Chimso`,
      text: post.content.slice(0, 100),
      url,
    };
    const updateCount = (arr: Post[]) =>
      arr.map((p) => (p.id === post.id ? { ...p, share_count: (p.share_count || 0) + 1 } : p));
    setPosts(updateCount);
    setSavedPosts(updateCount);
    await supabase.from('posts').update({ share_count: (post.share_count || 0) + 1 }).eq('id', post.id);

    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleCommentAdded = (postId: string) => {
    const updateCount = (arr: Post[]) =>
      arr.map((p) =>
        p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
      );
    setPosts(updateCount);
    setSavedPosts(updateCount);
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

  const isOwnProfile = profile?.id === user?.id;

  const getPostImages = (post: Post): string[] => {
    if (post.image_urls && post.image_urls.length > 0) return post.image_urls;
    if (post.image_url) return [post.image_url];
    return [];
  };

  const renderPostCard = (post: Post, idx: number, arr: Post[]) => {
    const isLiked = liked.has(post.id);
    const isBookmarked = bookmarked.has(post.id);
    const images = getPostImages(post);

    return (
      <Box key={post.id}>
        <Box sx={{ py: 3 }}>
          <Typography variant="body1">{post.content}</Typography>

          {images.length > 0 && (
            <Box sx={{ mt: 2, borderRadius: 2, overflow: 'hidden' }}>
              <ImageList cols={images.length > 1 ? 2 : 1} gap={4} sx={{ m: 0 }}>
                {images.slice(0, 4).map((url, imgIdx) => (
                  <ImageListItem key={imgIdx}>
                    <Box
                      component="img"
                      src={url}
                      alt={`Post image ${imgIdx + 1}`}
                      sx={{
                        width: '100%',
                        height: images.length === 1 ? 280 : 160,
                        objectFit: 'cover',
                      }}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </Box>
          )}

          <Stack direction="row" spacing={0} sx={{ mt: 2, ml: -1 }}>
            <Stack direction="row" alignItems="center">
              <IconButton
                size="small"
                onClick={() => setCommentDrawerPostId(post.id)}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <ChatBubbleOutlineIcon sx={{ fontSize: 17 }} />
              </IconButton>
              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 16 }}>
                {post.comment_count || 0}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" sx={{ ml: 2 }}>
              <IconButton
                size="small"
                onClick={() => toggleLike(post.id)}
                sx={{ color: isLiked ? 'error.main' : 'text.secondary', '&:hover': { color: 'error.main' } }}
              >
                {isLiked ? <FavoriteIcon sx={{ fontSize: 17 }} /> : <FavoriteBorderIcon sx={{ fontSize: 17 }} />}
              </IconButton>
              <Typography variant="caption" sx={{ color: isLiked ? 'error.main' : 'text.secondary', minWidth: 16 }}>
                {post.like_count || 0}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" sx={{ ml: 2 }}>
              <IconButton
                size="small"
                onClick={() => toggleBookmark(post.id)}
                sx={{ color: isBookmarked ? 'primary.main' : 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                {isBookmarked ? <BookmarkIcon sx={{ fontSize: 17 }} /> : <BookmarkBorderIcon sx={{ fontSize: 17 }} />}
              </IconButton>
            </Stack>

            <IconButton
              size="small"
              onClick={() => handleShare(post)}
              sx={{ ml: 2, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              <ShareIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Stack>

          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
            {formatTime(post.created_at)} in {(post.niches as { name: string } | null)?.name || 'general'}
          </Typography>
        </Box>
        {idx < arr.length - 1 && <Divider />}
      </Box>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress size={20} thickness={2.5} />
        </Box>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h3">Profile not found</Typography>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {profile.display_name || 'Profile'}
            </Typography>
            {isOwnProfile && (
              <IconButton onClick={() => navigate('/settings')}>
                <SettingsIcon />
              </IconButton>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Cover Photo */}
      <Box sx={{ position: 'relative', height: 180, bgcolor: 'grey.200' }}>
        {profile.cover_url ? (
          <Box
            component="img"
            src={profile.cover_url}
            alt="Cover"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #0F3D91 0%, #1a5fb4 100%)',
            }}
          />
        )}
        {isOwnProfile && (
          <>
            <input
              type="file"
              accept="image/*"
              ref={coverInputRef}
              onChange={handleCoverUpload}
              style={{ display: 'none' }}
            />
            <IconButton
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              sx={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                bgcolor: 'rgba(0,0,0,0.6)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              }}
            >
              {uploadingCover ? (
                <CircularProgress size={20} thickness={2.5} sx={{ color: 'white' }} />
              ) : (
                <PhotoCameraIcon sx={{ color: 'white', fontSize: 20 }} />
              )}
            </IconButton>
          </>
        )}
      </Box>

      {/* Profile Info */}
      <Container maxWidth="sm" sx={{ pb: 4 }}>
        <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center', mt: -8 }}>
          <Avatar
            src={profile.avatar_url || undefined}
            sx={{
              width: 120,
              height: 120,
              fontSize: '2.5rem',
              border: '4px solid',
              borderColor: 'background.default',
              bgcolor: 'background.default',
            }}
          >
            {initials(profile.display_name)}
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {profile.display_name}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              @{profile.username || 'user'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={4} sx={{ textAlign: 'center' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{profile.post_count}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>posts</Typography>
            </Box>
            <Box sx={{ cursor: 'pointer' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{profile.follower_count}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>followers</Typography>
            </Box>
            <Box sx={{ cursor: 'pointer' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{profile.following_count}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>following</Typography>
            </Box>
          </Stack>

          {profile.bio && (
            <Typography variant="body1">{profile.bio}</Typography>
          )}

          {profile.reputation_points > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <MilitaryTechIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {profile.reputation_points} reputation points
              </Typography>
            </Stack>
          )}

          <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            {isOwnProfile ? (
              <Button variant="outlined" fullWidth onClick={() => navigate('/settings')}>
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  variant={following ? 'outlined' : 'contained'}
                  fullWidth
                  onClick={handleFollow}
                >
                  {following ? 'Following' : 'Follow'}
                </Button>
                <Button variant="outlined" onClick={() => navigate('/messages')}>
                  Message
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Container>

      <Divider />

      {/* Tabs */}
      <Container maxWidth="sm" disableGutters>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="Posts" />
          <Tab label="Communities" />
          <Tab label="Badges" />
          {isOwnProfile && <Tab label="Saved" />}
        </Tabs>
      </Container>

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 3 }}>
        {tab === 0 && (
          <Box>
            {posts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>No posts yet</Typography>
              </Box>
            ) : (
              posts.map((post, idx) => renderPostCard(post, idx, posts))
            )}
          </Box>
        )}
        {tab === 1 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Communities will appear here
            </Typography>
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Badges will appear here
            </Typography>
          </Box>
        )}
        {tab === 3 && isOwnProfile && (
          <Box>
            {savedPosts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  No saved posts yet. Bookmark posts to see them here.
                </Typography>
              </Box>
            ) : (
              savedPosts.map((post, idx) => renderPostCard(post, idx, savedPosts))
            )}
          </Box>
        )}
      </Container>

      <PostCommentDrawer
        postId={commentDrawerPostId}
        open={Boolean(commentDrawerPostId)}
        onClose={() => setCommentDrawerPostId(null)}
        onCommentAdded={handleCommentAdded}
      />
    </MainLayout>
  );
}

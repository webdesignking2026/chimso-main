import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Snackbar from '@mui/material/Snackbar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import { supabase } from '../lib/supabase';
import type { Post, Niche } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import PostCommentDrawer from '../components/PostCommentDrawer';

type PostWithRelations = Post & {
  profiles: { display_name: string; avatar_url: string; username: string | null };
  niches: Niche;
};

export default function PostDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<PostWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    if (id) loadPost();
  }, [id, user]);

  const loadPost = async () => {
    if (!id) return;
    setLoading(true);

    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(*)')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      const loaded = data as PostWithRelations;
      setPost(loaded);

      // Set Open Graph meta tags dynamically
      const title = `${loaded.profiles.display_name} on Chimso`;
      const description = loaded.content.slice(0, 200);
      const image = loaded.image_urls?.[0] || loaded.image_url || `${window.location.origin}/chimsologo.png`;

      setMetaTag('og:title', title);
      setMetaTag('og:description', description);
      setMetaTag('og:image', image);
      setMetaTag('og:url', window.location.href);
      setMetaTag('og:type', 'article');
      setMetaTag('twitter:card', 'summary_large_image');
      setMetaTag('twitter:title', title);
      setMetaTag('twitter:description', description);
      setMetaTag('twitter:image', image);
      document.title = title;

      // Load interaction state
      if (user) {
        const [{ data: likeData }, { data: bmData }] = await Promise.all([
          supabase.from('likes').select('post_id').eq('profile_id', user.id).eq('post_id', id).maybeSingle(),
          supabase.from('bookmarks').select('post_id').eq('profile_id', user.id).eq('post_id', id).maybeSingle(),
        ]);
        setLiked(!!likeData);
        setBookmarked(!!bmData);
      }
    }

    setLoading(false);
  };

  const setMetaTag = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const toggleLike = async () => {
    if (!user || !post) return;
    if (liked) {
      setLiked(false);
      setPost((p) => p ? { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) } : p);
      await supabase.from('likes').delete().match({ profile_id: user.id, post_id: post.id });
    } else {
      setLiked(true);
      setPost((p) => p ? { ...p, like_count: (p.like_count || 0) + 1 } : p);
      await supabase.from('likes').insert({ profile_id: user.id, post_id: post.id });
    }
  };

  const toggleBookmark = async () => {
    if (!user || !post) return;
    if (bookmarked) {
      setBookmarked(false);
      await supabase.from('bookmarks').delete().match({ profile_id: user.id, post_id: post.id });
      setSnackbar('Bookmark removed.');
    } else {
      setBookmarked(true);
      await supabase.from('bookmarks').insert({ profile_id: user.id, post_id: post.id });
      setSnackbar('Post saved!');
    }
  };

  const handleShare = async () => {
    if (!post) return;
    const url = window.location.href;
    const shareData = {
      title: `${post.profiles.display_name} on Chimso`,
      text: post.content.slice(0, 100),
      url,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setSnackbar('Link copied to clipboard!');
    }
  };

  const getPostImages = (): string[] => {
    if (!post) return [];
    if (post.image_urls?.length > 0) return post.image_urls;
    if (post.image_url) return [post.image_url];
    return [];
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress size={20} thickness={2.5} />
        </Box>
      </MainLayout>
    );
  }

  if (!post) {
    return (
      <MainLayout>
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h4">Post not found</Typography>
        </Container>
      </MainLayout>
    );
  }

  const images = getPostImages();

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Post</Typography>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {/* Author */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Avatar
            src={post.profiles.avatar_url || undefined}
            onClick={() => navigate(`/${post.profiles.username || post.profile_id}`)}
            sx={{ width: 48, height: 48, cursor: 'pointer' }}
          >
            {initials(post.profiles.display_name)}
          </Avatar>
          <Box>
            <Typography
              variant="subtitle1"
              onClick={() => navigate(`/${post.profiles.username || post.profile_id}`)}
              sx={{ fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {post.profiles.display_name}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                @{post.profiles.username || 'user'}
              </Typography>
              <Chip label={post.niches.name} size="small" />
            </Stack>
          </Box>
        </Stack>

        {/* Content */}
        <Typography variant="body1" sx={{ fontSize: '1.125rem', lineHeight: 1.7, wordBreak: 'break-word', whiteSpace: 'pre-wrap', mb: 3 }}>
          {post.content}
        </Typography>

        {/* Images */}
        {images.length > 0 && (
          <Box sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <ImageList cols={images.length > 1 ? 2 : 1} gap={4} sx={{ m: 0 }}>
              {images.map((url, imgIdx) => (
                <ImageListItem key={imgIdx}>
                  <Box
                    component="img"
                    src={url}
                    alt={`Post image ${imgIdx + 1}`}
                    sx={{ width: '100%', height: images.length === 1 ? 320 : 180, objectFit: 'cover' }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          </Box>
        )}

        {/* Timestamp */}
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 3 }}>
          {formatTime(post.created_at)}
          {post.updated_at && new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 5000 && (
            <Box component="span" sx={{ color: 'text.disabled' }}> · Edited</Box>
          )}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Actions */}
        <Stack direction="row" spacing={1} sx={{ ml: -1 }}>
          <Stack direction="row" alignItems="center">
            <IconButton size="small" onClick={() => setCommentDrawerOpen(true)} sx={{ color: 'text.secondary' }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 20 }}>
              {post.comment_count || 0}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" sx={{ ml: 2 }}>
            <IconButton size="small" onClick={toggleLike} sx={{ color: liked ? 'error.main' : 'text.secondary' }}>
              {liked ? <FavoriteIcon sx={{ fontSize: 20 }} /> : <FavoriteBorderIcon sx={{ fontSize: 20 }} />}
            </IconButton>
            <Typography variant="caption" sx={{ color: liked ? 'error.main' : 'text.secondary', minWidth: 20 }}>
              {post.like_count || 0}
            </Typography>
          </Stack>

          <IconButton size="small" onClick={toggleBookmark} sx={{ ml: 2, color: bookmarked ? 'primary.main' : 'text.secondary' }}>
            {bookmarked ? <BookmarkIcon sx={{ fontSize: 20 }} /> : <BookmarkBorderIcon sx={{ fontSize: 20 }} />}
          </IconButton>

          <IconButton size="small" onClick={handleShare} sx={{ ml: 2, color: 'text.secondary' }}>
            <ShareIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Container>

      <PostCommentDrawer
        postId={post.id}
        open={commentDrawerOpen}
        onClose={() => setCommentDrawerOpen(false)}
        onCommentAdded={() => setPost((p) => p ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)}
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

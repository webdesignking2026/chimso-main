import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../lib/supabase';
import type { Post, Niche } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import PostCommentDrawer from '../components/PostCommentDrawer';
import EditPostDialog from '../components/EditPostDialog';
import PostCard, { type FeedPost, initials } from '../components/PostCard';
import { FeedSkeleton } from '../components/Skeletons';

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [myNiches, setMyNiches] = useState<Niche[]>([]);
  const [feedTab, setFeedTab] = useState(0);
  const [activeNiche, setActiveNiche] = useState<string>('all');
  const [newPost, setNewPost] = useState('');
  const [postNiche, setPostNiche] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPost, setMenuPost] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [composeFocused, setComposeFocused] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [commentDrawerPostId, setCommentDrawerPostId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nichesLoadedRef = useRef(false);

  const loadInteractionState = useCallback(async (postIds: string[]) => {
    if (!user || postIds.length === 0) return;
    const [{ data: likesData }, { data: bookmarksData }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('profile_id', user.id).in('post_id', postIds),
      supabase.from('bookmarks').select('post_id').eq('profile_id', user.id).in('post_id', postIds),
    ]);
    setLiked((prev) => {
      const n = new Set(prev);
      (likesData ?? []).forEach((l) => n.add(l.post_id as string));
      return n;
    });
    setBookmarked((prev) => {
      const n = new Set(prev);
      (bookmarksData ?? []).forEach((b) => n.add(b.post_id as string));
      return n;
    });
  }, [user]);

  const loadPosts = useCallback(async (replace: boolean = true) => {
    if (replace) setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(*)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (feedTab === 1 && user) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const ids = (following ?? []).map((f) => f.following_id);
        query = query.in('profile_id', [...ids, user.id]);
      }

      if (activeNiche !== 'all' && activeNiche) {
        query = query.eq('niche_id', activeNiche);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error loading posts:', error.message);
        return;
      }
      const loaded = (data ?? []) as FeedPost[];
      setPosts(loaded);
      setHasMore(loaded.length === PAGE_SIZE);
      await loadInteractionState(loaded.map((p) => p.id));
    } finally {
      setLoading(false);
    }
  }, [feedTab, activeNiche, user, loadInteractionState]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const lastDate = posts[posts.length - 1].created_at;
      let query = supabase
        .from('posts')
        .select('*, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(*)')
        .order('created_at', { ascending: false })
        .lt('created_at', lastDate)
        .limit(PAGE_SIZE);

      if (feedTab === 1 && user) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const ids = (following ?? []).map((f) => f.following_id);
        query = query.in('profile_id', [...ids, user.id]);
      }

      if (activeNiche !== 'all' && activeNiche) {
        query = query.eq('niche_id', activeNiche);
      }

      const { data, error } = await query;
      if (error) return;
      const loaded = (data ?? []) as FeedPost[];
      setPosts((prev) => [...prev, ...loaded]);
      setHasMore(loaded.length === PAGE_SIZE);
      if (loaded.length > 0) {
        loadInteractionState(loaded.map((p) => p.id));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, posts, feedTab, activeNiche, user, loadInteractionState]);

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Single effect: load niches + posts on mount / when tab/niche changes
  useEffect(() => {
    if (!user) return;
    (async () => {
      if (!nichesLoadedRef.current) {
        nichesLoadedRef.current = true;
        const { data: pn } = await supabase
          .from('profile_niches')
          .select('niche_id, niches(*)')
          .eq('profile_id', user.id);
        const followed = (pn ?? []).map((x) => x.niches as unknown as Niche);
        setMyNiches(followed);
        if (followed.length > 0) setPostNiche(followed[0].id);
      }
      await loadPosts(true);
    })();
  }, [user, feedTab, activeNiche, loadPosts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingImages(true);
    const fileArr = Array.from(files).slice(0, 4 - selectedImages.length);
    const uploadPromises = fileArr.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
        return publicUrl;
      }
      return null;
    });
    const results = await Promise.all(uploadPromises);
    const uploaded = results.filter((r): r is string => r !== null);
    setSelectedImages((prev) => [...prev, ...uploaded].slice(0, 4));
    setUploadingImages(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!newPost.trim() || !user || !postNiche) return;
    setPosting(true);
    const { error } = await supabase.from('posts').insert({
      profile_id: user.id,
      niche_id: postNiche,
      content: newPost.trim(),
      image_urls: selectedImages,
    });
    if (!error) {
      setNewPost('');
      setSelectedImages([]);
      setComposeFocused(false);
      await loadPosts(true);
      setSnackbar('Posted!');
    } else {
      setSnackbar('Failed to post. Please try again.');
    }
    setPosting(false);
  };

  const handleDelete = async (postId: string) => {
    setAnchorEl(null);
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSnackbar('Post deleted.');
    } else {
      setSnackbar('Failed to delete post.');
    }
  };

  const handleOpenEdit = () => {
    const post = posts.find((p) => p.id === menuPost) ?? null;
    setEditingPost(post);
    setEditDialogOpen(true);
    setAnchorEl(null);
  };

  const handleEditSaved = (updated: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? { ...p, content: updated.content ?? p.content, image_urls: updated.image_urls ?? p.image_urls, updated_at: updated.updated_at ?? p.updated_at }
          : p
      )
    );
    setSnackbar('Post updated.');
  };

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
        setSnackbar('Failed to remove bookmark.');
      } else {
        setSnackbar('Bookmark removed.');
      }
    } else {
      const { error } = await supabase.from('bookmarks').insert({ profile_id: user.id, post_id: postId });
      if (error) {
        setBookmarked((prev) => { const n = new Set(prev); n.delete(postId); return n; });
        setSnackbar('Failed to bookmark.');
      } else {
        setSnackbar('Post saved!');
      }
    }
  }, [user, bookmarked]);

  const handleShare = useCallback(async (post: FeedPost) => {
    if (!user) return;
    const url = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: `${post.profiles.display_name} on Chimso`,
      text: post.content.slice(0, 100),
      url,
    };

    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, share_count: p.share_count + 1 } : p)));

    const { error } = await supabase.rpc('increment_post_share_count', { post_id: post.id });
    if (error) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, share_count: Math.max(0, p.share_count - 1) } : p)));
    }

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, share_count: Math.max(0, p.share_count - 1) } : p)));
      }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setSnackbar('Link copied to clipboard!');
    }
  }, [user]);

  const handleCommentAdded = useCallback((postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)));
  }, []);

  const handleMenu = useCallback((e: React.MouseEvent<HTMLElement>, postId: string) => {
    setAnchorEl(e.currentTarget);
    setMenuPost(postId);
  }, []);

  const handleComment = useCallback((postId: string) => {
    setCommentDrawerPostId(postId);
  }, []);

  const postCardProps = useMemo(() => ({
    onLike: toggleLike,
    onBookmark: toggleBookmark,
    onShare: handleShare,
    onComment: handleComment,
    onMenu: handleMenu,
  }), [toggleLike, toggleBookmark, handleShare, handleComment, handleMenu]);

  return (
    <MainLayout>
      {/* Top bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, rgba(15, 61, 145, 0.03) 0%, rgba(15, 61, 145, 0.06) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            opacity: 0.4,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(15, 61, 145, 0.04) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(15, 61, 145, 0.03) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 3,
            position: 'relative',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              component="img"
              src="/chimsologo.png"
              alt="Chimso"
              sx={{ width: 32, height: 32, borderRadius: '9px' }}
            />
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Chimso
            </Typography>
          </Stack>
          <Avatar
            src={profile?.avatar_url || undefined}
            sx={{
              width: 36,
              height: 36,
              fontSize: '0.75rem',
              cursor: 'pointer',
              border: '2px solid',
              borderColor: 'primary.light',
            }}
          >
            {profile?.display_name ? initials(profile.display_name) : '?'}
          </Avatar>
        </Container>

        {/* Feed tabs */}
        <Container maxWidth="sm" disableGutters>
          <Tabs
            value={feedTab}
            onChange={(_, v) => setFeedTab(v)}
            variant="fullWidth"
            sx={{ minHeight: 44, '& .MuiTabs-indicator': { height: 2 } }}
          >
            <Tab label="For You" sx={{ minHeight: 44, fontSize: '0.9375rem' }} />
            <Tab label="Following" sx={{ minHeight: 44, fontSize: '0.9375rem' }} />
          </Tabs>
        </Container>

        {/* Niche filter chips */}
        {myNiches.length > 0 && (
          <Container maxWidth="sm">
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                py: 2,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              <Chip
                label="All"
                size="small"
                onClick={() => setActiveNiche('all')}
                variant={activeNiche === 'all' ? 'filled' : 'outlined'}
                sx={{ flexShrink: 0 }}
              />
              {myNiches.map((n) => (
                <Chip
                  key={n.id}
                  label={n.name}
                  size="small"
                  onClick={() => setActiveNiche(n.id)}
                  variant={activeNiche === n.id ? 'filled' : 'outlined'}
                  sx={{ flexShrink: 0 }}
                />
              ))}
            </Box>
          </Container>
        )}
      </Box>

      {/* Feed body */}
      <Box sx={{ flex: 1 }}>
        <Container maxWidth="sm" disableGutters>
          {/* Compose box */}
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              px: 4,
              pt: 3,
              pb: composeFocused ? 3 : 2,
            }}
          >
            <Stack direction="row" spacing={3} alignItems="flex-start">
              <Avatar
                src={profile?.avatar_url || undefined}
                sx={{ width: 40, height: 40, fontSize: '0.875rem', flexShrink: 0, mt: 0.5 }}
              >
                {profile?.display_name ? initials(profile.display_name) : '?'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={6}
                  placeholder="What's on your heart today?"
                  variant="standard"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  onFocus={() => setComposeFocused(true)}
                  inputProps={{ maxLength: 500 }}
                  sx={{
                    '& .MuiInput-root': { fontSize: '1rem', lineHeight: 1.5 },
                    '& .MuiInputBase-input::placeholder': { color: 'text.secondary', opacity: 1 },
                    '& .MuiInput-underline:before': { borderBottom: 'none !important' },
                    '& .MuiInput-underline:after': { borderBottom: 'none !important' },
                    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none !important' },
                  }}
                />

                {selectedImages.length > 0 && (
                  <Box sx={{ mt: 2, position: 'relative' }}>
                    <ImageList cols={selectedImages.length > 1 ? 2 : 1} gap={8} sx={{ m: 0 }}>
                      {selectedImages.map((url, idx) => (
                        <ImageListItem key={idx} sx={{ position: 'relative' }}>
                          <Box
                            component="img"
                            src={url}
                            alt={`Preview ${idx + 1}`}
                            sx={{
                              width: '100%',
                              height: selectedImages.length === 1 ? 200 : 120,
                              objectFit: 'cover',
                              borderRadius: 2,
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeImage(idx)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(0,0,0,0.6)',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                              width: 24,
                              height: 24,
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 14, color: 'white' }} />
                          </IconButton>
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}

                {composeFocused && myNiches.length > 0 && (
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                      {myNiches.map((n) => (
                        <Chip
                          key={n.id}
                          label={n.name}
                          size="small"
                          onClick={() => setPostNiche(n.id)}
                          variant={postNiche === n.id ? 'filled' : 'outlined'}
                        />
                      ))}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImages || selectedImages.length >= 4}
                        sx={{ color: 'text.secondary' }}
                      >
                        {uploadingImages ? (
                          <CircularProgress size={18} thickness={2.5} />
                        ) : (
                          <ImageIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handlePost}
                      disabled={!newPost.trim() || posting || !postNiche}
                      sx={{ ml: 2, flexShrink: 0, px: 4 }}
                    >
                      {posting ? <CircularProgress size={14} thickness={3} sx={{ color: 'white' }} /> : 'Post'}
                    </Button>
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>

          {/* Posts list */}
          {loading && posts.length === 0 ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 16, px: 6 }}>
              <Typography variant="h3" sx={{ color: 'text.primary', mb: 2 }}>
                Your feed is empty
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Be the first to share something in your communities.
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

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={20} thickness={2.5} />
            </Box>
          )}
        </Container>
      </Box>

      {/* Context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={handleOpenEdit} sx={{ fontSize: '0.9375rem' }}>
          Edit post
        </MenuItem>
        <MenuItem onClick={() => handleDelete(menuPost)} sx={{ color: 'error.main', fontSize: '0.9375rem' }}>
          Delete post
        </MenuItem>
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

      <PostCommentDrawer
        postId={commentDrawerPostId}
        open={Boolean(commentDrawerPostId)}
        onClose={() => setCommentDrawerPostId(null)}
        onCommentAdded={handleCommentAdded}
      />
    </MainLayout>
  );
}

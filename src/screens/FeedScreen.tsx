import { useEffect, useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../lib/supabase';
import type { Post, Niche } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import PostCommentDrawer from '../components/PostCommentDrawer';

type PostWithRelations = Post & {
  profiles: { display_name: string; avatar_url: string; username: string | null };
  niches: Niche;
};

export default function FeedScreen() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [myNiches, setMyNiches] = useState<Niche[]>([]);
  const [feedTab, setFeedTab] = useState(0);
  const [activeNiche, setActiveNiche] = useState<string>('all');
  const [newPost, setNewPost] = useState('');
  const [postNiche, setPostNiche] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPost, setMenuPost] = useState<string>('');
  const [snackbar, setSnackbar] = useState('');
  const [composeFocused, setComposeFocused] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [commentDrawerPostId, setCommentDrawerPostId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadInteractionState = useCallback(async (postIds: string[]) => {
    if (!user || postIds.length === 0) return;
    const [{ data: likesData }, { data: bookmarksData }] = await Promise.all([
      supabase
        .from('likes')
        .select('post_id')
        .eq('profile_id', user.id)
        .in('post_id', postIds),
      supabase
        .from('bookmarks')
        .select('post_id')
        .eq('profile_id', user.id)
        .in('post_id', postIds),
    ]);
    setLiked(new Set((likesData ?? []).map((l) => l.post_id as string)));
    setBookmarked(new Set((bookmarksData ?? []).map((b) => b.post_id as string)));
  }, [user]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (feedTab === 1 && user) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        if (following && following.length > 0) {
          const ids = following.map((f) => f.following_id);
          query = query.in('profile_id', [...ids, user.id]);
        }
      }

      if (activeNiche !== 'all' && activeNiche) {
        query = query.eq('niche_id', activeNiche);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error loading posts:', error.message);
      } else {
        const loaded = (data ?? []) as PostWithRelations[];
        setPosts(loaded);
        await loadInteractionState(loaded.map((p) => p.id));
      }
    } finally {
      setLoading(false);
    }
  }, [feedTab, activeNiche, user, loadInteractionState]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pn } = await supabase
        .from('profile_niches')
        .select('niche_id, niches(*)')
        .eq('profile_id', user.id);
      const followed = (pn ?? []).map((x) => x.niches as unknown as Niche);
      setMyNiches(followed);
      if (followed.length > 0) setPostNiche(followed[0].id);
      await loadPosts();
    })();
  }, [user]);

  useEffect(() => {
    if (user) loadPosts();
  }, [feedTab, activeNiche, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingImages(true);
    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (selectedImages.length + uploadedUrls.length >= 4) break;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }
    setSelectedImages((prev) => [...prev, ...uploadedUrls].slice(0, 4));
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
      await loadPosts();
      setSnackbar('Posted!');
    } else {
      setSnackbar('Failed to post. Please try again.');
    }
    setPosting(false);
  };

  const handleDelete = async (postId: string) => {
    setAnchorEl(null);
    await supabase.from('posts').delete().eq('id', postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSnackbar('Post deleted.');
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const isLiked = liked.has(postId);

    // Optimistic update
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
      const { error } = await supabase
        .from('likes')
        .delete()
        .match({ profile_id: user.id, post_id: postId });
      if (error) {
        // Revert on failure
        setLiked((prev) => { const n = new Set(prev); n.add(postId); return n; });
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p))
        );
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ profile_id: user.id, post_id: postId });
      if (error) {
        setLiked((prev) => { const n = new Set(prev); n.delete(postId); return n; });
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) } : p))
        );
      }
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    const isBookmarked = bookmarked.has(postId);

    // Optimistic update
    setBookmarked((prev) => {
      const n = new Set(prev);
      isBookmarked ? n.delete(postId) : n.add(postId);
      return n;
    });

    if (isBookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .match({ profile_id: user.id, post_id: postId });
      if (error) {
        setBookmarked((prev) => { const n = new Set(prev); n.add(postId); return n; });
        setSnackbar('Failed to remove bookmark.');
      } else {
        setSnackbar('Bookmark removed.');
      }
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ profile_id: user.id, post_id: postId });
      if (error) {
        setBookmarked((prev) => { const n = new Set(prev); n.delete(postId); return n; });
        setSnackbar('Failed to bookmark.');
      } else {
        setSnackbar('Post saved!');
      }
    }
  };

  const handleShare = async (post: PostWithRelations) => {
    if (!user) return;
    const url = `${window.location.origin}/profile/${post.profiles.username || post.profile_id}`;
    const shareData = {
      title: `${post.profiles.display_name} on Chimso`,
      text: post.content.slice(0, 100),
      url,
    };

    // Increment share count optimistically
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, share_count: p.share_count + 1 } : p))
    );

    // Track in DB
    await supabase
      .from('posts')
      .update({ share_count: post.share_count + 1 })
      .eq('id', post.id);

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share — revert count
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, share_count: Math.max(0, p.share_count - 1) } : p
          )
        );
        await supabase
          .from('posts')
          .update({ share_count: Math.max(0, post.share_count) })
          .eq('id', post.id);
      }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setSnackbar('Link copied to clipboard!');
    }
  };

  const handleCommentAdded = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
      )
    );
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

  const getPostImages = (post: PostWithRelations): string[] => {
    if (post.image_urls && post.image_urls.length > 0) return post.image_urls;
    if (post.image_url) return [post.image_url];
    return [];
  };

  return (
    <MainLayout>
      {/* Top bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              component="img"
              src="/chimsologo.png"
              alt="Chimso"
              sx={{ width: 28, height: 28, borderRadius: '8px' }}
            />
            <Typography variant="h5" sx={{ color: 'text.primary' }}>
              Chimso
            </Typography>
          </Stack>
          <Avatar
            src={profile?.avatar_url || undefined}
            sx={{ width: 34, height: 34, fontSize: '0.75rem', cursor: 'pointer' }}
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

        {loading && <LinearProgress sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />}
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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
              <CircularProgress size={20} thickness={2.5} />
            </Box>
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
            posts.map((post, idx) => {
              const isOwn = post.profile_id === user?.id;
              const isLiked = liked.has(post.id);
              const isBookmarked = bookmarked.has(post.id);
              const images = getPostImages(post);

              return (
                <Box key={post.id}>
                  <Box sx={{ px: 4, pt: 3, pb: 2 }}>
                    <Stack direction="row" spacing={3} alignItems="flex-start">
                      <Avatar
                        src={post.profiles.avatar_url || undefined}
                        sx={{ width: 40, height: 40, fontSize: '0.875rem', flexShrink: 0, mt: 0.25 }}
                      >
                        {initials(post.profiles.display_name)}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
                              {post.profiles.display_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatTime(post.created_at)}
                            </Typography>
                            <Chip label={post.niches.name} size="small" variant="filled" />
                          </Stack>
                          {isOwn && (
                            <IconButton
                              size="small"
                              sx={{ mt: -0.5, color: 'text.secondary' }}
                              onClick={(e) => { setAnchorEl(e.currentTarget); setMenuPost(post.id); }}
                            >
                              <MoreHorizIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          )}
                        </Stack>

                        <Typography variant="body1" sx={{ mt: 1.5, color: 'text.primary', wordBreak: 'break-word' }}>
                          {post.content}
                        </Typography>

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

                        {/* Action bar */}
                        <Stack direction="row" spacing={0} sx={{ mt: 2, ml: -1 }}>
                          {/* Comments */}
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

                          {/* Likes */}
                          <Stack direction="row" alignItems="center" sx={{ ml: 2 }}>
                            <IconButton
                              size="small"
                              onClick={() => toggleLike(post.id)}
                              sx={{ color: isLiked ? 'error.main' : 'text.secondary', '&:hover': { color: 'error.main' } }}
                            >
                              {isLiked
                                ? <FavoriteIcon sx={{ fontSize: 17 }} />
                                : <FavoriteBorderIcon sx={{ fontSize: 17 }} />}
                            </IconButton>
                            <Typography
                              variant="caption"
                              sx={{ color: isLiked ? 'error.main' : 'text.secondary', minWidth: 16 }}
                            >
                              {post.like_count || 0}
                            </Typography>
                          </Stack>

                          {/* Bookmark */}
                          <Stack direction="row" alignItems="center" sx={{ ml: 2 }}>
                            <IconButton
                              size="small"
                              onClick={() => toggleBookmark(post.id)}
                              sx={{
                                color: isBookmarked ? 'primary.main' : 'text.secondary',
                                '&:hover': { color: 'primary.main' },
                              }}
                            >
                              {isBookmarked
                                ? <BookmarkIcon sx={{ fontSize: 17 }} />
                                : <BookmarkBorderIcon sx={{ fontSize: 17 }} />}
                            </IconButton>
                          </Stack>

                          {/* Share */}
                          <Stack direction="row" alignItems="center" sx={{ ml: 2 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleShare(post)}
                              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                            >
                              <ShareIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                            {post.share_count > 0 && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 16 }}>
                                {post.share_count}
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                  {idx < posts.length - 1 && <Divider />}
                </Box>
              );
            })
          )}
        </Container>
      </Box>

      {/* Context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleDelete(menuPost)} sx={{ color: 'error.main', fontSize: '0.9375rem' }}>
          Delete post
        </MenuItem>
      </Menu>

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

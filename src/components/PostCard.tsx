import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import LazyImage from './LazyImage';
import type { Post, Niche } from '../lib/supabase';

export type FeedPost = Post & {
  profiles: { display_name: string; avatar_url: string; username: string | null };
  niches: Niche;
};

type Props = {
  post: FeedPost;
  isLiked: boolean;
  isBookmarked: boolean;
  isOwn: boolean;
  showDivider: boolean;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onShare: (post: FeedPost) => void;
  onComment: (postId: string) => void;
  onMenu: (e: React.MouseEvent<HTMLElement>, postId: string) => void;
};

export function formatTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function getPostImages(post: FeedPost): string[] {
  if (post.image_urls && post.image_urls.length > 0) return post.image_urls;
  if (post.image_url) return [post.image_url];
  return [];
}

function PostCardBase({
  post,
  isLiked,
  isBookmarked,
  isOwn,
  showDivider,
  onLike,
  onBookmark,
  onShare,
  onComment,
  onMenu,
}: Props) {
  const navigate = useNavigate();
  const images = getPostImages(post);
  const profileLink = `/${post.profiles.username || post.profile_id}`;

  return (
    <Box>
      <Box sx={{ px: 4, pt: 3, pb: 2 }}>
        <Stack direction="row" spacing={3} alignItems="flex-start">
          <Avatar
            src={post.profiles.avatar_url || undefined}
            onClick={() => navigate(profileLink)}
            sx={{ width: 40, height: 40, fontSize: '0.875rem', flexShrink: 0, mt: 0.25, cursor: 'pointer' }}
          >
            {initials(post.profiles.display_name)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                <Typography
                  variant="subtitle1"
                  onClick={() => navigate(profileLink)}
                  sx={{ color: 'text.primary', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                >
                  {post.profiles.display_name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatTime(post.created_at)}
                </Typography>
                {post.updated_at && new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 5000 && (
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>· Edited</Typography>
                )}
                <Chip label={post.niches.name} size="small" variant="filled" />
              </Stack>
              {isOwn && (
                <IconButton
                  size="small"
                  sx={{ mt: -0.5, color: 'text.secondary' }}
                  onClick={(e) => onMenu(e, post.id)}
                >
                  <MoreHorizIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
            </Stack>

            <Typography variant="body1" sx={{ mt: 1.5, color: 'text.primary', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {post.content}
            </Typography>

            {images.length > 0 && (
              <Box sx={{ mt: 2, borderRadius: 2, overflow: 'hidden' }}>
                <ImageList cols={images.length > 1 ? 2 : 1} gap={4} sx={{ m: 0 }}>
                  {images.slice(0, 4).map((url, imgIdx) => (
                    <ImageListItem key={imgIdx}>
                      <LazyImage
                        src={url}
                        alt={`Post image ${imgIdx + 1}`}
                        height={images.length === 1 ? 280 : 160}
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
                  onClick={() => onComment(post.id)}
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
                  onClick={() => onLike(post.id)}
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
                  onClick={() => onBookmark(post.id)}
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
                  onClick={() => onShare(post)}
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
      {showDivider && <Divider />}
    </Box>
  );
}

const PostCard = memo(PostCardBase);
export default PostCard;

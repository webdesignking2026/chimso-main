import { useState, useEffect, useRef } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  profiles: {
    display_name: string;
    avatar_url: string;
    username: string | null;
  };
};

type Props = {
  postId: string | null;
  open: boolean;
  onClose: () => void;
  onCommentAdded: (postId: string) => void;
};

function formatTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function PostCommentDrawer({ postId, open, onClose, onCommentAdded }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && postId) {
      loadComments();
    } else {
      setComments([]);
      setText('');
    }
  }, [open, postId]);

  const loadComments = async () => {
    if (!postId) return;
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(display_name, avatar_url, username)')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });
    setComments((data ?? []) as Comment[]);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSubmit = async () => {
    if (!text.trim() || !user || !postId) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, profile_id: user.id, content: text.trim() })
      .select('*, profiles(display_name, avatar_url, username)')
      .single();
    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setText('');
      onCommentAdded(postId);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setSubmitting(false);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Comments
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Comments list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={20} thickness={2.5} />
          </Box>
        ) : comments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No comments yet. Be the first to comment!
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {comments.map((comment, idx) => (
              <Box key={comment.id}>
                <Stack direction="row" spacing={2}>
                  <Avatar
                    src={comment.profiles.avatar_url || undefined}
                    sx={{ width: 36, height: 36, fontSize: '0.75rem', flexShrink: 0 }}
                  >
                    {initials(comment.profiles.display_name)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {comment.profiles.display_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatTime(comment.created_at)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {comment.content}
                    </Typography>
                  </Box>
                </Stack>
                {idx < comments.length - 1 && <Divider sx={{ mt: 3 }} />}
              </Box>
            ))}
          </Stack>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Compose area */}
      <Box
        sx={{
          flexShrink: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
          pb: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-end">
          <Avatar
            src={profile?.avatar_url || undefined}
            sx={{ width: 36, height: 36, fontSize: '0.75rem', flexShrink: 0 }}
          >
            {profile?.display_name ? initials(profile.display_name) : '?'}
          </Avatar>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Write a comment…"
            variant="outlined"
            size="small"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            inputProps={{ maxLength: 500 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <IconButton
            color="primary"
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            sx={{ flexShrink: 0 }}
          >
            {submitting ? (
              <CircularProgress size={20} thickness={2.5} />
            ) : (
              <SendIcon />
            )}
          </IconButton>
        </Stack>
      </Box>
    </Drawer>
  );
}

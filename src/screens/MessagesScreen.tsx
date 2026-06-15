import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../lib/supabase';
import type { Conversation, ConversationParticipant, ConversationMessage, Profile } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

type ConversationWithDetails = Conversation & {
  participants: ConversationParticipant[];
  last_message?: ConversationMessage;
};

export default function MessagesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', user.id);

    if (!participations?.length) {
      setLoading(false);
      return;
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    const { data: conversationData } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (!conversationData) {
      setLoading(false);
      return;
    }

    // Get participants for each conversation
    const enriched = await Promise.all(
      conversationData.map(async (conv) => {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('*, profiles(display_name, avatar_url, username)')
          .eq('conversation_id', conv.id);

        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('*, profiles(display_name, avatar_url)')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          ...conv,
          participants: participants ?? [],
          last_message: messages?.[0],
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  };

  const getOtherParticipant = (conv: ConversationWithDetails): Profile | null => {
    const other = conv.participants.find((p) => p.profile_id !== user?.id);
    return other?.profiles as Profile | null;
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const filtered = conversations.filter((conv) => {
    if (!search) return true;
    const other = getOtherParticipant(conv);
    return other?.display_name.toLowerCase().includes(search.toLowerCase()) ||
           other?.username?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Messages
          </Typography>
        </Container>
        <Container maxWidth="sm" sx={{ pb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '9999px',
                bgcolor: 'grey.50',
                '& fieldset': { borderColor: 'divider' },
              },
            }}
          />
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={20} thickness={2.5} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              No messages yet
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Start a conversation from someone's profile.
            </Typography>
          </Box>
        ) : (
          filtered.map((conv, idx) => {
            const other = getOtherParticipant(conv);
            if (!other) return null;
            const lastMessage = conv.last_message;
            const isUnread = !lastMessage?.read_by.includes(user?.id || '');
            const senderName = lastMessage?.profiles as { display_name: string } | undefined;
            const isOwnMessage = lastMessage?.sender_id === user?.id;

            return (
              <Box key={conv.id}>
                <Box
                  onClick={() => navigate(`/messages/${conv.id}`)}
                  sx={{
                    py: 3,
                    mx: -3,
                    px: 3,
                    cursor: 'pointer',
                    bgcolor: isUnread ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" spacing={2}>
                    <Avatar src={other.avatar_url || undefined} sx={{ width: 48, height: 48 }}>
                      {initials(other.display_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="subtitle1" sx={{ fontWeight: isUnread ? 600 : 500 }}>
                          {other.display_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {lastMessage ? formatTime(lastMessage.created_at) : formatTime(conv.created_at)}
                        </Typography>
                      </Stack>
                      {lastMessage && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                            mt: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: isUnread ? 500 : 400,
                          }}
                        >
                          {isOwnMessage ? 'You: ' : `${senderName?.display_name}: `}
                          {lastMessage.content}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Box>
                {idx < filtered.length - 1 && <Divider />}
              </Box>
            );
          })
        )}
      </Container>
    </MainLayout>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { supabase } from '../lib/supabase';
import type { Conversation, ConversationParticipant, ConversationMessage, Profile } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';
import { ConversationListSkeleton } from '../components/Skeletons';

type ConversationWithDetails = Conversation & {
  participants: ConversationParticipant[];
  last_message?: ConversationMessage;
};

const PAGE_SIZE = 30;

export default function MessagesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadConversations = useCallback(async () => {
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

    // Fetch conversations and ALL participants in parallel (2 queries instead of N+1)
    const [{ data: conversationData }, { data: allParticipants }] = await Promise.all([
      supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false })
        .limit(PAGE_SIZE),
      supabase
        .from('conversation_participants')
        .select('*, profiles(display_name, avatar_url, username)')
        .in('conversation_id', conversationIds),
    ]);

    if (!conversationData) {
      setLoading(false);
      return;
    }

    // Group participants by conversation
    const participantsByConv = new Map<string, ConversationParticipant[]>();
    for (const p of allParticipants ?? []) {
      const arr = participantsByConv.get(p.conversation_id) ?? [];
      arr.push(p);
      participantsByConv.set(p.conversation_id, arr);
    }

    // Fetch last message for each conversation in a single batch query
    const { data: recentMessages } = await supabase
      .from('conversation_messages')
      .select('id, conversation_id, sender_id, content, created_at, read_by, profiles(display_name, avatar_url)')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(conversationIds.length * 3);

    // Keep only the latest message per conversation
    const lastMessageByConv = new Map<string, ConversationMessage>();
    for (const msg of recentMessages ?? []) {
      if (!lastMessageByConv.has(msg.conversation_id)) {
        lastMessageByConv.set(msg.conversation_id, msg as unknown as ConversationMessage);
      }
    }

    const enriched: ConversationWithDetails[] = conversationData.map((conv) => ({
      ...conv,
      participants: participantsByConv.get(conv.id) ?? [],
      last_message: lastMessageByConv.get(conv.id),
    }));

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user, loadConversations]);

  const getOtherParticipant = useCallback((conv: ConversationWithDetails): Profile | null => {
    const other = conv.participants.find((p) => p.profile_id !== user?.id);
    return other?.profiles as Profile | null;
  }, [user]);

  const formatTime = useCallback((ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const initials = useCallback((name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(), []);

  const filtered = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((conv) => {
      const other = getOtherParticipant(conv);
      return other?.display_name.toLowerCase().includes(q) ||
             other?.username?.toLowerCase().includes(q);
    });
  }, [conversations, search, getOtherParticipant]);

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
          <ConversationListSkeleton />
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
            const readBy = lastMessage?.read_by ?? [];
            const isUnread = !readBy.includes(user?.id || '');
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

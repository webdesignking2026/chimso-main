import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { supabase } from '../lib/supabase';
import type { ConversationMessage, ConversationParticipant, Profile } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

export default function ConversationScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    loadConversation();

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${id}`,
        },
        () => loadConversation()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    if (!id || !user) return;

    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('*, profiles(display_name, avatar_url, username)')
      .eq('conversation_id', id);

    setParticipants(participantData ?? []);

    const { data: messageData } = await supabase
      .from('conversation_messages')
      .select('*, profiles(display_name, avatar_url)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    setMessages(messageData ?? []);

    // Mark as read
    if (messageData && messageData.length > 0) {
      const lastMessage = messageData[messageData.length - 1];
      if (!lastMessage.read_by.includes(user.id)) {
        await supabase
          .from('conversation_messages')
          .update({ read_by: [...lastMessage.read_by, user.id] })
          .eq('id', lastMessage.id);
      }
    }

    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!message.trim() || !id || !user || sending) return;
    setSending(true);

    await supabase.from('conversation_messages').insert({
      conversation_id: id,
      sender_id: user.id,
      content: message.trim(),
      read_by: [user.id],
    });

    setMessage('');
    setSending(false);
    await loadConversation();
  };

  const getOtherParticipant = (): Profile | null => {
    const other = participants.find((p) => p.profile_id !== user?.id);
    return other?.profiles as Profile | null;
  };

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const other = getOtherParticipant();

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress size={20} thickness={2.5} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => navigate('/messages')}>
              <ArrowBackIcon />
            </IconButton>
            <Avatar src={other?.avatar_url || undefined} sx={{ width: 36, height: 36 }}>
              {other ? initials(other.display_name) : '?'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {other?.display_name || 'Conversation'}
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Messages */}
      <Container maxWidth="sm" sx={{ py: 2, flex: 1, overflowY: 'auto' }}>
        <Stack spacing={2}>
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const sender = msg.profiles as { display_name: string; avatar_url: string } | undefined;

            return (
              <Stack
                key={msg.id}
                direction={isOwn ? 'row-reverse' : 'row'}
                alignItems="flex-end"
                spacing={1}
              >
                {!isOwn && (
                  <Avatar src={sender?.avatar_url || undefined} sx={{ width: 28, height: 28 }}>
                    {sender ? initials(sender.display_name) : '?'}
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '75%',
                    p: 2,
                    borderRadius: 3,
                    bgcolor: isOwn ? 'primary.main' : 'grey.100',
                    color: isOwn ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="body1">{msg.content}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isOwn ? 'rgba(255,255,255,0.7)' : 'text.disabled',
                      display: 'block',
                      mt: 0.5,
                      textAlign: isOwn ? 'right' : 'left',
                    }}
                  >
                    {formatTime(msg.created_at)}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
          <div ref={messagesEndRef} />
        </Stack>
      </Container>

      {/* Input */}
      <Box sx={{ position: 'fixed', bottom: 64, left: 0, right: 0, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="sm" sx={{ py: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              multiline
              maxRows={4}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '9999px',
                  '& fieldset': { borderColor: 'divider' },
                },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!message.trim() || sending}
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'grey.200' },
              }}
            >
              {sending ? (
                <CircularProgress size={18} thickness={2.5} sx={{ color: 'white' }} />
              ) : (
                <SendIcon sx={{ color: 'white' }} />
              )}
            </IconButton>
          </Stack>
        </Container>
      </Box>
    </MainLayout>
  );
}

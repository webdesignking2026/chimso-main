import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import { supabase } from '../lib/supabase';
import type { Community } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';
import { ListSkeleton } from '../components/Skeletons';

type CommunityWithMembership = Community & {
  is_member?: boolean;
  user_role?: string;
};

const DISCOVER_LIMIT = 50;

export default function CommunitiesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'joined'>('discover');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [joinedCommunities, setJoinedCommunities] = useState<CommunityWithMembership[]>([]);
  const [discoverCommunities, setDiscoverCommunities] = useState<CommunityWithMembership[]>([]);
  const [joining, setJoining] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch memberships and communities in parallel
    const [{ data: memberships }, { data: allCommunities }] = await Promise.all([
      supabase
        .from('community_members')
        .select('community_id, role')
        .eq('profile_id', user.id),
      supabase
        .from('communities')
        .select('id, name, slug, description, icon_url, cover_url, creator_id, is_private, rules, member_count, created_at, updated_at')
        .or('is_private.eq.false,creator_id.eq.' + user.id)
        .order('member_count', { ascending: false })
        .limit(DISCOVER_LIMIT),
    ]);

    const memberCommunityIds = new Set((memberships ?? []).map((m) => m.community_id));
    const roleMap = new Map((memberships ?? []).map((m) => [m.community_id, m.role]));

    if (allCommunities) {
      const enriched = allCommunities.map((c) => ({
        ...c,
        is_member: memberCommunityIds.has(c.id),
        user_role: roleMap.get(c.id),
      }));
      setJoinedCommunities(enriched.filter((c) => c.is_member));
      setDiscoverCommunities(enriched.filter((c) => !c.is_member));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoin = useCallback(async (communityId: string) => {
    if (!user) return;
    setJoining(communityId);
    // Optimistic: move from discover to joined
    setDiscoverCommunities((prev) => prev.filter((c) => c.id !== communityId));
    setJoinedCommunities((prev) => {
      const community = discoverCommunities.find((c) => c.id === communityId);
      return community ? [{ ...community, is_member: true }, ...prev] : prev;
    });

    const { error } = await supabase.from('community_members').insert({
      community_id: communityId,
      profile_id: user.id,
      role: 'member',
    });
    if (error) {
      // Revert
      await loadData();
    }
    setJoining('');
  }, [user, discoverCommunities, loadData]);

  const handleLeave = useCallback(async (communityId: string) => {
    if (!user) return;
    setJoining(communityId);
    // Optimistic: move from joined to discover
    setJoinedCommunities((prev) => prev.filter((c) => c.id !== communityId));
    setDiscoverCommunities((prev) => {
      const community = joinedCommunities.find((c) => c.id === communityId);
      return community ? [{ ...community, is_member: false }, ...prev] : prev;
    });

    const { error } = await supabase.from('community_members').delete().match({
      community_id: communityId,
      profile_id: user.id,
    });
    if (error) {
      await loadData();
    }
    setJoining('');
  }, [user, joinedCommunities, loadData]);

  const filteredCommunities = useMemo(() => {
    const source = activeTab === 'joined' ? joinedCommunities : discoverCommunities;
    if (!search) return source;
    const q = search.toLowerCase();
    return source.filter((c) => c.name.toLowerCase().includes(q));
  }, [activeTab, joinedCommunities, discoverCommunities, search]);

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Communities
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => navigate('/communities/create')}
              sx={{ px: 3 }}
            >
              Create
            </Button>
          </Stack>
        </Container>

        {/* Tabs */}
        <Container maxWidth="sm" sx={{ pb: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Chip
              label="Discover"
              onClick={() => setActiveTab('discover')}
              variant={activeTab === 'discover' ? 'filled' : 'outlined'}
            />
            <Chip
              label={`Joined (${joinedCommunities.length})`}
              onClick={() => setActiveTab('joined')}
              variant={activeTab === 'joined' ? 'filled' : 'outlined'}
            />
          </Stack>
        </Container>

        {/* Search */}
        <Container maxWidth="sm" sx={{ pb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={activeTab === 'joined' ? 'Search your communities...' : 'Search communities...'}
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
      <Container maxWidth="sm" sx={{ py: 3 }}>
        {loading ? (
          <ListSkeleton count={5} />
        ) : filteredCommunities.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h3" sx={{ mb: 2, color: 'text.primary' }}>
              {activeTab === 'joined' ? 'No communities yet' : 'No communities found'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
              {activeTab === 'joined'
                ? 'Join communities to see them here.'
                : 'Create a community to get started.'}
            </Typography>
            {activeTab === 'joined' && (
              <Button variant="contained" onClick={() => setActiveTab('discover')}>
                Discover communities
              </Button>
            )}
          </Box>
        ) : (
          <Stack spacing={2}>
            {filteredCommunities.map((community, idx) => (
              <Box key={community.id}>
                <Box
                  onClick={() => navigate(`/communities/${community.slug}`)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 2.5,
                    px: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'border-color 150ms',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Avatar
                    src={community.icon_url || undefined}
                    sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: '1.25rem' }}
                  >
                    {community.name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {community.name}
                      </Typography>
                      {community.is_private && (
                        <LockIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      )}
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {community.member_count} members
                    </Typography>
                  </Box>
                  <Button
                    variant={community.is_member ? 'outlined' : 'contained'}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (community.is_member) {
                        handleLeave(community.id);
                      } else {
                        handleJoin(community.id);
                      }
                    }}
                    disabled={joining === community.id}
                    sx={{ px: 3 }}
                  >
                    {joining === community.id ? (
                      <CircularProgress size={14} thickness={3} />
                    ) : community.is_member ? (
                      'Joined'
                    ) : (
                      'Join'
                    )}
                  </Button>
                </Box>
                {idx < filteredCommunities.length - 1 && <Divider sx={{ my: 1 }} />}
              </Box>
            ))}
          </Stack>
        )}
      </Container>
    </MainLayout>
  );
}

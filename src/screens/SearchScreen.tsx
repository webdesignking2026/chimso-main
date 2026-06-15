import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import ArticleIcon from '@mui/icons-material/Article';
import { supabase } from '../lib/supabase';
import type { Profile, Community, Post } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

type SearchResult = {
  profiles: Profile[];
  communities: Community[];
  posts: Post[];
};

export default function SearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>({ profiles: [], communities: [], posts: [] });
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);

  useEffect(() => {
    // Load trending communities
    supabase
      .from('communities')
      .select('*')
      .eq('is_private', false)
      .order('member_count', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTrendingCommunities(data ?? []);
      });
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ profiles: [], communities: [], posts: [] });
      return;
    }

    const searchTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const [profilesRes, communitiesRes, postsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(10),
          supabase
            .from('communities')
            .select('*')
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .eq('is_private', false)
            .limit(10),
          supabase
            .from('posts')
            .select('*, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(name)')
            .ilike('content', `%${query}%`)
            .limit(20),
        ]);

        setResults({
          profiles: profilesRes.data ?? [],
          communities: communitiesRes.data ?? [],
          posts: postsRes.data ?? [],
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query]);

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <MainLayout>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <TextField
            fullWidth
            placeholder="Search users, communities, posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading ? (
                    <CircularProgress size={18} thickness={2.5} />
                  ) : (
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '9999px',
                bgcolor: 'grey.50',
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'grey.300' },
              },
            }}
          />
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {query.trim() ? (
          <Box>
            {/* Profiles */}
            {results.profiles.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    People
                  </Typography>
                </Stack>
                {results.profiles.map((profile) => (
                  <Box
                    key={profile.id}
                    onClick={() => navigate(`/${profile.username || profile.id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 2,
                      px: 2,
                      mx: -2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Avatar src={profile.avatar_url || undefined} sx={{ width: 40, height: 40 }}>
                      {initials(profile.display_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {profile.display_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        @{profile.username || 'user'}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Communities */}
            {results.communities.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <GroupsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    Communities
                  </Typography>
                </Stack>
                {results.communities.map((community) => (
                  <Box
                    key={community.id}
                    onClick={() => navigate(`/communities/${community.slug}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 2,
                      px: 2,
                      mx: -2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {community.name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {community.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {community.member_count} members
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Posts */}
            {results.posts.length > 0 && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <ArticleIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    Posts
                  </Typography>
                </Stack>
                {results.posts.map((post) => (
                  <Box key={post.id} sx={{ py: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body1">{post.content}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                      by {post.profiles?.display_name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* No results */}
            {results.profiles.length === 0 && results.communities.length === 0 && results.posts.length === 0 && !loading && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  No results found for "{query}"
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            {/* Trending Communities */}
            <Box sx={{ mb: 6 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <TrendingUpIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="h5">Trending Communities</Typography>
              </Stack>
              <Stack spacing={2}>
                {trendingCommunities.map((community) => (
                  <Box
                    key={community.id}
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
                    <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.main', fontSize: '1.25rem' }}>
                      {community.name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {community.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {community.member_count} members
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Quick Links */}
            <Box>
              <Typography variant="h5" sx={{ mb: 3 }}>
                Explore
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Chip label="faith" onClick={() => setQuery('faith')} />
                <Chip label="tech" onClick={() => setQuery('tech')} />
                <Chip label="wellness" onClick={() => setQuery('wellness')} />
                <Chip label="entrepreneurship" onClick={() => setQuery('entrepreneurship')} />
                <Chip label="community" onClick={() => setQuery('community')} />
              </Stack>
            </Box>
          </Box>
        )}
      </Container>
    </MainLayout>
  );
}

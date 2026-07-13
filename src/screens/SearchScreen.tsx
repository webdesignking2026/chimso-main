import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { ListSkeleton } from '../components/Skeletons';

type SearchResult = {
  profiles: Profile[];
  communities: Community[];
  posts: Post[];
};

const EMPTY_RESULTS: SearchResult = { profiles: [], communities: [], posts: [] };

// Columns selected for each table (only what the UI needs)
const PROFILE_COLUMNS = 'id, display_name, avatar_url, username';
const COMMUNITY_COLUMNS = 'id, name, slug, description, icon_url, member_count, is_private';
const POST_COLUMNS =
  'id, content, created_at, profiles!posts_profile_id_fkey(display_name, avatar_url, username), niches(name)';

// Sanitize a user query for safe interpolation into a PostgREST .or() filter
// string. Strips characters that have structural meaning in PostgREST filters
// (commas separate clauses, parentheses group, dots separate column.operator),
// and escapes the rest so the value cannot break out of the ilike argument.
function sanitizeForOrFilter(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\./g, ' ')
    .trim();
}

export default function SearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult>(EMPTY_RESULTS);
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);

  useEffect(() => {
    // Load trending communities (only the columns the UI renders)
    supabase
      .from('communities')
      .select(COMMUNITY_COLUMNS)
      .eq('is_private', false)
      .order('member_count', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTrendingCommunities((data as Community[]) ?? []);
      });
  }, []);

  // Memoize the search callback so it keeps a stable identity across renders
  // (e.g. while the user types) and only depends on the current query value.
  const runSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const safe = sanitizeForOrFilter(searchQuery);
      const pattern = `%${safe}%`;

      // Use sanitized text inside .or() and combine with .ilike() for the
      // single-column posts filter. Each .or() clause is built from sanitized
      // text so a malicious query cannot inject additional filter clauses.
      const [profilesRes, communitiesRes, postsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .limit(10),
        supabase
          .from('communities')
          .select(COMMUNITY_COLUMNS)
          .or(`name.ilike.${pattern},description.ilike.${pattern}`)
          .eq('is_private', false)
          .limit(10),
        supabase
          .from('posts')
          .select(POST_COLUMNS)
          .ilike('content', `%${searchQuery}%`)
          .limit(20),
      ]);

      setResults({
        profiles: (profilesRes.data as Profile[]) ?? [],
        communities: (communitiesRes.data as Community[]) ?? [],
        posts: (postsRes.data as unknown as Post[]) ?? [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(EMPTY_RESULTS);
      return;
    }

    const searchTimer = setTimeout(() => {
      runSearch(query);
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query, runSearch]);

  // Memoize trending communities so re-renders during search typing don't
  // recompute the derived list.
  const trending = useMemo(() => trendingCommunities, [trendingCommunities]);

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
            {/* Loading skeleton while fetching results */}
            {loading &&
              results.profiles.length === 0 &&
              results.communities.length === 0 &&
              results.posts.length === 0 && <ListSkeleton count={6} />}

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
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1, cursor: 'pointer' }}
                      onClick={() => navigate(`/${post.profiles?.username || post.profile_id}`)}>
                      <Avatar src={post.profiles?.avatar_url || undefined} sx={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                        {post.profiles?.display_name ? initials(post.profiles.display_name) : '?'}
                      </Avatar>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}>
                        {post.profiles?.display_name}
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}
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
                {trending.length === 0 ? (
                  <ListSkeleton count={5} />
                ) : (
                  trending.map((community) => (
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
                  ))
                )}
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

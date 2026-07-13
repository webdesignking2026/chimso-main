import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export function FeedSkeleton() {
  return (
    <Stack spacing={0}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box key={i} sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Stack spacing={0.5}>
              <Skeleton variant="text" width={120} height={20} />
              <Skeleton variant="text" width={60} height={14} />
            </Stack>
          </Stack>
          <Skeleton variant="text" width="90%" height={20} />
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="rectangular" sx={{ mt: 2, borderRadius: 2 }} height={200} />
          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="text" width={60} height={24} />
            <Skeleton variant="text" width={60} height={24} />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Stack spacing={0}>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={48} height={48} />
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="40%" height={16} />
            </Stack>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

export function DetailSkeleton() {
  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Skeleton variant="circular" width={56} height={56} />
        <Stack spacing={0.5}>
          <Skeleton variant="text" width={140} height={24} />
          <Skeleton variant="text" width={80} height={16} />
        </Stack>
      </Stack>
      <Skeleton variant="text" width="95%" height={20} />
      <Skeleton variant="text" width="80%" height={20} />
      <Skeleton variant="rectangular" sx={{ borderRadius: 2 }} height={240} />
      <Stack direction="row" spacing={3}>
        <Skeleton variant="text" width={70} height={28} />
        <Skeleton variant="text" width={70} height={28} />
        <Skeleton variant="text" width={70} height={28} />
      </Stack>
    </Stack>
  );
}

export function ConversationListSkeleton() {
  return (
    <Stack spacing={0}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={48} height={48} />
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" height={18} />
              <Skeleton variant="text" width="70%" height={14} />
            </Stack>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { supabase } from '../lib/supabase';
import type { LearningTrack, LearningLesson, Profile } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

type LessonWithProgress = LearningLesson & {
  completed?: boolean;
};

export default function LearningTrackScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [track, setTrack] = useState<LearningTrack | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [lessons, setLessons] = useState<LessonWithProgress[]>([]);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrack();
  }, [id, user]);

  const loadTrack = async () => {
    if (!id || !user) return;

    const { data: trackData } = await supabase
      .from('learning_tracks')
      .select('*, profiles(display_name, avatar_url, username)')
      .eq('id', id)
      .maybeSingle();

    if (!trackData) {
      setTrack(null);
      setLoading(false);
      return;
    }

    setTrack(trackData as LearningTrack);
    setCreator(trackData.profiles as Profile);

    // Get lessons
    const { data: lessonsData } = await supabase
      .from('learning_lessons')
      .select('*')
      .eq('track_id', id)
      .order('order_index', { ascending: true });

    // Get progress
    const { data: progressData } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('profile_id', user.id);

    const progressMap = new Map((progressData ?? []).map((p) => [p.lesson_id, p.completed]));

    const enriched = (lessonsData ?? []).map((l) => ({
      ...l,
      completed: progressMap.get(l.id) || false,
    }));

    setLessons(enriched);
    setLoading(false);
  };

  const handleCompleteLesson = async (lessonId: string, completed: boolean) => {
    if (!user) return;

    if (completed) {
      // Unmark as complete
      await supabase.from('learning_progress').delete().match({
        profile_id: user.id,
        lesson_id: lessonId,
      });
    } else {
      // Mark as complete
      await supabase.from('learning_progress').upsert({
        profile_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      });
    }

    await loadTrack();
  };

  const completedCount = lessons.filter((l) => l.completed).length;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <MainLayout>
        <LinearProgress />
      </MainLayout>
    );
  }

  if (!track) {
    return (
      <MainLayout>
        <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h3">Track not found</Typography>
          <Button sx={{ mt: 4 }} onClick={() => navigate('/learn')}>
            Back to learning
          </Button>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 100 }}>
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {track.title}
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Track Info */}
          <Box>
            {track.cover_url && (
              <Box
                component="img"
                src={track.cover_url}
                alt={track.title}
                sx={{ width: '100%', height: 180, borderRadius: 2, objectFit: 'cover', mb: 3 }}
              />
            )}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Chip size="small" label={track.track_type} />
              <Chip size="small" label={track.difficulty} color={track.difficulty === 'beginner' ? 'success' : track.difficulty === 'intermediate' ? 'warning' : 'error'} />
            </Stack>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {track.description || 'No description provided.'}
            </Typography>
          </Box>

          {/* Progress */}
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Progress
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {completedCount} / {lessons.length} lessons
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Creator */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={creator?.avatar_url || undefined}>
              {creator ? initials(creator.display_name) : '?'}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Created by {creator?.display_name || 'Unknown'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {track.estimated_minutes} min total
              </Typography>
            </Box>
          </Stack>

          <Divider />

          {/* Lessons */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Lessons
            </Typography>
            <Stack spacing={2}>
              {lessons.map((lesson, idx) => (
                <Box
                  key={lesson.id}
                  onClick={() => setCurrentLesson(currentLesson === lesson.id ? null : lesson.id)}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: currentLesson === lesson.id ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    transition: 'border-color 150ms',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box
                      onClick={() => handleCompleteLesson(lesson.id, lesson.completed || false)}
                      sx={{ mt: 0.5 }}
                    >
                      {lesson.completed ? (
                        <CheckCircleIcon sx={{ fontSize: 24, color: 'success.main' }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          Lesson {idx + 1}
                        </Typography>
                        {lesson.video_url && (
                          <PlayCircleOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        )}
                      </Stack>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {lesson.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {lesson.duration_minutes} min
                      </Typography>

                      {/* Expanded content */}
                      {currentLesson === lesson.id && (
                        <Box sx={{ mt: 2 }}>
                          {lesson.video_url && (
                            <Box
                              component="iframe"
                              src={lesson.video_url}
                              sx={{ width: '100%', height: 200, borderRadius: 1, mb: 2 }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )}
                          {lesson.content && (
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                              {lesson.content}
                            </Typography>
                          )}
                          <Button
                            variant={lesson.completed ? 'outlined' : 'contained'}
                            onClick={() => handleCompleteLesson(lesson.id, lesson.completed || false)}
                            sx={{ mt: 2 }}
                          >
                            {lesson.completed ? 'Mark as incomplete' : 'Mark as complete'}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </MainLayout>
  );
}

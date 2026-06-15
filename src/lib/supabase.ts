import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// CORE TYPES
// ============================================================================

export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  onboarding_complete: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  reputation_points: number;
  created_at: string;
  updated_at: string;
};

export type Niche = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  created_at: string;
};

export type Post = {
  id: string;
  profile_id: string;
  niche_id: string;
  community_id: string | null;
  content: string;
  image_url: string;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  niches?: Niche;
  communities?: Community;
};

// ============================================================================
// COMMUNITIES
// ============================================================================

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string;
  cover_url: string;
  creator_id: string;
  is_private: boolean;
  rules: string[];
  member_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type CommunityMember = {
  community_id: string;
  profile_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  profiles?: Profile;
  communities?: Community;
};

export type PinnedPost = {
  community_id: string;
  post_id: string;
  pinned_by: string;
  pinned_at: string;
  posts?: Post;
};

// ============================================================================
// SOCIAL FEATURES
// ============================================================================

export type Comment = {
  id: string;
  post_id: string;
  profile_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type Like = {
  id: string;
  profile_id: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
};

export type Bookmark = {
  profile_id: string;
  post_id: string;
  created_at: string;
  posts?: Post;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

// ============================================================================
// MESSAGING
// ============================================================================

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
};

export type ConversationParticipant = {
  conversation_id: string;
  profile_id: string;
  last_read_at: string | null;
  profiles?: Profile;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_by: string[];
  created_at: string;
  profiles?: Profile;
};

// ============================================================================
// EVENTS
// ============================================================================

export type Event = {
  id: string;
  community_id: string | null;
  creator_id: string;
  title: string;
  description: string;
  event_type: 'online' | 'physical' | 'hybrid';
  location: string;
  starts_at: string;
  ends_at: string | null;
  max_attendees: number | null;
  image_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  communities?: Community;
};

export type EventAttendee = {
  event_id: string;
  profile_id: string;
  status: 'going' | 'interested' | 'not_going';
  created_at: string;
  profiles?: Profile;
};

// ============================================================================
// LEARNING
// ============================================================================

export type LearningTrack = {
  id: string;
  community_id: string | null;
  creator_id: string;
  title: string;
  description: string;
  track_type: 'course' | 'guide' | 'article' | 'resource';
  cover_url: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_minutes: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  communities?: Community;
};

export type LearningLesson = {
  id: string;
  track_id: string;
  order_index: number;
  title: string;
  content: string;
  video_url: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
};

export type LearningProgress = {
  profile_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export type Notification = {
  id: string;
  profile_id: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'community_invite' | 'event_reminder' | 'announcement';
  actor_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  profiles?: Profile;
};

// ============================================================================
// REPUTATION & BADGES
// ============================================================================

export type ReputationEvent = {
  id: string;
  profile_id: string;
  event_type: string;
  points: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number | null;
  created_at: string;
};

export type ProfileBadge = {
  profile_id: string;
  badge_id: string;
  earned_at: string;
  badges?: Badge;
};

// ============================================================================
// MODERATION
// ============================================================================

export type Report = {
  id: string;
  reporter_id: string;
  reported_type: 'post' | 'comment' | 'profile' | 'community' | 'event';
  reported_id: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  created_at: string;
};

// ============================================================================
// HELPER TYPES FOR RELATIONS
// ============================================================================

export type PostWithRelations = Post & {
  profiles: Profile;
  niches: Niche;
  communities: Community | null;
  likes?: Like[];
  comments?: Comment[];
};

export type CommunityWithRelations = Community & {
  profiles: Profile;
  member_count: number;
  is_member?: boolean;
  user_role?: 'member' | 'moderator' | 'admin';
};

export type ConversationWithRelations = Conversation & {
  participants: ConversationParticipant[];
  last_message?: ConversationMessage;
};

export type ProfileWithRelations = Profile & {
  badges?: ProfileBadge[];
  followers?: Follow[];
  following?: Follow[];
};

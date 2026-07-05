import { useState, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../lib/supabase';

type Props = {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updatedPost: Partial<Post>) => void;
};

export default function EditPostDialog({ post, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when dialog opens with a new post
  const prevPostId = useRef<string | null>(null);
  if (post && post.id !== prevPostId.current) {
    prevPostId.current = post.id;
    const imgs: string[] = post.image_urls?.length > 0 ? [...post.image_urls] : post.image_url ? [post.image_url] : [];
    // Only update if different to avoid re-render loops
    if (content !== post.content) setContent(post.content);
    if (JSON.stringify(imgs) !== JSON.stringify(images)) setImages(imgs);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (images.length + uploadedUrls.length >= 4) break;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('post-images').upload(fileName, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }

    setImages(prev => [...prev, ...uploadedUrls].slice(0, 4));
    setUploadingImages(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!post || !content.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from('posts')
      .update({
        content: content.trim(),
        image_urls: images,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id);

    if (!error) {
      onSaved({ id: post.id, content: content.trim(), image_urls: images, updated_at: new Date().toISOString() });
      onClose();
    }
    setSaving(false);
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Edit Post</Typography>
        <IconButton onClick={handleClose} size="small" disabled={saving}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your heart today?"
          variant="standard"
          inputProps={{ maxLength: 500 }}
          sx={{
            '& .MuiInput-underline:before': { borderBottom: 'none !important' },
            '& .MuiInput-underline:after': { borderBottom: 'none !important' },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none !important' },
            '& .MuiInputBase-input': { fontSize: '1rem', lineHeight: 1.6 },
          }}
        />

        {/* Image previews */}
        {images.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <ImageList cols={images.length > 1 ? 2 : 1} gap={8} sx={{ m: 0 }}>
              {images.map((url, idx) => (
                <ImageListItem key={idx} sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={url}
                    alt={`Image ${idx + 1}`}
                    sx={{
                      width: '100%',
                      height: images.length === 1 ? 200 : 120,
                      objectFit: 'cover',
                      borderRadius: 2,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeImage(idx)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                      width: 24,
                      height: 24,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14, color: 'white' }} />
                  </IconButton>
                </ImageListItem>
              ))}
            </ImageList>
          </Box>
        )}

        {/* Character count and image button */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages || images.length >= 4}
              sx={{ color: 'text.secondary' }}
            >
              {uploadingImages ? (
                <CircularProgress size={18} thickness={2.5} />
              ) : (
                <ImageIcon fontSize="small" />
              )}
            </IconButton>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {images.length}/4 images
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: content.length > 450 ? 'warning.main' : 'text.secondary' }}>
            {content.length}/500
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!content.trim() || saving}
        >
          {saving ? <CircularProgress size={16} thickness={3} sx={{ color: 'white' }} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

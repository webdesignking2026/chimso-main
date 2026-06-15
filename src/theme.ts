import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0F3D91',
      light: '#EAF1FF',
      dark: '#0C3279',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748B',
      light: '#F8FAFC',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    divider: '#E5E7EB',
    action: {
      hover: 'rgba(15, 61, 145, 0.04)',
      selected: '#EAF1FF',
      focus: 'rgba(15, 61, 145, 0.08)',
      active: '#0F3D91',
    },
    grey: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif',
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.3, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
    h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
    h6: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.5 },
    subtitle1: { fontWeight: 500, fontSize: '0.9375rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
    body1: { fontWeight: 400, fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.6 },
    button: { fontWeight: 600, fontSize: '0.9375rem', textTransform: 'none', letterSpacing: 0 },
    caption: { fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.5 },
    overline: { fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.5 },
  },
  shape: { borderRadius: 16 },
  spacing: 4,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': { boxSizing: 'border-box' },
        body: { backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif' },
        'input, textarea': { fontFamily: 'inherit' },
        '::-webkit-scrollbar': { display: 'none' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9375rem',
          borderRadius: '9999px',
          padding: `${theme.spacing(3)} ${theme.spacing(6)}`,
          transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          letterSpacing: 0,
        }),
        contained: {
          backgroundColor: '#0F3D91',
          color: '#ffffff',
          '&:hover': { backgroundColor: '#0C3279' },
          '&.Mui-disabled': { backgroundColor: '#E5E7EB', color: '#94A3B8' },
        },
        outlined: {
          borderColor: '#E5E7EB',
          color: '#0F172A',
          '&:hover': { borderColor: '#CBD5E1', backgroundColor: 'rgba(15, 61, 145, 0.04)' },
        },
        text: {
          color: '#0F3D91',
          '&:hover': { backgroundColor: 'rgba(15, 61, 145, 0.04)' },
        },
        sizeSmall: ({ theme }) => ({
          padding: `${theme.spacing(2)} ${theme.spacing(4)}`,
          fontSize: '0.875rem',
        }),
        sizeLarge: ({ theme }) => ({
          padding: `${theme.spacing(4)} ${theme.spacing(6)}`,
          fontSize: '1rem',
        }),
      },
    },
    MuiIconButton: {
      defaultProps: { disableRipple: false },
      styleOverrides: {
        root: {
          color: '#64748B',
          borderRadius: '9999px',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { backgroundColor: 'rgba(15, 61, 145, 0.06)', color: '#0F3D91' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            fontSize: '0.9375rem',
            backgroundColor: '#FFFFFF',
            '& fieldset': { borderColor: '#E5E7EB', transition: 'border-color 150ms' },
            '&:hover fieldset': { borderColor: '#CBD5E1' },
            '&.Mui-focused fieldset': { borderColor: '#0F3D91', borderWidth: '1px' },
          },
          '& .MuiInputLabel-root': { color: '#64748B', fontSize: '0.9375rem' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#0F3D91' },
          '& .MuiInputBase-input::placeholder': { color: '#94A3B8', opacity: 1 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 500,
          fontSize: '0.8125rem',
          height: 28,
          border: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { backgroundColor: '#F1F5F9' },
        },
        filled: {
          backgroundColor: '#EAF1FF',
          color: '#0F3D91',
          border: '1px solid #EAF1FF',
          fontWeight: 600,
          '&:hover': { backgroundColor: '#D6E4FF' },
        },
        outlined: {
          backgroundColor: '#FFFFFF',
          borderColor: '#E5E7EB',
        },
        sizeSmall: { height: 24, fontSize: '0.75rem' },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          backgroundColor: '#0F3D91',
          color: '#ffffff',
          fontSize: '0.875rem',
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#E5E7EB' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { backgroundColor: 'rgba(15, 61, 145, 0.04)' },
          '&.Mui-selected': { backgroundColor: '#EAF1FF', '&:hover': { backgroundColor: '#EAF1FF' } },
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: { size: 18, thickness: 2.5 },
      styleOverrides: { root: { color: '#0F3D91' } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 2, borderRadius: 0, backgroundColor: '#E5E7EB' },
        bar: { backgroundColor: '#0F3D91', borderRadius: 0 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: '1px solid #E5E7EB', minHeight: 44 },
        indicator: { backgroundColor: '#0F3D91', height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          color: '#64748B',
          minHeight: 44,
          padding: '0 16px',
          letterSpacing: 0,
          '&.Mui-selected': { color: '#0F172A', fontWeight: 600 },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          '&:hover': { backgroundColor: 'rgba(15, 61, 145, 0.04)' },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: { root: { '& .MuiSnackbarContent-root': { borderRadius: '12px' } } },
    },
  },
});

export default theme;

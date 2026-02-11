import { createTheme } from '@mui/material/styles';
import { tokens } from './tokens';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0B5FFF',
      dark: '#083FAF',
      light: '#5B8CFF',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#0A8A6D',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F6F8FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0E1116',
      secondary: '#546071',
    },
    warning: {
      main: '#B26A00',
    },
    error: {
      main: '#BA1A1A',
    },
    success: {
      main: '#146C2E',
    },
  },
  typography: {
    fontFamily: "'Avenir Next', 'Segoe UI', 'Helvetica Neue', sans-serif",
    h1: { fontSize: '2rem', fontWeight: 700 },
    h2: { fontSize: '1.5rem', fontWeight: 700 },
    h3: { fontSize: '1.25rem', fontWeight: 700 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: {
    borderRadius: tokens.radius.md,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.lg,
          minHeight: 44,
          paddingInline: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: 44,
            borderRadius: tokens.radius.md,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderTopLeftRadius: tokens.radius.xl,
          borderTopRightRadius: tokens.radius.xl,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 72,
          borderTop: '1px solid rgba(12,22,45,0.08)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: tokens.radius.lg,
        },
      },
    },
  },
});


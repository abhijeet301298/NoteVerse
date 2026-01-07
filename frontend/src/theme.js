// frontend/src/theme.js (Fresh, Light Theme)
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light', // Explicitly set to light mode
    primary: {
      main: '#7850a3', // A soft purple/indigo for primary actions and highlights
      light: '#b094d2',
      dark: '#5a3d7b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b0d9b1', // A light, fresh green for secondary actions
      light: '#c8e6c9',
      dark: '#80af80',
      contrastText: '#000000',
    },
    background: {
      default: '#F5F7FA', // Very light off-white/grey for overall background
      paper: '#FFFFFF',   // Pure white for cards and paper components
    },
    text: {
      primary: '#333333', // Dark grey for primary text (readable on light)
      secondary: '#666666', // Medium grey for secondary text
      disabled: '#AAAAAA',
    },
    error: {
      main: '#D32F2F', // Standard red for errors
    },
    warning: {
      main: '#FBC02D', // Standard yellow for warnings
    },
    info: {
      main: '#2196F3', // Standard blue for info
    },
    success: {
      main: '#4CAF50', // Standard green for success
    },
  },
  typography: {
    fontFamily: [
      'Inter', // Modern sans-serif font (ensure it's imported in global.css if not default)
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '3.5rem', fontWeight: 700 }, // Large heading
    h2: { fontSize: '2.5rem', fontWeight: 600 },
    h4: { fontSize: '1.8rem', fontWeight: 600 },
    h5: { fontSize: '1.4rem', fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 }, // Keep buttons with normal capitalization
  },
  components: {
    MuiAppBar: {
        styleOverrides: {
            root: {
                background: 'linear-gradient(90deg, #FFFFFF, #F9F9F9)', // Soft gradient for navbar
                boxShadow: '0px 2px 8px rgba(0,0,0,0.05)', // Subtle shadow
                color: '#333333', // Default text color for navbar
            }
        }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px', // More rounded buttons
          padding: '10px 25px',
          boxShadow: '0px 4px 12px rgba(0,0,0,0.1)', // Soft shadows for buttons
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)', // Lift effect
            boxShadow: '0px 6px 16px rgba(0,0,0,0.15)',
          }
        },
        containedPrimary: { // For CTA buttons
            background: 'linear-gradient(45deg, #a084e8 30%, #7850a3 90%)', // Primary accent gradient
            '&:hover': {
                background: 'linear-gradient(45deg, #7850a3 30%, #a084e8 90%)', // Reverse gradient on hover
            }
        },
        outlinedSecondary: { // For bordered buttons
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white',
            }
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // Rounded corners for neumorphic cards
          boxShadow: '8px 8px 16px rgba(0,0,0,0.05), -8px -8px 16px rgba(255,255,255,0.7)', // Neumorphic light shadow
          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
          '&:hover': {
              transform: 'translateY(-5px)', // Lift effect for cards
              boxShadow: '12px 12px 24px rgba(0,0,0,0.08), -12px -12px 24px rgba(255,255,255,0.9)',
          }
        },
      },
    },
    MuiCard: { // Cards also get Paper styles
        styleOverrides: {
            root: {
                borderRadius: '16px',
            }
        }
    }
  },
});

export default theme;
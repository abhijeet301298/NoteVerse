// frontend/src/pages/HomePage.jsx
import React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CategoryIcon from '@mui/icons-material/Category';
import QuizIcon from '@mui/icons-material/Quiz';
import DashboardIcon from '@mui/icons-material/Dashboard';

interface HomePageProps {
  onSignIn: () => void;
  isAuthenticated: boolean; // Not directly used for content, but part of prop signature
  userDisplayName: string; // Not directly used for content, but part of prop signature
}

function HomePage({ onSignIn }: HomePageProps) { // Only onSignIn is used for the buttons

  const featureCards = [
    { icon: <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: "AI-Powered OCR", description: "Convert handwritten and printed notes into digital text with high accuracy using advanced machine learning." },
    { icon: <CategoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: "Smart Topic Grouping", description: "Automatically categorize and organize your notes by subject, making it easy to find related content." },
    { icon: <QuizIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: "Interactive Quizzes", description: "Generate instant quizzes from your notes to test your knowledge and reinforce learning." },
    { icon: <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />, title: "Performance Analytics", description: "Track your study progress and quiz performance with insightful dashboards." },
  ];

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', py: { xs: 4, md: 8 }, px: { xs: 2, md: 4 }, overflowX: 'hidden' }}>
      {/* Hero Section */}
      <Box sx={{
        textAlign: 'center',
        mb: { xs: 6, md: 10 },
        py: { xs: 4, md: 8 },
        background: 'linear-gradient(180deg, #F5F7FA 0%, #E0E8F0 100%)', // Light gradient background
        borderRadius: '20px',
        boxShadow: '0px 8px 24px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '1200px',
        position: 'relative',
        overflow: 'hidden', // Hide overflow from animation if added
      }}>
        <Typography variant="h1" component="h1" gutterBottom sx={{
          color: 'text.primary',
          fontWeight: 700,
          fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
          lineHeight: { xs: 1.2, md: 1.1 },
          mb: 3,
          background: 'linear-gradient(45deg, #7850a3 30%, #b094d2 90%)', // Gradient text effect
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textFillColor: 'transparent',
        }}>
          Turn Your Notes Into Knowledge
        </Typography>
        <Typography variant="h5" sx={{
          color: 'text.secondary',
          mb: { xs: 4, md: 6 },
          fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.6rem' },
          maxWidth: '800px',
          mx: 'auto'
        }}>
          Scan handwritten notes and get instant quizzes, topic tagging, and performance analytics powered by advanced AI.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, md: 3 }, flexWrap: 'wrap', mb: 4 }}>
          <Button
            variant="contained"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            onClick={onSignIn} // Calls Firebase Sign-In
            sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 3, md: 4 }, fontSize: { xs: '1rem', md: '1.1rem' } }}
          >
            Get Started Free
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PlayArrowIcon />}
            // onClick={() => alert("Demo Quiz Coming Soon!")} // Placeholder for demo quiz
            sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 3, md: 4 }, fontSize: { xs: '1rem', md: '1.1rem' } }}
          >
            Try Demo Quiz
          </Button>
        </Box>

        {/* Placeholder for Animation (Lottie/Illustration) */}
        <Box sx={{ height: { xs: '150px', md: '300px' }, width: '100%', mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* Integrate Lottie animation or custom CSS animation here */}
            {/* For example: <Lottie animationData={yourAnimationJson} loop={true} style={{ height: '100%', width: '100%' }} /> */}
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                [Awesome Study/AI Animation Placeholder]
            </Typography>
        </Box>

        {/* Small Info Badges */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 2, md: 4 }, mt: 4, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>⚡ AI-Powered</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>⏱️ Instant Results</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>💡 Smart Learning</Typography>
        </Box>
      </Box>

      {/* Info Section - Features */}
      <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, maxWidth: '1200px', width: '100%' }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{
          color: 'text.primary',
          mb: 5,
          fontWeight: 600
        }}>
          Everything you need to transform learning
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {featureCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, backgroundColor: 'background.paper', borderRadius: '16px' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {card.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

export default HomePage;
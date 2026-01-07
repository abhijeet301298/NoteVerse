import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, Alert } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard({ onError, userDisplayName }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const fetchDashboardStats = async () => {
      const user = auth.currentUser;
      if (!user) {
        setFetchError("User not authenticated.");
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch dashboard stats.');
        }
        setStats(data.stats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setFetchError(error.message);
        onError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [auth, onError]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{fetchError}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, flexGrow: 1 }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
        Hello, {userDisplayName}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome to your personalized study dashboard.
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
              {stats.notes_uploaded}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Notes Uploaded
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h5" color="secondary" sx={{ fontWeight: 'bold' }}>
              {stats.quizzes_generated}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Quizzes Generated
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h5" color="info.main" sx={{ fontWeight: 'bold' }}>
              {stats.quizzes_solved}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Quizzes Solved
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
              {stats.study_time_hours} hrs
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Total Study Time
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts Section */}
      <Box sx={{ mt: 6 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Weekly Study Progress
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.weekly_progress} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="time_h" fill="#8884d8" name="Study Time (h)" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Topic Mastery
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topic_mastery} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="topic" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="percentage" fill="#82ca9d" name="Mastery (%)" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default Dashboard;

//  Old Code 2:36 PM 21/08
// // frontend/src/components/Dashboard.jsx
// import React, { useState, useEffect } from 'react';
// import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
// import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Study Time icon
// import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Average Score icon
// import EventAvailableIcon from '@mui/icons-material/EventAvailable'; // Day Streak icon
// import NoteAddIcon from '@mui/icons-material/NoteAdd'; // Notes Added icon
// import QuizIcon from '@mui/icons-material/Quiz'; // Quizzes Done icon
// import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'; // For positive change
// import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'; // For negative change

// function Dashboard({ onError, userDisplayName }) {
//   const [dashboardStats, setDashboardStats] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [apiError, setApiError] = useState(null);

//   useEffect(() => {
//     const fetchDashboardStats = async () => {
//       setLoading(true);
//       setApiError(null);
//       const token = localStorage.getItem('firebaseIdToken');
//       if (!token) {
//         onError("Authentication token missing. Please sign in.");
//         setLoading(false);
//         return;
//       }

//       try {
//         const response = await fetch('http://localhost:5000/api/dashboard-stats', {
//           headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (!response.ok) {
//           const errorData = await response.json();
//           throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
//         }
//         const data = await response.json();
//         setDashboardStats(data.stats);
//       } catch (error) {
//         console.error("Error fetching dashboard stats:", error);
//         setApiError(`Failed to load dashboard: ${error.message}`);
//         onError(`Failed to load dashboard: ${error.message}`);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchDashboardStats();
//   }, [onError]);

//   const statCardsData = [
//     { title: "Study Time", value: dashboardStats?.study_time_hours ? `${dashboardStats.study_time_hours}h` : 'N/A', icon: <AccessTimeIcon color="primary" sx={{ fontSize: 40 }} /> },
//     { title: "Avg Score", value: dashboardStats?.average_accuracy ? `${dashboardStats.average_accuracy}%` : 'N/A', icon: <TrendingUpIcon color="success" sx={{ fontSize: 40 }} /> },
//     { title: "Day Streak", value: dashboardStats?.days_streak !== undefined ? `${dashboardStats.days_streak}` : 'N/A', icon: <EventAvailableIcon color="warning" sx={{ fontSize: 40 }} /> },
//     { title: "Notes Added", value: dashboardStats?.notes_uploaded !== undefined ? `${dashboardStats.notes_uploaded}` : 'N/A', icon: <NoteAddIcon sx={{ color: 'info.main', fontSize: 40 }} /> },
//     { title: "Quizzes Done", value: dashboardStats?.quizzes_solved !== undefined ? `${dashboardStats.quizzes_solved}` : 'N/A', icon: <QuizIcon color="error" sx={{ fontSize: 40 }} /> },
//   ];

//   if (loading) {
//     return (
//       <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
//         <CircularProgress color="primary" />
//         <Typography variant="h6" sx={{ mt: 2 }} color="text.primary">Loading dashboard...</Typography>
//       </Box>
//     );
//   }

//   if (apiError) {
//     return (
//       <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
//         <Typography variant="h6" color="error">Error: {apiError}</Typography>
//       </Box>
//     );
//   }

//   return (
//     <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, maxWidth: '1400px', margin: '0 auto' }}>
//       <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'text.primary', mb: 4, fontWeight: 600 }}>
//         Hello, {userDisplayName}! Here's your Study Analytics.
//       </Typography>

//       {/* Key Stats Cards */}
//       <Grid container spacing={3} sx={{ mb: 6 }}>
//         {statCardsData.map((card, index) => (
//           <Grid item xs={12} sm={6} md={2.4} key={index}> {/* md=2.4 for 5 columns */}
//             <Paper elevation={1} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
//               <Box sx={{ mb: 1 }}>{card.icon}</Box>
//               <Typography variant="h5" component="div" sx={{ color: 'text.primary', fontWeight: 600 }}>
//                 {card.value}
//               </Typography>
//               <Typography variant="body2" color="text.secondary">
//                 {card.title}
//               </Typography>
//             </Paper>
//           </Grid>
//         ))}
//       </Grid>

//       <Grid container spacing={3}>
//         {/* Weekly Progress Card */}
//         <Grid item xs={12} md={6}>
//           <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
//             <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
//               Weekly Progress
//             </Typography>
//             {dashboardStats?.weekly_progress?.length > 0 ? (
//               <Box>
//                 {dashboardStats.weekly_progress.map((item, index) => (
//                   <Box key={index} sx={{ mb: 2 }}>
//                     <Typography variant="body2" color="text.primary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
//                       <span>{item.day}</span> <span>{item.time_h}h</span>
//                     </Typography>
//                     <Box sx={{ width: '100%', backgroundColor: 'grey.300', borderRadius: '5px', height: '10px', mt: 0.5 }}>
//                       <Box sx={{ width: `${(item.time_h / Math.max(...dashboardStats.weekly_progress.map(p => p.time_h))) * 100}%`, backgroundColor: 'primary.main', height: '100%', borderRadius: '5px' }} />
//                     </Box>
//                     <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
//                       Accuracy: {item.accuracy}%
//                     </Typography>
//                   </Box>
//                 ))}
//               </Box>
//             ) : (
//               <Typography variant="body2" color="text.secondary">No weekly progress data available.</Typography>
//             )}
//           </Paper>
//         </Grid>

//         {/* Topic Mastery Card */}
//         <Grid item xs={12} md={6}>
//           <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
//             <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
//               Topic Mastery
//             </Typography>
//             {dashboardStats?.topic_mastery?.length > 0 ? (
//               <Box>
//                 {dashboardStats.topic_mastery.map((item, index) => (
//                   <Box key={index} sx={{ mb: 2 }}>
//                     <Typography variant="body2" color="text.primary" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                       <span>{item.topic}</span> 
//                       <Box sx={{ display: 'flex', alignItems: 'center' }}>
//                         <span>{item.percentage}%</span>
//                         {item.change !== undefined && (
//                           <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', color: item.change >= 0 ? 'success.main' : 'error.main' }}>
//                             {item.change >= 0 ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
//                             <Typography variant="caption">{Math.abs(item.change)}%</Typography>
//                           </Box>
//                         )}
//                       </Box>
//                     </Typography>
//                     <Box sx={{ width: '100%', backgroundColor: 'grey.300', borderRadius: '5px', height: '10px', mt: 0.5 }}>
//                       <Box sx={{ width: `${item.percentage}%`, backgroundColor: 'primary.main', height: '100%', borderRadius: '5px' }} />
//                     </Box>
//                   </Box>
//                 ))}
//               </Box>
//             ) : (
//               <Typography variant="body2" color="text.secondary">No topic mastery data available.</Typography>
//             )}
//           </Paper>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// }

// export default Dashboard;
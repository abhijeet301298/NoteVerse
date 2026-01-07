import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';

function Profile({ userDisplayName, userEmail, onSignOut, onBack }) {
    return (
        <Box 
            sx={{ 
                p: 4, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 3,
                minHeight: '80vh'
            }}
        >
            <AccountCircle sx={{ fontSize: 100, color: 'text.secondary' }} />
            <Typography variant="h4" component="h1">
                Profile
            </Typography>
            <Typography variant="h6" color="text.primary">
                Name: {userDisplayName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                Email: {userEmail}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" color="primary" onClick={onBack}>
                    Go Back
                </Button>
                <Button variant="contained" color="error" onClick={onSignOut}>
                    Sign Out
                </Button>
            </Box>
        </Box>
    );
}

export default Profile;

// // frontend/src/components/Profile.jsx
// import React from 'react';
// import { Box, Typography, Paper, Grid, Avatar, Switch, FormControlLabel, Button } from '@mui/material';
// import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Icon for profile
// import MailOutlineIcon from '@mui/icons-material/MailOutline'; // Icon for email notifications
// import FlashOnIcon from '@mui/icons-material/FlashOn'; // Icon for flashcards
// import LockOpenIcon from '@mui/icons-material/LockOpen'; // Icon for privacy/security
// import VpnKeyIcon from '@mui/icons-material/VpnKey'; // Icon for 2FA

// function Profile({ onBack, userDisplayName, userEmail, onSignOut }) {
//   // States for switch toggles (mock functionality for now)
//   const [emailNotifications, setEmailNotifications] = React.useState(true);
//   const [autoGenerateFlashcards, setAutoGenerateFlashcards] = React.useState(false);

//   return (
//     <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, maxWidth: '1200px', margin: '0 auto' }}>
//       <Button variant="contained" onClick={onBack} sx={{ backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none', mb: 3 }}>
//         Back to Dashboard
//       </Button>

//       <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'text.primary', mb: 4, fontWeight: 600 }}>
//         Profile & Settings
//       </Typography>

//       <Grid container spacing={3}>
//         {/* User Info Card (Left Column) */}
//         <Grid item xs={12} md={4}>
//           <Paper elevation={1} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
//             <Avatar sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main' }}>
//               <AccountCircleIcon sx={{ fontSize: 60, color: 'white' }} />
//             </Avatar>
//             <Typography variant="h5" component="h2" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
//               {userDisplayName || 'John Doe'}
//             </Typography>
//             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
//               {userEmail || 'john.doe@example.com'}
//             </Typography>
//             <Button variant="outlined" color="primary" sx={{ textTransform: 'none' }}>
//               Premium Member {/* Placeholder */}
//             </Button>
//           </Paper>
//         </Grid>

//         {/* Account Settings & Privacy (Right Column) */}
//         <Grid item xs={12} md={8}>
//           <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
//             <Typography variant="h5" component="h3" sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 3 }}>
//               Account Settings
//             </Typography>
//             <FormControlLabel
//               control={
//                 <Switch
//                   checked={emailNotifications}
//                   onChange={(e) => setEmailNotifications(e.target.checked)}
//                   name="emailNotifications"
//                   color="primary"
//                 />
//               }
//               label={
//                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
//                   <MailOutlineIcon sx={{ mr: 1, color: 'primary.main' }} />
//                   <Typography variant="body1" color="text.primary">Email Notifications</Typography>
//                 </Box>
//               }
//               sx={{ mb: 2, width: '100%', justifyContent: 'space-between', ml: 0 }}
//             />
//             <FormControlLabel
//               control={
//                 <Switch
//                   checked={autoGenerateFlashcards}
//                   onChange={(e) => setAutoGenerateFlashcards(e.target.checked)}
//                   name="autoGenerateFlashcards"
//                   color="primary"
//                 />
//               }
//               label={
//                 <Box sx={{ display: 'flex', alignItems: 'center' }}>
//                   <FlashOnIcon sx={{ mr: 1, color: 'secondary.main' }} />
//                   <Typography variant="body1" color="text.primary">Auto-generate flashcards from uploads</Typography>
//                 </Box>
//               }
//               sx={{ mb: 3, width: '100%', justifyContent: 'space-between', ml: 0 }}
//             />

//             <Typography variant="h5" component="h3" sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 3 }}>
//               Privacy & Security
//             </Typography>
//             <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
//               <Box sx={{ display: 'flex', alignItems: 'center' }}>
//                 <LockOpenIcon sx={{ mr: 1, color: 'error.main' }} />
//                 <Typography variant="body1" color="text.primary">Change Password</Typography>
//               </Box>
//               <Button variant="outlined" sx={{ textTransform: 'none' }}>Update</Button>
//             </Box>
//             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
//               <Box sx={{ display: 'flex', alignItems: 'center' }}>
//                 <VpnKeyIcon sx={{ mr: 1, color: 'warning.main' }} />
//                 <Typography variant="body1" color="text.primary">Two-Factor Authentication</Typography>
//               </Box>
//               <Button variant="outlined" sx={{ textTransform: 'none' }}>Enable</Button>
//             </Box>
//           </Paper>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// }

// export default Profile;
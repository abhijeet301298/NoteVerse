import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import './App.css';
import UploadNote from './components/UploadNote';
import NoteList from './components/NoteList.jsx';
import NoteDetail from './components/NoteDetail';
import QuizTaker from './components/QuizTaker';
import RevisionWindow from './components/RevisionWindow';
import HomePage from './components/HomePage.tsx';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import QuizzesList from './components/QuizzesList';
//import MyNotesPage from './components/MyNotesPage'; // Adjust the path as needed
//import GamesPage from './components/GamesPage'; // Import the new GamesPage component
import logo from './assets/logo.png';

import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [backendMessage, setBackendMessage] = useState(null); // Initialize with null
  const [backendStatus, setBackendStatus] = useState(null); // Initialize with null
  const [error, setError] = useState(null);
  const [protectedData, setProtectedData] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [currentQuizId, setCurrentQuizId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAuthenticated(true);
        console.log("Logged in user:", currentUser.displayName || currentUser.email);
        currentUser.getIdToken().then(idToken => {
          localStorage.setItem('firebaseIdToken', idToken);
        }).catch(tokenError => {
          console.error("Error getting Firebase ID token:", tokenError);
          setError("Failed to get authentication token.");
        });
        if (currentView === 'home' || !currentView) {
            setCurrentView('dashboard');
        }
      } else {
        setIsAuthenticated(false);
        console.log("No user logged in.");
        localStorage.removeItem('firebaseIdToken');
        setProtectedData(null);
        setCurrentView('home');
        setSelectedNoteId(null);
        setCurrentQuizId(null);
      }
    });
    return () => unsubscribe();
  }, [currentView]);

  useEffect(() => {
    // Wrap async fetch calls in a function
    const fetchBackendData = async () => {
      try {
        const helloResponse = await fetch('/api/hello');
        const helloData = await helloResponse.json();
        setBackendMessage(helloData.message);

        const statusResponse = await fetch('/api/status');
        const statusData = await statusResponse.json();
        setBackendStatus(`Backend Status: ${statusData.status} - ${statusData.service}`);
      } catch (fetchError) {
        console.error("Error fetching backend data:", fetchError);
        setError("Failed to fetch backend status. Check backend server.");
        setBackendMessage("Failed to connect.");
        setBackendStatus("Disconnected.");
      }
    };

    fetchBackendData();
  }, []); // Empty dependency array means this runs once on component mount

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (firebaseError) {
      console.error("Error signing in with Google:", firebaseError.message);
      setError("Google Sign-In failed. " + firebaseError.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (firebaseError) {
      console.error("Error signing out:", firebaseError.message);
      setError("Sign-Out failed. " + firebaseError.message);
    }
  };

  const fetchProtectedData = async () => {
    setError(null);
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setError("No authentication token found. Please sign in.");
      return;
    }
    try {
      const response = await fetch('/api/protected-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      setProtectedData(data.message);
    } catch (err) {
      console.error("Error fetching protected data:", err);
      setError(`Failed to fetch protected data: ${err.message}`);
    }
  };

  const handleUploadSuccess = (message) => {
    setUploadMessage(message);
    setCurrentView('list');
    setError(null);
  };

  const handleUploadError = (message) => {
    setUploadMessage(message);
    setError(message);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <Box 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer'
            }} 
            onClick={() => {
              setCurrentView(isAuthenticated ? 'dashboard' : 'home'); 
              setSelectedNoteId(null); 
              setUploadMessage(null); 
              setError(null); 
              setCurrentQuizId(null); 
            }}
          >
            <img src={logo} alt="OrgaNote Logo" style={{ height: '48px', verticalAlign: 'middle' }} />
            <Typography variant="h5" component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              OrgaNote
            </Typography>
          </Box>

          {user ? (
            <Box sx={{ display: 'flex', gap: { xs: '5px', sm: '10px' }, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              <Button
                variant="text"
                onClick={() => { setCurrentView('dashboard'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
                color={currentView === 'dashboard' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'dashboard' ? 'bold' : 'normal' }}
              >
                Dashboard
              </Button>
              {/* <Button
                variant="text"
                onClick={() => { setCurrentView('my-notes'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }} // <--- CHANGE VIEW TO 'my-notes'
                color={currentView === 'my-notes' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'my-notes' ? 'bold' : 'normal' }}
              >
                My Notes
              </Button>
               */}
              <Button
                variant="text"
                onClick={() => { setCurrentView('list'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
                color={currentView === 'list' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'list' ? 'bold' : 'normal' }}
              >
                My Notes
              </Button>
              <Button
                variant="text"
                onClick={() => { setCurrentView('upload'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
                color={currentView === 'upload' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'upload' ? 'bold' : 'normal' }}
              >
                Upload Notes
              </Button>
              <Button
                variant="text"
                onClick={() => { setCurrentView('revision'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
                color={currentView === 'revision' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'revision' ? 'bold' : 'normal' }}
              >
                Revision
              </Button>
              <Button
                variant="text"
                onClick={() => { setCurrentView('quizzes'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
                color={currentView === 'quizzes' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'quizzes' ? 'bold' : 'normal' }}
              >
                Quizzes
              </Button>
              <Button
                variant="text"
                onClick={() => { setCurrentView('games'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
                color={currentView === 'games' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'games' ? 'bold' : 'normal' }}
              >
                Games
              </Button>
              <Button
                variant="text"
                onClick={() => { setCurrentView('profile'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
                color={currentView === 'profile' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'profile' ? 'bold' : 'normal' }}
              >
                Profile
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 2, px: { xs: 2, sm: 4, md: 8 } }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGoogleSignIn}
                    sx={{ textTransform: 'none' }}
                >
                    Sign In
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => alert('Sign Up functionality will be the same as Sign In for this demo.')}
                    sx={{ textTransform: 'none' }}
                >
                    Sign Up
                </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {uploadMessage && (
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold', color: uploadMessage.includes('failed') || uploadMessage.includes('Error') ? 'error.main' : 'success.main' }}>
          {uploadMessage}
        </Typography>
      )}
      {error && (
        <Typography variant="body1" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
          Error: {error}
        </Typography>
      )}
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {isAuthenticated ? (
            currentView === 'upload' ? (
                <UploadNote onUploadSuccess={handleUploadSuccess} onError={handleUploadError} />
            ) : currentView === 'detail' && selectedNoteId ? (
                <NoteDetail
                    noteId={selectedNoteId}
                    onBack={() => { setCurrentView('list'); setSelectedNoteId(null); }}
                    onError={(msg) => setError(msg)}
                    onQuizGenerated={(quizId) => { setCurrentView('quiz'); setCurrentQuizId(quizId); }}
                />
            ) : currentView === 'quiz' && currentQuizId ? (
                <QuizTaker
                    quizId={currentQuizId}
                    onBack={() => { setCurrentView('quizzes'); setCurrentQuizId(null); }}
                    onError={(msg) => setError(msg)}
                />
            ) : currentView === 'revision' ? (
                <RevisionWindow
                    onBack={() => { setCurrentView('list'); }}
                    onError={(msg) => setError(msg)}
                />
            ) : currentView === 'quizzes' ? (
                <QuizzesList 
                    onSelectQuiz={(quizId) => { setCurrentView('quiz'); setCurrentQuizId(quizId); }}
                    onError={(msg) => setError(msg)}
                />
            ) : currentView === 'games' ? (
                <GamesPage />
            ) : currentView === 'dashboard' ? (
                <Dashboard
                    onError={(msg) => setError(msg)}
                    userDisplayName={user?.displayName || user?.email || ''}
                />
            ) : currentView === 'profile' ? (
                <Profile
                    onBack={() => { setCurrentView('dashboard'); }}
                    userDisplayName={user?.displayName || user?.email || ''}
                    userEmail={user?.email || ''}
                    onError={(msg) => setError(msg)}
                    onSignOut={handleSignOut}
                />
            ) : (
                <NoteList
                    onSelectNote={(id) => { setCurrentView('detail'); setSelectedNoteId(id); }}
                    onError={(msg) => setError(msg)}
                    onNavigateToUpload={() => { setCurrentView('upload'); }}
                />
            )
        ) : (
            <HomePage
                onSignIn={handleGoogleSignIn}
                isAuthenticated={isAuthenticated}
                userDisplayName={user?.displayName || user?.email || ''}
            />
        )}
      </Box>

      <Box sx={{ mt: 'auto', py: 2, px: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', color: 'text.secondary', fontSize: '0.9em', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <Typography variant="body2" component="span">About</Typography>
        <Typography variant="body2" component="span">Privacy</Typography>
        <a href="https://github.com/Sohel-Modi/OrgaNote" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Typography variant="body2" component="span">GitHub</Typography>
        </a>
        <a href="https://linkedin.com/in/sohel-modi" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Typography variant="body2" component="span">LinkedIn</Typography>
        </a>
        <Typography variant="body2" component="span">Contact</Typography>
      </Box>
    </Box>
  );
}

export default App;

// Old 2:36 PM 21/08
// import React, { useState, useEffect } from 'react';
// import { auth, googleProvider } from './firebase';
// import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
// import './App.css';
// import UploadNote from './components/UploadNote';
// import NoteList from './components/NoteList.jsx';
// import NoteDetail from './components/NoteDetail';
// import QuizTaker from './components/QuizTaker';
// import RevisionWindow from './components/RevisionWindow';
// import HomePage from './components/HomePage.tsx';
// import Dashboard from './components/Dashboard';
// import Profile from './components/Profile'; // Import the new Profile component
// import QuizzesList from './components/QuizzesList'; // Import the new QuizzesList component
// import logo from './assets/logo.png';

// import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
// import { useTheme } from '@mui/material/styles';

// function App() {
//   const [user, setUser] = useState(null);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [setBackendMessage] = useState('Loading...');
//   const [setBackendStatus] = useState('Checking status...');
//   const [error, setError] = useState(null);
//   const [setProtectedData] = useState(null);
//   const [currentView, setCurrentView] = useState('home');
//   const [selectedNoteId, setSelectedNoteId] = useState(null);
//   const [currentQuizId, setCurrentQuizId] = useState(null);
//   const [uploadMessage, setUploadMessage] = useState(null);
//   const theme = useTheme();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       if (currentUser) {
//         setIsAuthenticated(true);
//         console.log("Logged in user:", currentUser.displayName || currentUser.email);
//         currentUser.getIdToken().then(idToken => {
//           localStorage.setItem('firebaseIdToken', idToken);
//         }).catch(tokenError => {
//           console.error("Error getting Firebase ID token:", tokenError);
//           setError("Failed to get authentication token.");
//         });
//         if (currentView === 'home' || !currentView) {
//             setCurrentView('dashboard');
//         }
//       } else {
//         setIsAuthenticated(false);
//         console.log("No user logged in.");
//         localStorage.removeItem('firebaseIdToken');
//         setProtectedData(null);
//         setCurrentView('home');
//         setSelectedNoteId(null);
//         setCurrentQuizId(null);
//       }
//     });
//     return () => unsubscribe();
//   }, [currentView]);

//   useEffect(() => {
//     fetch('/api/hello')
//       .then(response => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then(data => setBackendMessage(data.message))
//       .catch(fetchError => {
//         console.error("Error fetching hello message:", fetchError);
//         setError("Failed to fetch hello message. Check backend server.");
//       });

//     fetch('/api/status')
//       .then(response => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then(data => setBackendStatus(`Backend Status: ${data.status} - ${data.service}`))
//       .catch(fetchError => {
//         console.error("Error fetching status:", fetchError);
//         setError("Failed to fetch status. Check backend server.");
//       });
//   }, []);

//   const handleGoogleSignIn = async () => {
//     try {
//       await signInWithPopup(auth, googleProvider);
//     } catch (firebaseError) {
//       console.error("Error signing in with Google:", firebaseError.message);
//       setError("Google Sign-In failed. " + firebaseError.message);
//     }
//   };

//   const handleSignOut = async () => {
//     try {
//       await signOut(auth);
//     } catch (firebaseError) {
//       console.error("Error signing out:", firebaseError.message);
//       setError("Sign-Out failed. " + firebaseError.message);
//     }
//   };

//   const fetchProtectedData = async () => {
//     setError(null);
//     const token = localStorage.getItem('firebaseIdToken');
//     if (!token) {
//       setError("No authentication token found. Please sign in.");
//       return;
//     }
//     try {
//       const response = await fetch('/api/protected-data', {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
//       }
//       const data = await response.json();
//       setProtectedData(data.message);
//     } catch (err) {
//       console.error("Error fetching protected data:", err);
//       setError(`Failed to fetch protected data: ${err.message}`);
//     }
//   };

//   const handleUploadSuccess = (message) => {
//     setUploadMessage(message);
//     setCurrentView('list');
//     setError(null);
//   };

//   const handleUploadError = (message) => {
//     setUploadMessage(message);
//     setError(message);
//   };

//   return (
//     <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
//       <AppBar position="static" color="transparent" elevation={0} sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
//         <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
//           <Box 
//             sx={{ 
//               flexGrow: 1, 
//               display: 'flex', 
//               alignItems: 'center', 
//               gap: '10px', 
//               cursor: 'pointer'
//             }} 
//             onClick={() => {
//               setCurrentView(isAuthenticated ? 'dashboard' : 'home'); 
//               setSelectedNoteId(null); 
//               setUploadMessage(null); 
//               setError(null); 
//               setCurrentQuizId(null); 
//             }}
//           >
//             <img src={logo} alt="OrgaNote Logo" style={{ height: '48px', verticalAlign: 'middle' }} />
//             <Typography variant="h5" component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
//               OrgaNote
//             </Typography>
//           </Box>

//           {user ? (
//             <Box sx={{ display: 'flex', gap: { xs: '5px', sm: '10px' }, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('dashboard'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'dashboard' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'dashboard' ? 'bold' : 'normal' }}
//               >
//                 Dashboard
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('list'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'list' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'list' ? 'bold' : 'normal' }}
//               >
//                 My Notes
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('upload'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'upload' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'upload' ? 'bold' : 'normal' }}
//               >
//                 Upload Notes
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('revision'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'revision' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'revision' ? 'bold' : 'normal' }}
//               >
//                 Revision
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('quizzes'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'quizzes' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'quizzes' ? 'bold' : 'normal' }}
//               >
//                 Quizzes
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { /* Placeholder for Games */ setUploadMessage(null); setError(null); }}
//                 color="inherit"
//                 sx={{ textTransform: 'none', ml: 1 }}
//               >
//                 Games
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('profile'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'profile' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'profile' ? 'bold' : 'normal' }}
//               >
//                 Profile
//               </Button>
//             </Box>
//           ) : (
//             <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 2, px: { xs: 2, sm: 4, md: 8 } }}>
//                 <Button
//                     variant="contained"
//                     color="primary"
//                     onClick={handleGoogleSignIn}
//                     sx={{ textTransform: 'none' }}
//                 >
//                     Sign In
//                 </Button>
//                 <Button
//                     variant="outlined"
//                     color="primary"
//                     onClick={() => alert('Sign Up functionality will be the same as Sign In for this demo.')}
//                     sx={{ textTransform: 'none' }}
//                 >
//                     Sign Up
//                 </Button>
//             </Box>
//           )}
//         </Toolbar>
//       </AppBar>

//       {uploadMessage && (
//         <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold', color: uploadMessage.includes('failed') || uploadMessage.includes('Error') ? 'error.main' : 'success.main' }}>
//           {uploadMessage}
//         </Typography>
//       )}
//       {error && (
//         <Typography variant="body1" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
//           Error: {error}
//         </Typography>
//       )}
      
//       <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
//         {isAuthenticated ? (
//             currentView === 'upload' ? (
//                 <UploadNote onUploadSuccess={handleUploadSuccess} onError={handleUploadError} />
//             ) : currentView === 'detail' && selectedNoteId ? (
//                 <NoteDetail
//                     noteId={selectedNoteId}
//                     onBack={() => { setCurrentView('list'); setSelectedNoteId(null); }}
//                     onError={(msg) => setError(msg)}
//                     onQuizGenerated={(quizId) => { setCurrentView('quiz'); setCurrentQuizId(quizId); }}
//                 />
//             ) : currentView === 'quiz' && currentQuizId ? (
//                 <QuizTaker
//                     quizId={currentQuizId}
//                     onBack={() => { setCurrentView('quizzes'); setCurrentQuizId(null); }}
//                     onError={(msg) => setError(msg)}
//                 />
//             ) : currentView === 'revision' ? (
//                 <RevisionWindow
//                     onBack={() => { setCurrentView('list'); }}
//                     onError={(msg) => setError(msg)}
//                 />
//             ) : currentView === 'quizzes' ? (
//                 <QuizzesList 
//                     onSelectQuiz={(quizId) => { setCurrentView('quiz'); setCurrentQuizId(quizId); }}
//                     onError={(msg) => setError(msg)}
//                 />
//             ) : currentView === 'dashboard' ? (
//                 <Dashboard
//                     onError={(msg) => setError(msg)}
//                     userDisplayName={user?.displayName || user?.email || ''}
//                 />
//             ) : currentView === 'profile' ? (
//                 <Profile
//                     onBack={() => { setCurrentView('dashboard'); }}
//                     userDisplayName={user?.displayName || user?.email || ''}
//                     userEmail={user?.email || ''}
//                     onError={(msg) => setError(msg)}
//                     onSignOut={handleSignOut}
//                 />
//             ) : ( // Default to 'dashboard' view if user is logged in
//                 <Dashboard
//                     onError={(msg) => setError(msg)}
//                     userDisplayName={user?.displayName || user?.email || ''}
//                 />
//             )
//         ) : (
//             <HomePage
//                 onSignIn={handleGoogleSignIn}
//                 isAuthenticated={isAuthenticated}
//                 userDisplayName={user?.displayName || user?.email || ''}
//             />
//         )}
//       </Box>

//       <Box sx={{ mt: 'auto', py: 2, px: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', color: 'text.secondary', fontSize: '0.9em', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px' }}>
//         <Typography variant="body2" component="span">About</Typography>
//         <Typography variant="body2" component="span">Privacy</Typography>
//         <a href="https://github.com/Sohel-Modi/OrgaNote" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
//             <Typography variant="body2" component="span">GitHub</Typography>
//         </a>
//         <a href="https://linkedin.com/in/sohel-modi" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
//             <Typography variant="body2" component="span">LinkedIn</Typography>
//         </a>
//         <Typography variant="body2" component="span">Contact</Typography>
//       </Box>
//     </Box>
//   );
// }

// export default App;


// // frontend/src/App.jsx  Old Good one , but no profile, quzes,games working , also my notes not working
// import React, { useState, useEffect } from 'react';
// import { auth, googleProvider } from './firebase';
// import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
// import './App.css'; // Keep this, even if it's minimal now
// import UploadNote from './components/UploadNote';
// import NoteList from './components/NoteList.jsx';
// import NoteDetail from './components/NoteDetail';
// import QuizTaker from './components/QuizTaker';
// import RevisionWindow from './components/RevisionWindow';
// import HomePage from './components/HomePage.tsx'; // Corrected path to pages folder
// import Dashboard from './components/Dashboard';
// import logo from './assets/logo.png';

// // MUI Imports for App.jsx
// import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
// import { useTheme } from '@mui/material/styles';

// function App() {
//   const [user, setUser] = useState(null);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [backendMessage, setBackendMessage] = useState('Loading...');
//   const [backendStatus, setBackendStatus] = useState('Checking status...');
//   const [error, setError] = useState(null);
//   const [protectedData, setProtectedData] = useState(null);
//   const [currentView, setCurrentView] = useState('home');
//   const [selectedNoteId, setSelectedNoteId] = useState(null);
//   const [currentQuizId, setCurrentQuizId] = useState(null);
//   const [uploadMessage, setUploadMessage] = useState(null);
//   const theme = useTheme();


//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       if (currentUser) {
//         setIsAuthenticated(true);
//         console.log("Logged in user:", currentUser.displayName || currentUser.email);
//         currentUser.getIdToken().then(idToken => {
//           console.log("Firebase ID Token (first 20 chars):", idToken.substring(0, 20) + "...");
//           localStorage.setItem('firebaseIdToken', idToken);
//         }).catch(tokenError => {
//           console.error("Error getting Firebase ID token:", tokenError);
//           setError("Failed to get authentication token.");
//         });
//         if (currentView === 'home' || !currentView) {
//             setCurrentView('dashboard');
//         }
//       } else {
//         setIsAuthenticated(false);
//         console.log("No user logged in.");
//         localStorage.removeItem('firebaseIdToken');
//         setProtectedData(null);
//         setCurrentView('home');
//         setSelectedNoteId(null);
//         setCurrentQuizId(null);
//       }
//     });
//     return () => unsubscribe();
//   }, [currentView]);

//   useEffect(() => {
//     fetch('/api/hello')
//       .then(response => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then(data => setBackendMessage(data.message))
//       .catch(fetchError => {
//         console.error("Error fetching hello message:", fetchError);
//         setError("Failed to fetch hello message. Check backend server.");
//       });

//     fetch('/api/status')
//       .then(response => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then(data => setBackendStatus(`Backend Status: ${data.status} - ${data.service}`))
//       .catch(fetchError => {
//         console.error("Error fetching status:", fetchError);
//         setError("Failed to fetch status. Check backend server.");
//       });
//   }, []);

//   const handleGoogleSignIn = async () => {
//     try {
//       await signInWithPopup(auth, googleProvider);
//     } catch (firebaseError) {
//       console.error("Error signing in with Google:", firebaseError.message);
//       setError("Google Sign-In failed. " + firebaseError.message);
//     }
//   };

//   const handleSignOut = async () => {
//     try {
//       await signOut(auth);
//     } catch (firebaseError) {
//       console.error("Error signing out:", firebaseError.message);
//       setError("Sign-Out failed. " + firebaseError.message);
//     }
//   };

//   const fetchProtectedData = async () => {
//     setError(null);
//     const token = localStorage.getItem('firebaseIdToken');
//     if (!token) {
//       setError("No authentication token found. Please sign in.");
//       return;
//     }
//     try {
//       const response = await fetch('/api/protected-data', {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
//       }
//       const data = await response.json();
//       setProtectedData(data.message);
//     } catch (err) {
//       console.error("Error fetching protected data:", err);
//       setError(`Failed to fetch protected data: ${err.message}`);
//     }
//   };

//   const handleUploadSuccess = (message) => {
//     setUploadMessage(message);
//     setCurrentView('list');
//     setError(null);
//   };

//   const handleUploadError = (message) => {
//     setUploadMessage(message);
//     setError(message);
//   };

//   return (
//     <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
//       <AppBar position="static" color="transparent" elevation={0} sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
//         <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
//           {/* Logo Icon and Text (Clickable to Home Page) */}
//           <Box 
//             sx={{ 
//               flexGrow: 1, 
//               display: 'flex', 
//               alignItems: 'center', 
//               gap: '10px', 
//               cursor: 'pointer'
//             }} 
//             onClick={() => {
//               setCurrentView('home'); 
//               setSelectedNoteId(null); 
//               setUploadMessage(null); 
//               setError(null); 
//               setCurrentQuizId(null); 
//             }}
//           >
//             <img src={logo} alt="NoteVerse Logo" style={{ height: '48px', verticalAlign: 'middle' }} />
//             <Typography variant="h5" component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
//               NoteVerse
//             </Typography>
//           </Box>

//           {/* --- Authentication and Navigation Section --- */}
//           {user ? ( // If user is logged in
//             <Box sx={{ display: 'flex', gap: { xs: '5px', sm: '10px' }, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
//               <Typography variant="subtitle1" sx={{ alignSelf: 'center', color: 'text.primary', mr: 1 }}>
//                 Welcome, {user.displayName || user.email}!
//               </Typography>
//               <Button variant="contained" color="error" onClick={handleSignOut} sx={{ textTransform: 'none' }}>
//                 Sign Out
//               </Button>
//               <Button variant="contained" color="secondary" onClick={fetchProtectedData} sx={{ ml: 1, textTransform: 'none' }}>
//                 Fetch Protected Data
//               </Button>

//               {/* Navigation buttons for authenticated users */}
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('dashboard'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'dashboard' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'dashboard' ? 'bold' : 'normal' }}
//               >
//                 Dashboard
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('list'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'list' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'list' ? 'bold' : 'normal' }}
//               >
//                 My Notes
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('revision'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'revision' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'revision' ? 'bold' : 'normal' }}
//               >
//                 Revision
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { /* Placeholder for Quizzes List */ setUploadMessage(null); setError(null); }}
//                 color="inherit"
//                 sx={{ textTransform: 'none', ml: 1 }}
//               >
//                 Quizzes
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { /* Placeholder for Games */ setUploadMessage(null); setError(null); }}
//                 color="inherit"
//                 sx={{ textTransform: 'none', ml: 1 }}
//               >
//                 Games
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('profile'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'profile' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'profile' ? 'bold' : 'normal' }}
//               >
//                 Profile
//               </Button>
//             </Box>
//           ) : ( // If user is NOT logged in, show only HomePage related buttons/links in AppBar
//             <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 2, px: { xs: 2, sm: 4, md: 8 } }}>
//                 <Button
//                     variant="contained"
//                     color="primary"
//                     onClick={handleGoogleSignIn}
//                     sx={{ textTransform: 'none' }}
//                 >
//                     Sign In
//                 </Button>
//                 {/* Sign Up button placeholder */}
//                 <Button
//                     variant="outlined"
//                     color="primary"
//                     onClick={() => alert('Sign Up functionality will be the same as Sign In for this demo.')}
//                     sx={{ textTransform: 'none' }}
//                 >
//                     Sign Up
//                 </Button>
//             </Box>
//           )}
//         </Toolbar>
//       </AppBar>

//       {/* Display messages below AppBar */}
//       {uploadMessage && (
//         <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold', color: uploadMessage.includes('failed') || uploadMessage.includes('Error') ? 'error.main' : 'success.main' }}>
//           {uploadMessage}
//         </Typography>
//       )}
//       {error && (
//         <Typography variant="body1" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
//           Error: {error}
//         </Typography>
//       )}
      
//       {/* Main content area */}
//       <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
//         {isAuthenticated ? ( // Use the single isAuthenticated flag for rendering
//             currentView === 'upload' ? (
//                 <UploadNote onUploadSuccess={handleUploadSuccess} onError={handleUploadError} />
//             ) : currentView === 'detail' && selectedNoteId ? (
//                 <NoteDetail
//                     noteId={selectedNoteId}
//                     onBack={() => { setCurrentView('list'); setSelectedNoteId(null); }}
//                     onError={(msg) => setError(msg)}
//                     onQuizGenerated={(quizId) => { setCurrentView('quiz'); setCurrentQuizId(quizId); }}
//                 />
//             ) : currentView === 'quiz' && currentQuizId ? (
//                 <QuizTaker
//                     quizId={currentQuizId}
//                     onBack={() => { setCurrentView('list'); setCurrentQuizId(null); }}
//                     onError={(msg) => setError(msg)}
//                 />
//             ) : currentView === 'revision' ? (
//                 <RevisionWindow
//                     onBack={() => { setCurrentView('list'); }}
//                     onError={(msg) => setError(msg)}
//                 />
//             ) : currentView === 'dashboard' ? (
//                 <Dashboard
//                     onError={(msg) => setError(msg)}
//                     userDisplayName={user?.displayName || user?.email || ''}
//                 />
//             ) : currentView === 'profile' ? (
//                 <Profile
//                     onBack={() => { setCurrentView('dashboard'); }}
//                     userDisplayName={user?.displayName || user?.email || ''}
//                     userEmail={user?.email || ''}
//                     onError={(msg) => setError(msg)}
//                     onSignOut={handleSignOut}
//                 />
//             ) : ( // Default to 'dashboard' view if user is logged in
//                 <Dashboard
//                     onError={(msg) => setError(msg)}
//                     userDisplayName={user?.displayName || user?.email || ''}
//                 />
//             )
//         ) : ( // If user is NOT logged in, show the HomePage
//             <HomePage
//                 onSignIn={handleGoogleSignIn}
//                 isAuthenticated={isAuthenticated}
//                 userDisplayName={user?.displayName || user?.email || ''}
//             />
//         )}
//       </Box>

//       {/* Footer Section */}
//       <Box sx={{ mt: 'auto', py: 2, px: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', color: 'text.secondary', fontSize: '0.9em', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px' }}>
//         <Typography variant="body2" component="span">About</Typography>
//         <Typography variant="body2" component="span">Privacy</Typography>
//         <a href="https://github.com/your-username/NoteVerse" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
//             <Typography variant="body2" component="span">GitHub</Typography>
//         </a>
//         <a href="https://linkedin.com/in/your-linkedin" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
//             <Typography variant="body2" component="span">LinkedIn</Typography>
//         </a>
//         <Typography variant="body2" component="span">Contact</Typography>
//       </Box>
//     </Box>
//   );
// }

// export default App;

// Old one before 12/08 --------------------------- good one
// // frontend/src/App.jsx
// import React, { useState, useEffect } from 'react';
// import { auth, googleProvider } from './firebase';
// import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
// import './App.css'; // Keep this, even if it's minimal now
// import UploadNote from './components/UploadNote';
// import NoteList from './components/NoteList';
// import NoteDetail from './components/NoteDetail';
// import QuizTaker from './components/QuizTaker';
// import RevisionWindow from './components/RevisionWindow';
// import HomePage from './components/HomePage.tsx'; // <--- Ensure HomePage is imported
// import logo from './assets/logo.png';
// import Profile from './components/Profile';
// import Dashboard from './components/Dashboard'; // <--- Import Dashboard component
// // MUI Imports for App.jsx (These must be present!)
// import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

// function App() {
//   const [user, setUser] = useState(null);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [backendMessage, setBackendMessage] = useState('Loading...');
//   const [backendStatus, setBackendStatus] = useState('Checking status...');
//   const [error, setError] = useState(null);
//   const [protectedData, setProtectedData] = useState(null);
//   const [currentView, setCurrentView] = useState('list'); // Default to 'list' for logged-in users
//   const [selectedNoteId, setSelectedNoteId] = useState(null);
//   const [currentQuizId, setCurrentQuizId] = useState(null);
//   const [uploadMessage, setUploadMessage] = useState(null);


//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       if (currentUser) {
//         console.log("Logged in user:", currentUser.displayName || currentUser.email);
//         currentUser.getIdToken().then(idToken => {
//           console.log("Firebase ID Token (first 20 chars):", idToken.substring(0, 20) + "...");
//           localStorage.setItem('firebaseIdToken', idToken);
//         }).catch(tokenError => {
//           console.error("Error getting Firebase ID token:", tokenError);
//           setError("Failed to get authentication token.");
//         });
//         if (currentView === 'home' || !currentView) { // if currentView is 'home' (for unauth user), switch to 'list'
//             setCurrentView('dashboard');
//         }
//       } else {
//         console.log("No user logged in.");
//         localStorage.removeItem('firebaseIdToken');
//         setProtectedData(null);
//         setCurrentView('home'); // Go to HomePage view if not logged in
//         setSelectedNoteId(null);
//         setCurrentQuizId(null);
//       }
//     });
//     return () => unsubscribe();
//   }, [currentView]); // Added currentView to dependency array

//   useEffect(() => {
//     fetch('/api/hello')
//       .then(response => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then(data => setBackendMessage(data.message))
//       .catch(fetchError => {
//         console.error("Error fetching hello message:", fetchError);
//         setError("Failed to fetch hello message. Check backend server.");
//       });

//     fetch('/api/status')
//       .then(response => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         return response.json();
//       })
//       .then(data => setBackendStatus(`Backend Status: ${data.status} - ${data.service}`))
//       .catch(fetchError => {
//         console.error("Error fetching status:", fetchError);
//         setError("Failed to fetch status. Check backend server.");
//       });
//   }, []);

//   const handleGoogleSignIn = async () => {
//     try {
//       await signInWithPopup(auth, googleProvider);
//     } catch (firebaseError) {
//       console.error("Error signing in with Google:", firebaseError.message);
//       setError("Google Sign-In failed. " + firebaseError.message);
//     }
//   };

//   const handleSignOut = async () => {
//     try {
//       await signOut(auth);
//     } catch (firebaseError) {
//       console.error("Error signing out:", firebaseError.message);
//       setError("Sign-Out failed. " + firebaseError.message);
//     }
//   };

//   const fetchProtectedData = async () => {
//     setError(null);
//     const token = localStorage.getItem('firebaseIdToken');
//     if (!token) {
//       setError("No authentication token found. Please sign in.");
//       return;
//     }
//     try {
//       const response = await fetch('/api/protected-data', {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
//       }
//       const data = await response.json();
//       setProtectedData(data.message);
//     } catch (err) {
//       console.error("Error fetching protected data:", err);
//       setError(`Failed to fetch protected data: ${err.message}`);
//     }
//   };

//   const handleUploadSuccess = (message) => {
//     setUploadMessage(message);
//     setCurrentView('list');
//     setError(null);
//   };

//   const handleUploadError = (message) => {
//     setUploadMessage(message);
//     setError(message);
//   };

//   return (
//     <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
//       <AppBar position="static" color="transparent" elevation={0} sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
//         <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
//           {/* Logo Icon and Text (Clickable to Home Page) */}
//           <Box 
//             sx={{ 
//               flexGrow: 1, 
//               display: 'flex', 
//               alignItems: 'center', 
//               gap: '10px', 
//               cursor: 'pointer' // <--- ADD CURSOR POINTER
//             }} 
//             onClick={() => { // <--- ADD ONCLICK HANDLER
//               setCurrentView('home'); 
//               setSelectedNoteId(null); 
//               setUploadMessage(null); 
//               setError(null); 
//               setCurrentQuizId(null); 
//             }}
//           >
//             <img src={logo} alt="NoteVerse Logo" style={{ height: '48px', verticalAlign: 'middle' }} />
//             <Typography variant="h5" component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
//               NoteVerse
//             </Typography>
//           </Box>
//           {/* --- Authentication and Navigation Section --- */}
//           {user ? ( // If user is logged in
//             <Box sx={{ display: 'flex', gap: { xs: '5px', sm: '10px' }, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
//               {/* <Typography variant="subtitle1" sx={{ alignSelf: 'center', color: 'text.primary', mr: 1 }}>
//                 Welcome, {user.displayName || user.email}!
//               </Typography>
//               <Button variant="contained" color="error" onClick={handleSignOut} sx={{ textTransform: 'none' }}>
//                 Sign Out
//               </Button>
//                */}
//               {/* Navigation buttons for authenticated users */}
//               <Button
//                 variant="text" // Text variant for subtle navbar links
//                 onClick={() => { setCurrentView('dashboard'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'dashboard' ? 'primary' : 'inherit'} // Inherit for default, primary for active
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'dashboard' ? 'bold' : 'normal' }}
//               >
//                 Dashboard
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('list'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'list' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'list' ? 'bold' : 'normal' }}
//               >
//                 My Notes
//               </Button>
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('revision'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }}
//                 color={currentView === 'revision' ? 'primary' : 'inherit'}
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'revision' ? 'bold' : 'normal' }}
//               >
//                 Revision
//               </Button>
//               {/* <Button
//                 variant="text"
//                 onClick={() => {  Placeholder for Quizzes List  setUploadMessage(null); setError(null); }} // No quiz list yet
//                 color="inherit" // Default color
//                 sx={{ textTransform: 'none', ml: 1 }}
//               >
//                 Quizzes
//               </Button> */}
//               <Button
//                 variant="text"
//                 onClick={() => { /* Placeholder for Games */ setUploadMessage(null); setError(null); }} // No games yet
//                 color="inherit"
//                 sx={{ textTransform: 'none', ml: 1 }}
//               >
//                 Game Center
//               </Button>
//               {/* Profile Icon (can use IconButton with AccountCircleIcon) */}
//               <Button
//                 variant="text"
//                 onClick={() => { setCurrentView('profile'); setSelectedNoteId(null); setUploadMessage(null); setError(null); setCurrentQuizId(null); }} // <--- ADD NAVIGATION
//                 color={currentView === 'profile' ? 'primary' : 'inherit'} // <--- Set active color
//                 sx={{ textTransform: 'none', ml: 1, fontWeight: currentView === 'profile' ? 'bold' : 'normal' }} // <--- Set active font weight
//               >
//                 Profile
//               </Button>
//             </Box>
//           ) : ( // If user is NOT logged in, show only HomePage related buttons/links in AppBar
//             <Box sx={{ display: 'flex', gap: { xs: '5px', sm: '10px' }, flexWrap: 'wrap', justifyContent: 'center' }}>
//                 {/* Example of "Sign In" button in Navbar for unauthenticated state */}
//                 <Button
//                     variant="contained"
//                     color="primary"
//                     onClick={handleGoogleSignIn}
//                     sx={{ textTransform: 'none', ml: 1 }}
//                 >
//                     Sign In
//                 </Button>
                
//             </Box>
//           )}
//         </Toolbar>
//       </AppBar>

//       {/* Display messages below AppBar */}
//       {uploadMessage && (
//         <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold', color: uploadMessage.includes('failed') || uploadMessage.includes('Error') ? 'error.main' : 'success.main' }}>
//           {uploadMessage}
//         </Typography>
//       )}
//       {error && (
//         <Typography variant="body1" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
//           Error: {error}
//         </Typography>
//       )}
      
//       {/* Main content area */}
//       <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
//         {user ? (
//           currentView === 'upload' ? (
//               <UploadNote onUploadSuccess={handleUploadSuccess} onError={handleUploadError} />
//           ) : currentView === 'detail' && selectedNoteId ? (
//               <NoteDetail
//                   noteId={selectedNoteId}
//                   onBack={() => { setCurrentView('list'); setSelectedNoteId(null); }}
//                   onError={(msg) => setError(msg)}
//                   onQuizGenerated={(quizId) => { setCurrentView('quiz'); setCurrentQuizId(quizId); }}
//               />
//           ) : currentView === 'quiz' && currentQuizId ? (
//               <QuizTaker
//                   quizId={currentQuizId}
//                   onBack={() => { setCurrentView('list'); setCurrentQuizId(null); }}
//                   onError={(msg) => setError(msg)}
//               />
//           ) : currentView === 'revision' ? (
//               <RevisionWindow
//                   onBack={() => { setCurrentView('list'); }}
//                   onError={(msg) => setError(msg)}
//               />
//           ) : currentView === 'dashboard' ? (
//               <Dashboard
//                   onError={(msg) => setError(msg)}
//                   userDisplayName={user?.displayName || user?.email || ''}
//               />
//            ) : currentView === 'profile' ? (
//             <Profile
//                 onBack={() => { setCurrentView('dashboard'); }}
//                 userDisplayName={user?.displayName || user?.email || ''}
//                 userEmail={user?.email || ''}
//                 onError={(msg) => setError(msg)}
//                 onSignOut={handleSignOut} {/* <--- ADD THIS PROP */}
//             />
//           ) : ( // Default to 'list' view if user is logged in
//               <NoteList
//                   onSelectNote={(id) => { setCurrentView('detail'); setSelectedNoteId(id); }}
//                   onError={(msg) => setError(msg)}
//                   onNavigateToUpload={() => { setCurrentView('upload'); }}
//               />
//           )
//         ) : ( // If user is NOT logged in, show the HomePage
//             <HomePage
//                 onSignIn={handleGoogleSignIn}
//                 isAuthenticated={isAuthenticated}
//                 userDisplayName={user?.displayName || user?.email || ''}
//             />
//         )}
//       </Box>

//       {/* Footer Section - This footer is part of App.jsx, can be a separate component too */}
//       <Box sx={{ mt: 'auto', py: 2, px: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', color: 'text.secondary', fontSize: '0.9em', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px' }}>
//         <Typography variant="body2" component="span">About</Typography>
//         <Typography variant="body2" component="span">Privacy</Typography>
//         <a href="https://github.com/your-username/NoteVerse" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
//             <Typography variant="body2" component="span">GitHub</Typography>
//         </a>
//         <a href="https://linkedin.com/in/your-linkedin" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
//             <Typography variant="body2" component="span">LinkedIn</Typography>
//         </a>
//         <Typography variant="body2" component="span">Contact</Typography>
//       </Box>
//     </Box>
//   );
// }

// export default App;
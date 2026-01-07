import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, List, ListItem, ListItemText, ListItemSecondaryAction, CircularProgress } from '@mui/material';
import { getAuth } from 'firebase/auth';

function QuizzesList({ onSelectQuiz, onError }) {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        const fetchQuizzes = async () => {
            setLoading(true);
            setFetchError(null);
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                setFetchError("User not authenticated.");
                setLoading(false);
                return;
            }

            try {
                const token = await user.getIdToken();
                // A new endpoint is required to fetch a list of quizzes for the user.
                // Assuming we'll add one like /api/my-quizzes
                const response = await fetch('/api/my-quizzes', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to fetch quizzes.');
                }
                setQuizzes(data.quizzes || []); // Ensure quizzes is an array
            } catch (error) {
                console.error("Failed to fetch quizzes:", error);
                setFetchError(error.message);
                onError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [onError]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
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

    if (quizzes.length === 0) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="info" sx={{ mt: 2 }}>
                    You have not generated any quizzes yet. Go to your notes to generate one!
                </Alert>
            </Box>
        );
    }
    
    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                My Quizzes
            </Typography>
            <List sx={{ width: '100%', maxWidth: 600, bgcolor: 'background.paper', mx: 'auto', mt: 2, borderRadius: 2 }}>
                {quizzes.map((quiz) => (
                    <ListItem
                        key={quiz.id}
                        button
                        onClick={() => onSelectQuiz(quiz.id)}
                        sx={{ borderBottom: '1px solid #e0e0e0', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <ListItemText 
                            primary={`Quiz on: ${quiz.note_title || "Untitled Note"}`}
                            secondary={`Generated on: ${new Date(quiz.generation_date * 1000).toLocaleDateString()}`}
                        />
                        <ListItemSecondaryAction>
                            <Button variant="contained" size="small">Take Quiz</Button>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}

export default QuizzesList;

// Old Code 2:36 PM 21/08
// import React from 'react';
// import { Box, Typography, Button, Alert, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';

// function QuizzesList({ onSelectQuiz }) {
//     const handleSelectQuiz = (quizId) => {
//         // This is a placeholder. In a real app, you would fetch a list of quizzes
//         // from the backend and pass their IDs to this handler.
//         onSelectQuiz(quizId);
//     };

//     return (
//         <Box sx={{ p: 4 }}>
//             <Typography variant="h4" component="h1" gutterBottom>
//                 My Quizzes
//             </Typography>
//             <Alert severity="info" sx={{ mt: 2 }}>
//                 This section is under construction. It will soon display a list of all your generated quizzes.
//             </Alert>
//             <Typography variant="h6" sx={{ mt: 4 }}>
//                 Example Quizzes (Mock Data)
//             </Typography>
//             <List sx={{ width: '100%', maxWidth: 500, bgcolor: 'background.paper', mt: 2 }}>
//                 <ListItem
//                     button
//                     onClick={() => handleSelectQuiz("mock-quiz-1")}
//                 >
//                     <ListItemText primary="Quiz on Chapter 1: Machine Learning" secondary="Generated from 'ML_Notes.pdf'" />
//                     <ListItemSecondaryAction>
//                         <Button variant="contained" size="small">Take Quiz</Button>
//                     </ListItemSecondaryAction>
//                 </ListItem>
//                  <ListItem
//                     button
//                     onClick={() => handleSelectQuiz("mock-quiz-2")}
//                 >
//                     <ListItemText primary="Quiz on Python Basics" secondary="Generated from 'Python_Syntax.png'" />
//                     <ListItemSecondaryAction>
//                         <Button variant="contained" size="small">Take Quiz</Button>
//                     </ListItemSecondaryAction>
//                 </ListItem>
//             </List>
//             <Box sx={{ mt: 4 }}>
//                 <Typography variant="body1">
//                     Quizzes are generated from your notes. Go to "My Notes" and select a note to generate a quiz.
//                 </Typography>
//             </Box>
//         </Box>
//     );
// }

// export default QuizzesList;
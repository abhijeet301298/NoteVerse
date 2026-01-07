// frontend/src/components/QuizTaker.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, CircularProgress, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Paper } from '@mui/material';

function QuizTaker({ quizId, onBack, onError }) {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setApiError(null);
      const token = localStorage.getItem('firebaseIdToken');
      if (!token) {
        onError("Authentication token missing. Please sign in.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`http://localhost:5000/api/quizzes/${quizId}`, { // Full URL
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setQuizData(data.quiz);
      } catch (error) {
        console.error("Error fetching quiz:", error);
        setApiError(`Failed to load quiz: ${error.message}`);
        onError(`Failed to load quiz: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    } else {
      setLoading(false);
      setApiError("No quiz selected.");
    }
  }, [quizId, onError]);

  const handleOptionSelect = (event) => {
    if (!quizCompleted && !showCorrectAnswer) {
      setSelectedOption(event.target.value);
    }
  };

  const handleSubmitAnswer = () => {
    if (!quizData || !quizData.quiz_questions) return;
    const currentQuestion = quizData.quiz_questions[currentQuestionIndex];
    
    setShowCorrectAnswer(true);
    if (selectedOption === currentQuestion.correct_answer) {
      setScore(prevScore => prevScore + 1);
    }
  };

  const handleNextQuestion = () => {
    setShowCorrectAnswer(false);
    setSelectedOption(null);
    if (currentQuestionIndex < quizData.quiz_questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizCompleted(false);
    setShowCorrectAnswer(false);
  };


  if (loading) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
        <CircularProgress color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }} color="text.primary">Loading quiz...</Typography>
      </Box>
    );
  }

  if (apiError) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="error">Error: {apiError}</Typography>
        <Button variant="contained" onClick={onBack} sx={{ mt: 2, backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none' }}>Back to Notes</Button>
      </Box>
    );
  }

  if (!quizData || !quizData.quiz_questions || quizData.quiz_questions.length === 0) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="text.primary">Quiz not found or contains no questions.</Typography>
        <Button variant="contained" onClick={onBack} sx={{ mt: 2, backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none' }}>Back to Notes</Button>
      </Box>
    );
  }

  const currentQuestion = quizData.quiz_questions[currentQuestionIndex];

  return (
    <Box sx={{ padding: '20px', maxWidth: '900px', margin: '20px auto', backgroundColor: 'background.paper', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', color: 'text.primary', textAlign: 'left' }}>
      <Button variant="contained" onClick={onBack} sx={{ backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none', mb: 3 }}>Back to Notes</Button>
      <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'text.primary', textAlign: 'center', mb: 3 }}>
        Quiz from Note: {quizData.note_id.substring(0, 8)}...
      </Typography>
      
      {!quizCompleted ? (
        <Paper elevation={1} sx={{ p: 3, backgroundColor: 'background.default', border: '1px solid #ddd' }}>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>
            Question {currentQuestionIndex + 1} of {quizData.quiz_questions.length}
          </Typography>
          <Typography variant="h6" component="h3" gutterBottom sx={{ color: 'text.primary', mb: 3, fontWeight: 'bold' }}>
            {currentQuestion.question}
          </Typography>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend" sx={{ display: 'none' }}>Options</FormLabel>
            <RadioGroup name="quiz-options" value={selectedOption} onChange={handleOptionSelect}>
              {currentQuestion.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={
                    <Typography
                      variant="body1"
                      sx={{
                        color: showCorrectAnswer ? (option === currentQuestion.correct_answer ? 'success.main' : (selectedOption === option ? 'error.main' : 'text.primary')) : 'text.primary',
                        fontWeight: showCorrectAnswer && option === currentQuestion.correct_answer ? 'bold' : 'normal',
                      }}
                    >
                      {option}
                    </Typography>
                  }
                  sx={{
                    width: '100%', mb: 1,
                    backgroundColor: showCorrectAnswer ? (option === currentQuestion.correct_answer ? 'success.light' : (selectedOption === option ? 'error.light' : 'background.paper')) : (selectedOption === option ? 'primary.light' : 'background.paper'),
                    borderRadius: '4px',
                    '&:hover': { backgroundColor: showCorrectAnswer ? 'inherit' : 'action.hover' },
                    pointerEvents: showCorrectAnswer ? 'none' : 'auto',
                  }}
                />
              ))}
            </RadioGroup>
          </FormControl>

          {!showCorrectAnswer && (
            <Button
              variant="contained"
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
              color="primary"
              sx={{ textTransform: 'none', mt: 2, width: '100%' }}
            >
              Submit Answer
            </Button>
          )}
          {showCorrectAnswer && (
            <Button
              variant="contained"
              onClick={handleNextQuestion}
              color="success"
              sx={{ textTransform: 'none', mt: 2, width: '100%' }}
            >
              {currentQuestionIndex < quizData.quiz_questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
          )}
        </Paper>
      ) : (
        <Paper elevation={1} sx={{ p: 3, backgroundColor: 'background.default', border: '1px solid #ddd', textAlign: 'center' }}>
          <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
            Quiz Completed!
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
            Your Score: {score} out of {quizData.quiz_questions.length}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <Button variant="contained" onClick={handleRestartQuiz} color="warning" sx={{ color: 'text.primary', '&:hover': { backgroundColor: 'warning.dark' }, textTransform: 'none' }}>
              Restart Quiz
            </Button>
            <Button variant="contained" onClick={onBack} sx={{ backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none' }}>
              Back to Notes
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default QuizTaker;
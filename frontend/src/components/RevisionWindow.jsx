// frontend/src/components/RevisionWindow.jsx
import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Paper, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

function RevisionWindow({ onBack, onError }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setApiError("Please enter a question.");
      return;
    }

    setLoading(true);
    setApiError(null);
    setAnswer(null);
    setSources([]);

    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      onError("Authentication token missing. Please sign in.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/rag-query', { // Full URL
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: question })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
      console.log("RAG Answer:", data.answer);
      console.log("RAG Sources:", data.sources);

    } catch (error) {
      console.error("Error asking RAG query:", error);
      setApiError(`Failed to get answer: ${error.message}`);
      onError(`Failed to get answer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
        <CircularProgress color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }} color="text.primary">Retrieving and generating answer...</Typography>
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

  return (
    <Box sx={{ padding: '20px', maxWidth: '900px', margin: '20px auto', backgroundColor: 'background.paper', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', color: 'text.primary', textAlign: 'left' }}>
      <Button variant="contained" onClick={onBack} sx={{ backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none', mb: 3 }}>
        Back to Notes
      </Button>
      
      <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'text.primary', textAlign: 'center', mb: 3 }}>
        Ask Your Notes!
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', mb: 4 }}>
        <TextField
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your notes (e.g., 'What is sequential data?')"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
        />
        <Button
          variant="contained"
          onClick={handleAskQuestion}
          disabled={loading}
          color="primary"
          sx={{ textTransform: 'none', py: 1.5 }}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </Button>
      </Box>

      {apiError && <Typography variant="body1" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>Error: {apiError}</Typography>}

      {answer && (
        <Paper elevation={1} sx={{ p: 3, mt: 4, backgroundColor: 'background.default', border: '1px solid #ddd' }}>
          <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
            Answer:
          </Typography>
          <Typography variant="body1" sx={{ fontSize: '1em', lineHeight: '1.6', color: 'text.primary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {answer}
          </Typography>

          {sources.length > 0 && (
            <Box sx={{ mt: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 1 }}>Sources (from your notes):</Typography>
              <List dense>
                {sources.map((source, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemText 
                      primary={<Typography variant="body2" color="text.primary">{source.original_filename} (Chunk: {source.chunk_id ? source.chunk_id.substring(source.chunk_id.lastIndexOf('_') + 1) : 'N/A'})</Typography>} 
                      secondary={<Typography variant="caption" color="text.secondary">Note ID: {source.note_id}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                The answer is generated based on information found in these sections of your notes.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default RevisionWindow;
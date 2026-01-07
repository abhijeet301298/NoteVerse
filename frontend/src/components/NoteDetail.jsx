// frontend/src/components/NoteDetail.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, CircularProgress, Link, Paper } from '@mui/material';

function NoteDetail({ noteId, onBack, onError, onQuizGenerated }) {
  const [note, setNote] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    const fetchNoteDetailsAndResources = async () => {
      setLoading(true);
      setApiError(null);
      const token = localStorage.getItem('firebaseIdToken');
      if (!token) {
        onError("Authentication token missing. Please sign in.");
        setLoading(false);
        return;
      }

      try {
        const noteResponse = await fetch(`http://localhost:5000/api/my-notes?note_id=${noteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!noteResponse.ok) {
          const errorData = await noteResponse.json();
          throw new Error(errorData.message || `HTTP error! status: ${noteResponse.status}`);
        }
        const noteData = await noteResponse.json();
        setNote(noteData.notes[0] || null);

        const resourcesResponse = await fetch(`http://localhost:5000/api/notes/${noteId}/resources`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resourcesResponse.ok) {
          const errorData = await resourcesResponse.json();
          throw new Error(errorData.message || `HTTP error! status: ${resourcesResponse.status}`); // Corrected error reference
        }
        const resourcesData = await resourcesResponse.json();
        setResources(resourcesData.videos || []);

      } catch (error) {
        console.error("Error fetching note details or resources:", error);
        setApiError(`Failed to load details: ${error.message}`);
        onError(`Failed to load details: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (noteId) {
      fetchNoteDetailsAndResources();
    } else {
      setLoading(false);
      setApiError("No note selected.");
    }
  }, [noteId, onBack, onError]);

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setApiError(null);
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      onError("Authentication token missing. Please sign in.");
      setGeneratingQuiz(false);
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/notes/${noteId}/generate-quiz`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Generated Quiz:", data.quiz);
      alert(data.message);

      if (onQuizGenerated && data.quiz_id) {
        onQuizGenerated(data.quiz_id);
      }

    } catch (error) {
      console.error("Error generating quiz:", error);
      setApiError(`Quiz generation failed: ${error.message}`);
      onError(`Quiz generation failed: ${error.message}`);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
        <CircularProgress color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }} color="text.primary">Loading note details...</Typography>
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

  if (!note) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" color="text.primary">Note not found.</Typography>
        <Button variant="contained" onClick={onBack} sx={{ mt: 2, backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none' }}>Back to Notes</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '20px auto', backgroundColor: 'background.paper', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', color: 'text.primary', textAlign: 'left' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button variant="contained" onClick={onBack} sx={{ backgroundColor: 'grey.600', '&:hover': { backgroundColor: 'grey.700' }, textTransform: 'none' }}>Back to Notes</Button>
        <Button
          variant="contained"
          onClick={handleGenerateQuiz}
          disabled={generatingQuiz}
          sx={{ backgroundColor: 'primary.dark', '&:hover': { backgroundColor: 'primary.main' }, textTransform: 'none' }}
        >
          {generatingQuiz ? 'Generating Quiz...' : 'Generate Quiz'}
        </Button>
      </Box>
      
      <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'text.primary', mb: 3, textAlign: 'center' }}>
        Note: {note.filename}
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: 'background.default', border: '1px solid #dee2e6' }}>
        <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
          Extracted Text
        </Typography>
        <Typography variant="body1" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '400px', overflowY: 'auto', fontSize: '0.95em', lineHeight: '1.6', color: 'text.secondary' }}>
          {note.extracted_text}
        </Typography>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: 'background.default', border: '1px solid #dde1e2' }}>
        <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
          Topics/Keywords
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '0.9em' }}>
          {note.topics.length > 0 ? note.topics.join(', ') : 'No keywords extracted.'}
        </Typography>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: 'background.default', border: '1px solid #ddd' }}>
        <Typography variant="h5" component="h3" gutterBottom sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
          Related YouTube Resources
        </Typography>
        {resources.length > 0 ? (
          <Grid container spacing={2}>
            {resources.map(video => (
              <Grid item xs={12} sm={6} md={4} key={video.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-3px)' } }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Link href={video.url} target="_blank" rel="noopener noreferrer" underline="none" sx={{ display: 'block', mb: 1 }}>
                      <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: 'auto', borderRadius: '4px' }} />
                    </Link>
                    <Typography variant="subtitle1" component="h4" sx={{ color: 'text.primary', mb: 0.5, lineHeight: 1.2, maxHeight: '2.4em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {video.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8em', maxHeight: '3.6em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {video.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body1" color="text.secondary">No related videos found for these keywords.</Typography>
        )}
      </Paper>
    </Box>
  );
}

export default NoteDetail;
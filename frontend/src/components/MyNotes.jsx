import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { BookOpenIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// This is a mock data structure to demonstrate the hierarchical index.
// In a real application, this would be generated from your notes data.
const mockTopics = [
  {
    title: 'History',
    subtopics: [{ title: 'The Industrial Revolution' }, { title: 'The Roman Republic' }],
  },
  {
    title: 'Machine Learning',
    subtopics: [
      { title: 'Optimization Techniques', subtopics: [{ title: 'Constrained Optimization' }] },
      { title: 'Regression Models' },
    ],
  },
  {
    title: 'Programming',
    subtopics: [{ title: 'Python for Data Science' }],
  },
  {
    title: 'Science',
    subtopics: [{ title: 'Introduction to Chemistry' }],
  },
];

const MyNotesPage = () => {
  // Use state to manage the notes, topics, search term, and loading status.
  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState(mockTopics.sort((a, b) => a.title.localeCompare(b.title)));
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [db, setDb] = useState(null);

  // useEffect to handle Firebase setup and listen for auth state changes
  useEffect(() => {
    try {
      const auth = getAuth();
      const firestore = getFirestore();
      setDb(firestore);

      // Listen for auth state changes to get the current user ID
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(null);
          setLoading(false);
        }
      });
  
      return () => unsubscribeAuth();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      setLoading(false);
    }
  }, []);

  // useEffect to fetch and sort notes once the user ID is available
  useEffect(() => {
    if (db && userId) {
      const notesCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/notes`);
      
      // Query notes, ordered by timestamp in descending order
      const q = query(notesCollectionRef, orderBy('timestamp', 'desc'));

      // Listen for real-time updates to the notes
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedNotes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Update the main notes state
        setNotes(fetchedNotes);
        setLoading(false);
      }, (error) => {
        console.error("Failed to fetch notes:", error);
        setLoading(false);
      });

      // Cleanup function to detach the listener
      return () => unsubscribe();
    }
  }, [db, userId]);

  // useEffect to handle the search logic and recent notes display
  useEffect(() => {
    if (searchTerm.trim() === '') {
      // If search term is empty, display the 5 most recent notes.
      setFilteredNotes(notes.slice(0, 5));
    } else {
      // Find notes where the title or any keyword includes the search term.
      const results = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (note.keywords && note.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchTerm.toLowerCase())
          ))
      );
      // Display the top 5 search results.
      setFilteredNotes(results.slice(0, 5));
    }
  }, [searchTerm, notes]);

  // A recursive component to render nested topics.
  const TopicList = ({ topics, level = 0 }) => {
    return (
      <ul className={`pl-${level * 4} mt-2`}>
        {topics.map((topic, index) => (
          <li key={index} className={`mb-1`}>
            <span className={`font-medium ${level === 0 ? 'text-lg text-blue-300' : 'text-gray-100'}`}>
              {topic.title}
            </span>
            {topic.subtopics && topic.subtopics.length > 0 && (
              <TopicList topics={topic.subtopics} level={level + 1} />
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white text-2xl">
        Loading notes...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start p-6 min-h-screen bg-gray-900 text-white font-sans">
      <div className="w-full max-w-4xl">
        {/* Page Title */}
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-8">
          My Notes
        </h1>
        {/* User ID display for debugging and collaboration purposes */}
        <p className="text-sm text-gray-400 mb-4">User ID: {userId || 'N/A'}</p>

        {/* Search Input Section */}
        <div className="relative mb-8 w-full">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
          <input
            type="text"
            placeholder="Search for a note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 pl-12 pr-4 bg-gray-800 rounded-xl text-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes Display Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Most Recent Notes Section */}
          <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-white flex items-center">
              <ClockIcon className="h-6 w-6 text-yellow-400 mr-2" />
              Recent Notes
            </h2>
            <ul className="space-y-4">
              {filteredNotes.length > 0 ? (
                filteredNotes.map((note) => (
                  <li
                    key={note.id}
                    className="p-4 bg-gray-700 rounded-xl transition-transform duration-200 hover:scale-105 hover:bg-gray-600 cursor-pointer"
                  >
                    <h3 className="text-lg font-bold text-gray-100">{note.title}</h3>
                    <p className="text-sm text-gray-400 truncate">
                      {note.content}
                    </p>
                  </li>
                ))
              ) : (
                <p className="text-gray-400 italic">No notes found.</p>
              )}
            </ul>
          </div>

          {/* Topics List Section */}
          <div className="bg-gray-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-white flex items-center">
              <BookOpenIcon className="h-6 w-6 text-cyan-400 mr-2" />
              Topics (Index)
            </h2>
            <TopicList topics={topics} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyNotesPage;

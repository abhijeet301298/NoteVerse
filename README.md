# NoteVerse
**NoteVerse** is an innovative tool designed to transform the way college students manage their notes and study for exams. By leveraging AI, it allows students to digitally organize handwritten notes and reinforce their learning through AI-generated quizzes.
 
-----------------------------
**✨ Features**

- Digital Note Organization: Upload handwritten notes (from paper or PDFs) and organize them topic-wise in a clean, digital format.

- AI-Powered Quizzes: Generate interactive quizzes from your notes to test your understanding and reinforce key concepts.

- Efficient Learning: Move beyond static notes. Actively engage with your study material to improve retention and recall.
----------------------------------

**Prerequisites**


Make sure you have the following installed:

    Node.js (for the frontend)
    Python 3.x (for the backend)
    Git

---------------------------------------------

**Installation**
1. **Clone the repository:**

        git clone https://github.com/Sohel-Modi/NoteVerse.git
        cd NoteVerse

2. **Set up the backend:**

        cd backend
        python -m venv venv
        source venv/bin/activate  # On Windows, use: venv\Scripts\activate
        pip install -r requirements.txt


    Note: Create a .env file in the backend directory with your necessary API keys and configurations (e.g., OpenAI API key).


3. **Set up the frontend:**

        cd ../frontend
        npm install

    Note: Create a .env file in the frontend directory with your Firebase   configuration and other necessary environment variables.



--------------------

**💻 Usage**


1. **Start the backend server:**

    From the backend directory, run:

        python app.py



2. **Start the frontend development server:**

    From the frontend directory, run:

        npm run dev



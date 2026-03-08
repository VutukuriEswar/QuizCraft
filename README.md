What is QuizCraft?
QuizCraft is an intelligent NLP-powered web application that transforms static study material into dynamic assessments. It automates the tedious task of question creation by extracting text from various document formats, analyzing linguistic structures, and generating quizzes with smart distractors. Designed for educators and students, it turns lecture notes into study guides in seconds.

Key Features
📄 Multi-Format Document Parsing

File Support: Extracts text from PDFs, Word Documents (.docx), PowerPoint Presentations (.pptx), and plain text files.
Raw Text Input: Users can simply paste text content directly into the interface for quick generation.
🧠 NLP-Driven Question Generation

Structural Analysis: Uses NLTK Part-of-Speech (POS) tagging to identify subjects, verbs, and definitions within sentences.
Smart Patterns: Detects definition patterns ("X is Y") to generate "What is...?" questions and uses fill-in-the-blank logic for factual statements.
Sentence Filtering: Automatically filters out sentences that are too short or too long to ensure question quality.
🎯 Intelligent Distractor Engine

WordNet Integration: Utilizes NLTK WordNet to generate semantically relevant distractors (wrong answers) for MCQs.
Semantic Relations: Pulls distractors from synsets, hypernyms, and hyponyms to ensure options look plausible but are distinct.
Fallback Logic: Ensures valid question structures even if semantic data is unavailable.
⚡ Customizable Configuration

Dynamic Sections: Define exactly how many questions you want, the marks per question, and the type (MCQ, MSQ, Theoretical).
Weighted Quizzes: Create balanced tests by mixing high-mark theoretical questions with low-mark objective questions.
💾 Module Management

Study Hub: Save course content as "Modules" in the database for future use.
Persistent Storage: MongoDB backend stores generated quizzes, user modules, and results.
Tech Stack
Backend:

Flask (Python web framework)
NLTK (Natural Language Toolkit for tokenization, POS tagging, and WordNet)
PyMongo for database interactions
PyPDF2, python-docx, python-pptx for file parsing
Frontend:

React for UI components
Framer Motion for smooth animations
Tailwind CSS & Shadcn UI for modern styling
Axios for API communication
Database:

MongoDB (NoSQL storage for modules and quizzes)
Quick Start Guide
Prerequisites
Python 3.8+
Node.js & npm/yarn
MongoDB (local or cloud)
Installation Steps
Clone the repository
Set up virtual environment
bash

python -m venv venv
venv\Scripts\activate  # On Linux: source venv/bin/activate
Install backend dependencies
bash

pip install flask flask-cors pymongo nltk python-docx python-pptx PyPDF2
(Note: NLTK data will download automatically on first run)

Configure Environment
Ensure your MongoDB instance is running. Update the Config class in your Python code with your MONGO_URI.
Run backend server
bash

python app.py
(Runs on port 8000 by default)

Open a new terminal and install frontend dependencies
bash

cd frontend
yarn install
yarn start
API Endpoints
Generation:

POST /api/generate-quiz - Accepts file/text and config JSON, returns generated questions.
Module Management:

GET /api/modules - Fetch saved study modules.
POST /api/modules - Save a new module (ID, Name, Content).
Results:

POST /api/results - Save quiz results (implied endpoint).
NLP Logic Details
Question Formulation:

Definition Detection: Splits sentences on keywords like "is", "are", "refers" to create "What is [Subject]?" questions.
Action Detection: Identifies Subject-Verb-Object relationships to frame questions about actions.
Blank Generation: Identifies nouns in sentences to create fill-in-the-blank style questions.
Distractor Generation:

Retrieves the Part-of-Speech tag for the correct answer.
Queries WordNet for words sharing the same meaning (synonyms) or category (hypernyms/hyponyms).
Randomizes and presents the top 3 semantic relatives as alternative options.
License
This project is licensed under the MIT License — see the LICENSE file for details.

© 2026 Eswar Vutukuri, Vutla Yasaswi Venkat

Acknowledgments
Thanks to the NLTK team for providing robust natural language processing tools, the WordNet creators for the lexical database, and the Flask/React communities for the excellent frameworks that made this project possible.
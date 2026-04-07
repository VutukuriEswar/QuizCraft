## What is QuizCraft?

QuizCraft is an intelligent, hybrid NLP and AI-powered web application designed to bridge the gap between teaching and learning. Whether you are a professor struggling to create high-quality assessments or a student trying to identify and strengthen your weak topics, QuizCraft transforms static study material into dynamic, interactive quizzes in seconds. It automates the tedious task of question creation while providing a self-paced environment for deep self-evaluation.

## Key Features

📝 **For Educators: Effortless Assessment Creation**
- **Instant Test Papers:** Paste your lecture notes or upload a textbook chapter, and instantly generate a balanced, marks-weighted question paper.
- **Multiple Formats:** Export cleanly formatted quizzes with a single click—copy as text for LMS integration or print directly to PDF for in-class exams.
- **Answer Keys Made Easy:** Choose to export with or without answers, making it seamless to distribute tests to students while keeping the grading key secure.
- **Customizable Configurations:** Define exactly how many Single Choice, Multiple Choice, or True/False questions you need, and assign custom marks to each section.

🎓 **For Students: Smart Self-Assessment & Gap Analysis**
- **Interactive Practice Mode:** Take generated quizzes in a distraction-free, fullscreen environment that simulates a real exam.
- **Identify Weak Areas:** Questions are engineered to test deep understanding rather than rote memorization, helping you instantly pinpoint concepts you haven't fully grasped.
- **Instant Feedback & Explanations:** View detailed results immediately after submission, including your score, correct answers, and explanations for why your answer was wrong.
- **Review & Retake:** Easily toggle between hiding and showing answers while reviewing, and retake quizzes as many times as needed until you master the material.

📄 **Multi-Format Document Parsing**
- **File Support:** Extracts text from PDFs, Word Documents (`.docx`), PowerPoint Presentations (`.pptx`), and plain text files.
- **Raw Text Input:** Users can simply paste text content directly into the interface for quick generation.

🧠 **Dual-Engine Question Generation**
- **AI-Powered Engine:** Uses advanced AI to generate highly contextual, conceptual, and reasoning-based questions with plausible distractors.
- **NLP Fallback Engine:** If AI is unavailable, seamlessly falls back to a robust local NLP engine using NLTK for POS tagging and smart pattern matching.
- **Zero-Hallucination Safeguards:** Strict prompting ensures the system only asks about concepts explicitly mentioned in the provided text—no surprises.

📦 **Advanced Export System**
- **Clipboard Copy:** Instantly copy the entire quiz as formatted text.
- **Print / PDF:** Open a cleanly formatted print view to save directly as a PDF.
- **Flexible Options:** Export with correct answers (for answer keys) or without answers (for actual test papers).

## Tech Stack

**Backend:**
- Flask (Python web framework)
- NLTK (Natural Language Toolkit for tokenization, POS tagging, and WordNet)
- PyMuPDF, python-docx, python-pptx for file parsing
- Requests & OpenRouter API for AI capabilities
- PyMongo for database interactions

**Frontend:**
- React for UI components
- Framer Motion for smooth animations
- Tailwind CSS & Shadcn UI for modern styling
- Axios for API communication

**Database:**
- MongoDB (NoSQL storage for modules and quizzes)

## Quick Start Guide

### Prerequisites
- Python 3.8+
- Node.js & npm/yarn
- MongoDB (local or cloud)
- OpenRouter API Key (Optional, for AI features. App works fully offline with NLP fallback).

### Installation Steps

1. **Clone the repository**

2. **Set up virtual environment**
```bash
python -m venv venv
venv\Scripts\activate  # On Linux: source venv/bin/activate
```

3. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
```
*(Note: NLTK data will download automatically on first run)*

4. **Configure Environment**
Ensure your MongoDB instance is running. Update the `Config` class in your Python code with your `MONGO_URI`.
*(Optional)* To enable AI question generation, set the `OPENROUTER_API_KEY` environment variable.

5. **Run backend server**
```bash
python server.py
```
*(Runs on port 8000 by default)*

6. **Open a new terminal and install frontend dependencies**
```bash
cd frontend
yarn install
yarn start
```

## API Endpoints

**Generation:**
- POST /api/generate-quiz - Accepts file/text and config JSON, returns generated questions.

**Module Management:**
- GET /api/modules - Fetch saved study modules.
- POST /api/modules - Save a new module (ID, Name, Content).

**Quizzes:**
- GET /api/quizzes - Fetch all saved quizzes (metadata only).
- POST /api/save-quiz - Save a generated quiz to the database.

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

© 2026 Eswar Vutukuri, Vutla Yasaswi Venkat

## Acknowledgments

Thanks to the NLTK team for providing robust natural language processing tools, the WordNet creators for the lexical database, the Flask/React communities for the excellent frameworks, and OpenRouter for making powerful LLMs accessible for educational tools.
import nltk
import os
import json
import uuid
import logging
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from services import QuizGenerator, FileProcessor

logging.basicConfig(level=logging.INFO)

def download_nltk_data():
    resources = [
        'punkt', 'punkt_tab', 'stopwords', 'wordnet',
        'omw-1.4', 'averaged_perceptron_tagger', 'averaged_perceptron_tagger_eng'
    ]
    for resource in resources:
        try:
            nltk.download(resource, quiet=True)
        except Exception:
            pass

download_nltk_data()

MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/quiz')
SECRET_KEY = os.environ.get('SECRET_KEY', 'quiz_craft_secret_key')

client = None
db = None

def init_db():
    global client, db
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, uuidRepresentation='standard')
        client.admin.command('ismaster')
        db = client.get_database()
        logging.info("Database connected successfully.")
    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        db = None

init_db()

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

class ModuleModel:
    def __init__(self):
        self.collection = db.modules if db else None

    def add_module(self, data):
        if self.collection is None: return None
        data['module_id'] = str(uuid.uuid4())
        return self.collection.insert_one(data)

    def get_all_modules(self):
        if self.collection is None: return []
        return list(self.collection.find({}, {"_id": 0, "module_content": 0}))

class QuizModel:
    def __init__(self):
        self.collection = db.quizzes if db else None

    def create_quiz(self, data):
        if self.collection is None: return None
        data['quiz_id'] = str(uuid.uuid4())
        return self.collection.insert_one(data)

    def get_quiz_by_id(self, quiz_id):
        if self.collection is None: return None
        return self.collection.find_one({"quiz_id": quiz_id}, {"_id": 0})

    def get_all_quizzes(self):
        if self.collection is None: return []
        return list(self.collection.find({}, {"_id": 0, "questions": 0}))

app = Flask(__name__)
app.json_encoder = JSONEncoder
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECRET_KEY'] = SECRET_KEY
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def normalize_question_type(q_type):
    q_type = str(q_type).lower().strip()
    mapping = {
        "single choice": "mcq",
        "single_choice": "mcq",
        "multi choice": "msq",
        "multi_choice": "msq",
        "multiple choice": "mcq",
        "multiple_choice": "mcq",
        "true false": "true_false",
        "true/false": "true_false",
        "true_false": "true_false",
        "theoretical": "theoretical",
        "short answer": "theoretical",
        "short_answer": "theoretical",
        "mcq": "mcq",
        "msq": "msq",
    }
    return mapping.get(q_type, "mcq")

@app.route('/')
def index():
    return jsonify({"status": "success", "message": "QuizCraft NLP Engine is Running."})

@app.route('/api/modules', methods=['GET'])
def get_modules():
    model = ModuleModel()
    modules = model.get_all_modules()
    return jsonify({"status": "success", "data": {"modules": modules}})

@app.route('/api/modules', methods=['POST'])
def add_module():
    data = request.json
    if not data or 'module_name' not in data:
        return jsonify({"status": "error", "message": "Invalid module data"}), 400
    model = ModuleModel()
    result = model.add_module(data)
    if result:
        return jsonify({"status": "success", "message": "Module added successfully"}), 201
    return jsonify({"status": "error", "message": "Database not available"}), 500

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    text_content = ""

    if 'file' in request.files:
        file = request.files['file']
        if file.filename != '':
            text, error = FileProcessor.extract_text(file)
            if error:
                return jsonify({"error": error}), 400
            text_content = text or ""

    if 'text' in request.form:
        extra = request.form['text'].strip()
        if extra:
            text_content = (text_content + " " + extra).strip()

    if not text_content.strip():
        return jsonify({"error": "No content provided. Please paste text or upload a file."}), 400

    try:
        config_data = request.form.get('config', '[]')
        config_blocks = json.loads(config_data)
        if not isinstance(config_blocks, list):
            raise ValueError("Config must be a list")
        for block in config_blocks:
            block['type'] = normalize_question_type(block.get('type', 'mcq'))
            block['count'] = max(1, int(block.get('count', 1)))
            block['marks'] = max(1, int(block.get('marks', 1)))
    except Exception as e:
        return jsonify({"error": f"Invalid configuration: {str(e)}"}), 400

    if not config_blocks:
        config_blocks = [{"type": "mcq", "count": 5, "marks": 1}]

    try:
        generator = QuizGenerator()
        questions = generator.generate_from_text(text_content, config_blocks)
    except Exception as e:
        logging.error(f"Generation error: {e}", exc_info=True)
        return jsonify({"error": f"Quiz generation failed: {str(e)}"}), 500

    return jsonify({"questions": questions, "total": len(questions)})

@app.route('/api/save-quiz', methods=['POST'])
def save_quiz():
    data = request.json
    if not data or 'questions' not in data:
        return jsonify({"status": "error", "message": "Invalid quiz data"}), 400
    model = QuizModel()
    result = model.create_quiz(data)
    if result:
        return jsonify({"status": "success", "message": "Quiz saved", "quiz_id": data.get('quiz_id', '')}), 201
    return jsonify({"status": "error", "message": "Database error or not connected"}), 500

@app.route('/api/quizzes', methods=['GET'])
def get_quizzes():
    model = QuizModel()
    quizzes = model.get_all_quizzes()
    return jsonify({"status": "success", "data": quizzes})

if __name__ == '__main__':
    app.run(debug=True, port=8000)
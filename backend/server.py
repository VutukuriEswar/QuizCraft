import nltk
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from services import QuizGenerator, FileProcessor
from config import Config

def download_nltk_data():
    resources = [
        'punkt',
        'stopwords',
        'averaged_perceptron_tagger',
        'wordnet',
        'omw-1.4',
        'maxent_ne_chunker',
        'words',
        'punkt_tab',
        'averaged_perceptron_tagger_eng'
    ]
    for resource in resources:
        try:
            nltk.download(resource, quiet=True)
        except Exception as e:
            print(f"Error downloading NLTK resource {resource}: {e}")

download_nltk_data()

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)
app.config['UPLOAD_FOLDER'] = 'uploads'

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@app.route('/')
def index():
    return "QuizCraft AI Generation Engine is Running."

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    text_content = ""
    
    if 'file' in request.files:
        file = request.files['file']
        if file.filename != '':
            text, error = FileProcessor.extract_text(file)
            if error:
                return jsonify({"error": error}), 400
            text_content = text

    if 'text' in request.form:
        text_content += " " + request.form['text']

    if not text_content.strip():
        return jsonify({"error": "No content provided"}), 400

    try:
        config_data = request.form.get('config', '[]')
        config_blocks = json.loads(config_data)
    except Exception as e:
        return jsonify({"error": f"Invalid configuration format: {str(e)}"}), 400

    generator = QuizGenerator()
    questions = generator.generate_from_text(text_content, config_blocks)

    return jsonify({
        "questions": questions
    })

if __name__ == '__main__':
    app.run(debug=True, port=8000)
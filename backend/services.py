import re
import random
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords, wordnet
from nltk.stem import WordNetLemmatizer
from nltk import pos_tag
from docx import Document
from pptx import Presentation
from PyPDF2 import PdfReader

class FileProcessor:
    @staticmethod
    def extract_text(file_storage):
        filename = file_storage.filename
        text = ""
        try:
            if filename.endswith('.txt'):
                text = file_storage.read().decode('utf-8')
            elif filename.endswith('.docx'):
                doc = Document(file_storage)
                text = "\n".join([para.text for para in doc.paragraphs])
            elif filename.endswith('.pptx'):
                prs = Presentation(file_storage)
                for slide in prs.slides:
                    for shape in slide.shapes:
                        if hasattr(shape, "text"):
                            text += shape.text + "\n"
            elif filename.endswith('.pdf'):
                reader = PdfReader(file_storage)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            else:
                return None, "Unsupported file format"
        except Exception as e:
            return None, str(e)
        return text, None

class NLPProcessor:
    def __init__(self):
        self.stop_words = set(stopwords.words('english'))
        self.lemmatizer = WordNetLemmatizer()

    def clean_text(self, text):
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\s([?.!,"](?:\s|$))', r'\1', text)
        return text.strip()

    def normalize_sentence(self, sentence):
        return sentence.replace('e.g.', 'eg').replace('i.e.', 'ie')

    def tokenize_sentences(self, text):
        text = self.normalize_sentence(text)
        return sent_tokenize(text)

    def get_wordnet_pos(self, treebank_tag):
        if treebank_tag.startswith('J'):
            return wordnet.ADJ
        elif treebank_tag.startswith('V'):
            return wordnet.VERB
        elif treebank_tag.startswith('N'):
            return wordnet.NOUN
        elif treebank_tag.startswith('R'):
            return wordnet.ADV
        return wordnet.NOUN

    def get_distractors(self, word, pos_tag_str=None):
        distractors = []
        try:
            wn_pos = self.get_wordnet_pos(pos_tag_str) if pos_tag_str else wordnet.NOUN
            synsets = wordnet.synsets(word, pos=wn_pos)
            
            if synsets:
                for lemma in synsets[0].lemmas():
                    name = lemma.name().replace('_', ' ')
                    if name.lower() != word.lower():
                        distractors.append(name)
                
                for hyper in synsets[0].hypernyms():
                    for lemma in hyper.lemmas():
                        distractors.append(lemma.name().replace('_', ' '))
                        
                for hypo in synsets[0].hyponyms():
                    for lemma in hypo.lemmas():
                        distractors.append(lemma.name().replace('_', ' '))
            
            random.shuffle(distractors)
            unique_distractors = list(set(distractors))[:3]
            
            while len(unique_distractors) < 3:
                unique_distractors.append(f"Option {random.choice(['A', 'B', 'C'])}")
                
            return unique_distractors
        except:
            return ["Option A", "Option B", "Option C"]

nlp_processor = NLPProcessor()

class QuizGenerator:
    def generate_from_text(self, text, config_blocks):
        cleaned_text = nlp_processor.clean_text(text)
        sentences = nlp_processor.tokenize_sentences(cleaned_text)
        
        valid_sentences = []
        for s in sentences:
            if 5 < len(s.split()) < 50:
                valid_sentences.append(s)
        
        random.shuffle(valid_sentences)
        
        final_questions = []
        sentence_idx = 0

        for block in config_blocks:
            count = block.get('count', 1)
            marks = block.get('marks', 1)
            q_type = block.get('type', 'mcq')

            for _ in range(count):
                if sentence_idx >= len(valid_sentences):
                    break
                
                sentence = valid_sentences[sentence_idx]
                sentence_idx += 1
                
                q_obj = self.create_smart_question(sentence, q_type, marks)
                if q_obj:
                    final_questions.append(q_obj)
        
        return final_questions

    def create_smart_question(self, sentence, q_type, marks):
        tokens = word_tokenize(sentence)
        tags = pos_tag(tokens)
        
        has_verb = any(tag.startswith('VB') for word, tag in tags)
        
        if has_verb:
            return self.handle_grammatical_sentence(sentence, tags, q_type, marks)
        else:
            return self.handle_fragment_sentence(sentence, tags, q_type, marks)

    def handle_fragment_sentence(self, sentence, tags, q_type, marks):
        nouns = [word for word, tag in tags if tag.startswith('NN') and word.lower() not in nlp_processor.stop_words]
        
        if ':' in sentence:
            parts = sentence.split(':', 1)
            topic = parts[0].strip()
            definition = parts[1].strip()
            
            if len(definition.split()) > 3:
                question_text = f"What is {topic}?"
                answer = definition
                return self.build_q_obj(question_text, answer, sentence, q_type, marks, answer_type='phrase')

        if nouns:
            answer = random.choice(nouns)
            pattern = re.compile(re.escape(answer), re.IGNORECASE)
            question_text = pattern.sub("_______", sentence, count=1)
            return self.build_q_obj(question_text, answer, sentence, q_type, marks, answer_type='word', pos_tags=tags)

        return None

    def handle_grammatical_sentence(self, sentence, tags, q_type, marks):
        verbs = [word for word, tag in tags if tag.startswith('VB') and word.lower() not in ['is', 'are', 'was', 'were', 'has', 'have', 'had']]
        nouns = [word for word, tag in tags if tag.startswith('NN') and word.lower() not in nlp_processor.stop_words]
        
        # Check for Definition Pattern: "X is Y"
        definition_verbs = ['is', 'are', 'was', 'were', 'means', 'refers']
        for v in definition_verbs:
            if v in [w.lower() for w, t in tags]:
                parts = re.split(r'\b(is|are|was|were|means|refers)\b', sentence, maxsplit=1, flags=re.IGNORECASE)
                if len(parts) == 3:
                    subject = parts[0].strip()
                    definition = parts[2].strip()
                    
                    if len(subject.split()) < 8 and len(definition.split()) > 2:
                        question_text = f"What {v} {subject}?"
                        answer = definition
                        return self.build_q_obj(question_text, answer, sentence, q_type, marks, answer_type='phrase')

        # Check for Action Pattern
        if verbs and nouns:
            subject_candidate = nouns[0]
            verb_candidate = verbs[0]
            
            try:
                idx_s = sentence.lower().index(subject_candidate.lower())
                idx_v = sentence.lower().index(verb_candidate.lower())
                
                if idx_s < idx_v:
                    rest_of_sentence = sentence[idx_v:]
                    question_text = f"What {rest_of_sentence.replace(verb_candidate, verb_candidate, 1)}?"
                    question_text = re.sub(r'\s\s+', ' ', question_text).strip()
                    answer = subject_candidate
                    
                    if answer.lower() not in question_text.lower():
                         return self.build_q_obj(question_text, answer, sentence, q_type, marks, answer_type='word', pos_tags=tags)
            except ValueError:
                pass

        # Fallback to Fill-in-the-blank
        if nouns:
            answer = random.choice(nouns)
            pattern = re.compile(re.escape(answer), re.IGNORECASE)
            question_text = pattern.sub("_______", sentence, count=1)
            return self.build_q_obj(question_text, answer, sentence, q_type, marks, answer_type='word', pos_tags=tags)

        return None

    def build_q_obj(self, question_text, answer, context, q_type, marks, answer_type='word', pos_tags=None):
        if not answer or not question_text:
            return None
            
        q_obj = {
            "question_text": question_text,
            "marks": marks,
            "type": q_type,
            "explanation": f"Context: {context}"
        }

        if answer_type == 'phrase':
            if q_type == 'theoretical':
                q_obj["answer"] = answer
            else:
                q_obj["answer"] = answer
                q_obj["options"] = ["True", "False"] if q_type != 'mcq' else [answer, "Alternative A", "Alternative B", "Alternative C"]
                random.shuffle(q_obj["options"])
        
        else: 
            tag = 'NN'
            if pos_tags:
                for w, t in pos_tags:
                    if w == answer:
                        tag = t
                        break
            
            distractors = nlp_processor.get_distractors(answer, tag)
            options = [answer] + distractors
            random.shuffle(options)
            
            q_obj["options"] = options
            q_obj["answer"] = answer

        return q_obj
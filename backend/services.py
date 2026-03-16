import os
import re
import random
import unicodedata
import inflect
from collections import defaultdict

import spacy
from nltk.corpus import wordnet
from nltk.tokenize import sent_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from docx import Document
from pptx import Presentation
from PyPDF2 import PdfReader

p = inflect.engine()

try:
    nlp = spacy.load("en_core_web_md")
except OSError:
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        from spacy.cli import download
        download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")

try:
    from sentence_transformers import SentenceTransformer, util as sbert_util
    sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception:
    sbert_model = None

try:
    from keybert import KeyBERT
    kw_model = KeyBERT()
except Exception:
    kw_model = None

try:
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer as SumyTokenizer
    from sumy.summarizers.lsa import LsaSummarizer
    from sumy.nlp.stemmers import Stemmer
    from sumy.utils import get_stop_words
    _SUMY_AVAILABLE = True
except Exception:
    _SUMY_AVAILABLE = False

S2V_PATH = os.environ.get("S2V_PATH", "")
try:
    from sense2vec import Sense2Vec
    _s2v = Sense2Vec().from_disk(S2V_PATH) if S2V_PATH else None
except Exception:
    _s2v = None


SUMMARIZE_WORD_THRESHOLD = 1500

GENERIC_WORDS = {
    "text", "data", "name", "page", "system", "file", "user", "type", "item",
    "value", "number", "example", "case", "part", "point", "result", "process",
    "way", "thing", "set", "list", "use", "used", "using", "make", "made",
    "give", "take", "need", "want", "able", "based", "each", "also", "well",
    "following", "above", "below", "here", "there", "then", "when", "where",
    "operation", "operations", "function", "functions", "method", "methods",
    "concept", "concepts", "feature", "features", "object", "objects",
    "information", "content", "level", "single", "multiple", "different",
    "new", "old", "good", "high", "low", "large", "small", "many", "most",
    "field", "fields", "document", "documents", "collection", "collections",
    "expression", "expressions", "operator", "operators", "statement",
    "statements", "structure", "structures", "element", "elements",
    "approach", "approaches", "technique", "techniques", "step", "steps",
    "output", "input", "format", "model", "models", "base", "bases",
    "kind", "kinds", "sort", "sorts", "form", "forms", "group", "groups",
    "section", "sections", "chapter", "chapters", "figure", "figures",
}

DETERMINER_PREFIXES = {
    "the", "a", "an", "some", "any", "that", "this", "these", "those",
    "their", "its", "our", "your", "my", "his", "her", "every", "each",
    "both", "either", "neither", "all", "no",
}

VAGUE_SUBJECTS = {
    "it", "this", "that", "these", "those", "we", "you", "i", "he", "she",
    "they", "them", "one", "someone", "something", "everything", "anything",
    "nothing", "both", "each", "all", "following",
}

KNOWN_ACRONYMS = {
    "SQL", "API", "URL", "HTML", "JSON", "XML", "CPU", "RAM", "GPU",
    "HTTP", "HTTPS", "REST", "UUID", "CRUD", "ACID", "NoSQL", "MongoDB",
    "DBMS", "BSON", "AWS", "GCP", "TCP", "IP", "OS", "UI", "UX",
}

HARD_BLOCK_PATTERNS = [
    r"\$[a-zA-Z]", r"→", r"↓", r"↑", r"db\.", r"\{", r"\}",
    r";", r"function\(", r"var ", r"const ", r"let ", r"import ",
    r"console\.", r"return ", r"print\(", r"^http", r"\.png",
    r"\.jpg", r"\.js\b", r"\.py\b", r"^\s*[-•*◦▪✔]\s",
    r"^(?:✔|•|-|\d+\.)", r"Syntax:", r"use database",
    r"mysql\b", r"\._", r"->", r"==", r"click here",
    r"e\.g\.", r"i\.e\.",
]


class FileProcessor:
    @staticmethod
    def extract_text(file_storage):
        filename = file_storage.filename
        text = ""
        try:
            if filename.endswith(".txt"):
                text = file_storage.read().decode("utf-8", errors="ignore")
            elif filename.endswith(".docx"):
                doc = Document(file_storage)
                text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            elif filename.endswith(".pptx"):
                prs = Presentation(file_storage)
                for slide in prs.slides:
                    for shape in slide.shapes:
                        if hasattr(shape, "text") and shape.text.strip():
                            text += shape.text + "\n"
            elif filename.endswith(".pdf"):
                reader = PdfReader(file_storage)
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
            else:
                return None, "Unsupported file format."
        except Exception as e:
            return None, f"Error processing file: {str(e)}"
        return unicodedata.normalize("NFKD", text), None


class TextProcessor:
    def clean(self, text):
        lines = text.split("\n")
        out = []
        for line in lines:
            ls = line.strip()
            if not ls:
                continue
            if re.search(r"[\.\s]{5,}\d+$", ls):
                continue
            if re.match(r"^\d+[\s\.]*$", ls):
                continue
            if re.match(r"^[A-Z][A-Za-z\s]{3,40}:\s+[A-Z]", ls):
                parts = ls.split(":", 1)
                if len(parts) == 2 and len(parts[1].split()) >= 5:
                    out.append(parts[1].strip())
                    continue
            out.append(line)
        text = "\n".join(out)
        text = re.sub(r"\[.*?\]|\(.*?\)", " ", text)
        text = re.sub(r"[\u2028\u2014]", " ", text)
        text = re.sub(
            r"([a-z,])(\s{1,3})([A-Z][a-z]{2,})",
            lambda m: m.group(1).rstrip(",") + ". " + m.group(3),
            text,
        )
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def is_valid_sentence(self, sentence):
        sentence = str(sentence).strip()
        for pat in HARD_BLOCK_PATTERNS:
            if re.search(pat, sentence, re.IGNORECASE):
                return False
        words = sentence.split()
        if len(words) < 9 or len(words) > 45:
            return False
        if sum(c.isalpha() for c in sentence) < 25:
            return False
        if not re.search(r"[.!?](\s|\"|\\'|\))*$", sentence):
            return False
        if sentence.strip().endswith(":"):
            return False
        if re.search(r"[-•*◦▪✔→$#@]", sentence):
            return False
        special_ratio = len(re.findall(r"[^a-zA-Z0-9\s\.\,\'\-]", sentence)) / max(len(sentence), 1)
        if special_ratio > 0.08:
            return False
        unknown_caps = [w for w in re.findall(r"\b[A-Z]{3,}\b", sentence) if w not in KNOWN_ACRONYMS]
        if len(unknown_caps) > 2:
            return False
        return True

    def sentences(self, text):
        return [s.strip() for s in sent_tokenize(text) if self.is_valid_sentence(s.strip())]


class DocumentSummarizer:
    @staticmethod
    def _sentence_count_for_length(word_count):
        if word_count < 3000:
            return 40
        if word_count < 6000:
            return 60
        if word_count < 12000:
            return 80
        return 100

    @staticmethod
    def summarize(text):
        word_count = len(text.split())
        if not _SUMY_AVAILABLE or word_count <= SUMMARIZE_WORD_THRESHOLD:
            return text

        n_sentences = DocumentSummarizer._sentence_count_for_length(word_count)
        try:
            parser = PlaintextParser.from_string(text, SumyTokenizer("english"))
            stemmer = Stemmer("english")
            summarizer = LsaSummarizer(stemmer)
            summarizer.stop_words = get_stop_words("english")
            selected = summarizer(parser.document, n_sentences)
            summary_text = " ".join(str(s) for s in selected)
            if len(summary_text.split()) > 100:
                return summary_text
        except Exception:
            pass
        return text


class KeywordExtractor:
    def __init__(self, text):
        self.scores = {}
        self.domain_keyword_set = set()
        self.domain_keywords = []
        try:
            sentences = sent_tokenize(text)
            vec = TfidfVectorizer(stop_words="english", max_features=500, ngram_range=(1, 2))
            mat = vec.fit_transform(sentences)
            names = vec.get_feature_names_out()
            avg = mat.mean(axis=0).A1
            self.scores = dict(zip(names, avg))
            self.domain_keywords = sorted(self.scores.items(), key=lambda x: x[1], reverse=True)[:100]
            self.domain_keyword_set = {
                k for k, s in self.domain_keywords
                if len(k) >= 4 and k.lower() not in GENERIC_WORDS and s > 0.02
            }
        except Exception:
            pass

    def score(self, word):
        return self.scores.get(word.lower(), 0.0)

    def is_domain_term(self, word):
        return word.lower() in self.domain_keyword_set or self.score(word) > 0.04


class DistractorGenerator:
    def __init__(self, full_text, keyword_extractor):
        self.ke = keyword_extractor
        self.entities_by_label = defaultdict(set)
        self.all_nouns = []
        seen = set()

        for i in range(0, min(len(full_text), 300_000), 30_000):
            chunk_doc = nlp(full_text[i:i + 30_000])
            for ent in chunk_doc.ents:
                t = ent.text.strip()
                if not t.replace(" ", "").isalpha() or len(t) < 3:
                    continue
                if self.ke.score(t) > 0 or t.lower() in self.ke.domain_keyword_set:
                    self.entities_by_label[ent.label_].add(t)
            for tok in chunk_doc:
                if tok.pos_ in ("NOUN", "PROPN") and tok.text.isalpha() and len(tok.text) > 3:
                    tl = tok.text.lower()
                    if tl not in seen and tl not in GENERIC_WORDS:
                        self.all_nouns.append(tok.text)
                        seen.add(tl)

        domain_nouns = [n for n in self.all_nouns if self.ke.is_domain_term(n) or self.ke.score(n) > 0.01]
        embed_pool = domain_nouns if len(domain_nouns) >= 30 else self.all_nouns
        self._emb_nouns = embed_pool[:3000]
        self._noun_embeddings = None
        if sbert_model and self._emb_nouns:
            try:
                self._noun_embeddings = sbert_model.encode(
                    self._emb_nouns, convert_to_tensor=True, batch_size=64, show_progress_bar=False
                )
            except Exception:
                pass

    def _filter(self, answer, candidates):
        ans_l = answer.lower().strip()
        seen = {ans_l}
        out = []
        for c in candidates:
            c = c.strip()
            cl = c.lower()
            if not c or cl in seen:
                continue
            if cl in ans_l or ans_l in cl:
                continue
            if cl in GENERIC_WORDS:
                continue
            if not re.match(r"^[a-zA-Z][a-zA-Z\s\-]+$", c):
                continue
            if len(c) < 3:
                continue
            seen.add(cl)
            out.append(c)
        return out

    def _sbert_plausibility_filter(self, answer, candidates, min_sim=0.28, max_sim=0.82):
        if not sbert_model or not candidates:
            return candidates
        try:
            ans_emb = sbert_model.encode(answer, convert_to_tensor=True)
            cand_embs = sbert_model.encode(candidates, convert_to_tensor=True)
            sims = sbert_util.cos_sim(ans_emb, cand_embs)[0]
            return [c for c, s in zip(candidates, sims) if min_sim < float(s) < max_sim]
        except Exception:
            return candidates

    def _context_score_distractors(self, candidates, context_sentence, answer, n):
        if not sbert_model or not context_sentence or not candidates:
            return candidates[:n]
        try:
            ref_emb = sbert_model.encode(context_sentence, convert_to_tensor=True)
            scored = []
            for cand in candidates:
                variant = re.sub(re.escape(answer), cand, context_sentence, count=1, flags=re.IGNORECASE)
                v_emb = sbert_model.encode(variant, convert_to_tensor=True)
                sim = float(sbert_util.cos_sim(ref_emb, v_emb)[0][0])
                scored.append((cand, sim))
            scored.sort(key=lambda x: abs(x[1] - 0.57))
            return [c for c, _ in scored[:n]]
        except Exception:
            return candidates[:n]

    def _sense2vec_candidates(self, answer, n):
        if not _s2v:
            return []
        ans_doc = nlp(answer)
        pos = ans_doc[0].pos_ if ans_doc else "NOUN"
        query = f"{answer.replace(' ', '_')}|{pos}"
        try:
            if query not in _s2v:
                query = f"{answer.lower().replace(' ', '_')}|{pos}"
            if query not in _s2v:
                return []
            results = _s2v.most_similar(query, n=20)
            candidates = []
            for phrase, score in results:
                if score < 0.35 or score > 0.85:
                    continue
                word = phrase.split("|")[0].replace("_", " ").strip()
                if word.lower() != answer.lower() and len(word) > 2:
                    candidates.append(word)
            return self._filter(answer, candidates)[:n]
        except Exception:
            return []

    def _sbert_candidates(self, answer, n):
        if not sbert_model or self._noun_embeddings is None:
            return []
        try:
            ans_emb = sbert_model.encode(answer, convert_to_tensor=True)
            hits = sbert_util.semantic_search(ans_emb, self._noun_embeddings, top_k=100)[0]
            ans_doc = nlp(answer)
            is_plural = ans_doc[0].tag_ in ("NNS", "NNPS") if ans_doc else False
            pool = []
            for hit in hits:
                s = hit["score"]
                if 0.38 < s < 0.72:
                    cand = self._emb_nouns[hit["corpus_id"]]
                    c_doc = nlp(cand)
                    if c_doc and c_doc[0].tag_ in ("NNS", "NNPS") == is_plural:
                        pool.append(cand)
            return self._filter(answer, pool)
        except Exception:
            return []

    def _wordnet_candidates(self, answer, n):
        words_to_try = [answer]
        if " " in answer:
            words_to_try.append(answer.split()[-1])
        candidates = []
        for word in words_to_try:
            try:
                syns = wordnet.synsets(word.replace(" ", "_"))
                if not syns:
                    continue
                hypers = syns[0].hypernyms()
                if hypers:
                    for hypo in hypers[0].hyponyms():
                        for lemma in hypo.lemmas():
                            candidates.append(lemma.name().replace("_", " "))
                for similar in syns[0].similar_tos():
                    for lemma in similar.lemmas():
                        candidates.append(lemma.name().replace("_", " "))
            except Exception:
                continue
        return self._filter(answer, candidates)[:n]

    def _domain_fallbacks(self, answer, seen, n):
        out = []
        for kw, score in sorted(self.ke.scores.items(), key=lambda x: x[1], reverse=True):
            if len(out) >= n:
                break
            if kw.lower() in seen or kw.lower() in GENERIC_WORDS or len(kw) < 4:
                continue
            out.append(kw.title())
            seen.add(kw.lower())
        return out

    def generate(self, answer, answer_label=None, n=3, context_sentence=None):
        all_cands = []
        all_cands.extend(self._sense2vec_candidates(answer, n))
        if len(all_cands) < n and answer_label and answer_label in self.entities_by_label:
            all_cands.extend(self._filter(answer, list(self.entities_by_label[answer_label])))
        if len(all_cands) < n * 2:
            all_cands.extend(self._sbert_candidates(answer, n * 2))
        if len(all_cands) < n:
            all_cands.extend(self._wordnet_candidates(answer, n))
        if len(all_cands) < n:
            shuffled = self.all_nouns[:]
            random.shuffle(shuffled)
            all_cands.extend(self._filter(answer, shuffled[:200]))

        seen = {answer.lower()}
        deduped = []
        for d in all_cands:
            if d.lower() not in seen:
                deduped.append(d)
                seen.add(d.lower())

        deduped = self._sbert_plausibility_filter(answer, deduped)
        if context_sentence and len(deduped) > n:
            deduped = self._context_score_distractors(deduped, context_sentence, answer, n * 2)

        out = deduped[:n]
        if len(out) < n:
            out.extend(self._domain_fallbacks(answer, {answer.lower()} | {d.lower() for d in out}, n - len(out)))
        return out[:n]

    def generate_for_msq(self, correct_answers, n_per_answer=3):
        all_cands = []
        correct_lower = {a.lower() for a in correct_answers}
        for ans in correct_answers:
            for d in self.generate(ans, n=n_per_answer * 2):
                if d.lower() not in correct_lower:
                    all_cands.append(d)

        if not sbert_model or not all_cands:
            return all_cands[:n_per_answer]
        try:
            correct_embs = sbert_model.encode(correct_answers, convert_to_tensor=True)
            cand_embs = sbert_model.encode(all_cands, convert_to_tensor=True)
            sims = sbert_util.cos_sim(cand_embs, correct_embs)
            avg_sims = sims.mean(dim=1).tolist()
            scored = sorted(zip(all_cands, avg_sims), key=lambda x: x[1], reverse=True)
            filtered = [c for c, s in scored if 0.25 < s < 0.70]
            if len(filtered) >= n_per_answer:
                return filtered[:n_per_answer]
        except Exception:
            pass
        return all_cands[:n_per_answer]

def _get_span(doc, token):
    start = token.left_edge.i
    end = token.right_edge.i + 1
    for child in token.children:
        if child.dep_ == "prep":
            end = max(end, child.right_edge.i + 1)
    text = doc[start:end].text
    return re.sub(r"^(a|an|the)\s+", "", text, flags=re.IGNORECASE).strip()


def _strip_determiners(text):
    words = text.strip().split()
    if words and words[0].lower() in DETERMINER_PREFIXES:
        return " ".join(words[1:]).strip()
    return text.strip()


def _ensure_period(text):
    text = text.strip()
    if not text.endswith((".", "?", "!")):
        text += "."
    return text


def _insert_not(sentence, doc):
    tokens = list(doc)

    for tok in tokens:
        if tok.tag_ == "MD":
            parts = [t.text_with_ws for t in doc]
            if tok.text.lower() == "can":
                parts[tok.i] = "cannot" + tok.whitespace_
            else:
                parts.insert(tok.i + 1, "not ")
            return _ensure_period(re.sub(r"\s+", " ", "".join(parts)).strip())

    root = next((t for t in tokens if t.dep_ == "ROOT"), None)
    if not root:
        return None

    if root.lemma_ == "be" and root.tag_ in ("VBZ", "VBP", "VBD", "VB"):
        parts = [t.text_with_ws for t in doc]
        parts.insert(root.i + 1, "not ")
        return _ensure_period(re.sub(r"\s+", " ", "".join(parts)).strip())
    if root.tag_ == "VBZ":
        new_verb = f"does not {root.lemma_}"
    elif root.tag_ == "VBP":
        new_verb = f"do not {root.lemma_}"
    elif root.tag_ == "VBD":
        new_verb = f"did not {root.lemma_}"
    elif root.tag_ in ("VBN", "VBG"):
        aux = next(
            (t for t in tokens if t.dep_ in ("aux", "auxpass") and t.head.i == root.i), None
        )
        if aux:
            parts = [t.text_with_ws for t in doc]
            parts.insert(aux.i + 1, "not ")
            return _ensure_period(re.sub(r"\s+", " ", "".join(parts)).strip())
        new_verb = f"does not {root.lemma_}"
    else:
        new_verb = f"does not {root.lemma_}"

    parts = [
        new_verb + tok.whitespace_ if tok.i == root.i else tok.text_with_ws
        for tok in tokens
    ]
    return _ensure_period(re.sub(r"\s+", " ", "".join(parts)).strip())



def _is_grammatical_tf(sentence):
    s = sentence.strip().lower()
    if s.startswith("not "):
        return False
    if re.search(r"\bdoes not\s+(?:be|is|are|was|were|been|am)\b", s):
        return False
    if re.search(r"\bdo not\s+(?:be|is|are|was|were|been|am)\b", s):
        return False
    if re.search(r"\bnot\s+[A-Z][a-z]", sentence):
        return False
    words = s.split()
    if len(words) >= 3 and "not" in words[:3]:
        return False
    return True

def _mutate_false(sentence, doc):
    ents = [e for e in doc.ents if e.label_ in ("PERSON", "GPE", "ORG", "DATE", "LOC", "NORP")]
    if not ents:
        return None
    target = random.choice(ents)
    others = [e.text for e in doc.ents if e.label_ == target.label_ and e.text != target.text]
    if not others:
        return None
    return sentence.replace(target.text, random.choice(others), 1)


class SVOExtractor:
    @staticmethod
    def extract(doc):
        triples = []
        for tok in doc:
            if tok.dep_ != "ROOT" or tok.pos_ not in ("VERB", "AUX"):
                continue
            subj = next((t for t in tok.children if t.dep_ in ("nsubj", "nsubjpass")), None)
            obj = next((t for t in tok.children if t.dep_ in ("dobj", "attr", "acomp", "pobj")), None)
            if subj and obj:
                subj_text = _strip_determiners(_get_span(doc, subj))
                obj_text = _strip_determiners(_get_span(doc, obj))
                verb_text = tok.lemma_
                if (
                    subj_text
                    and obj_text
                    and subj_text.lower().split()[0] not in VAGUE_SUBJECTS
                    and obj_text.lower().split()[0] not in VAGUE_SUBJECTS
                ):
                    triples.append((subj_text, verb_text, obj_text, tok))
        return triples

class QuestionBuilder:

    @staticmethod
    def is_bad_answer(txt):
        if not txt or len(txt) < 3:
            return True
        tl = txt.lower().strip()
        words = tl.split()
        return (
            words[0] in DETERMINER_PREFIXES
            or tl in GENERIC_WORDS
            or tl in VAGUE_SUBJECTS
            or (len(words) == 1 and len(txt) < 4)
        )

    @staticmethod
    def answer_leaked_in_stem(answer, stem):
        al = answer.lower().strip()
        sl = stem.lower()
        al_words = al.split()
        stem_words = set(re.findall(r"\b\w+\b", sl))
        return all(w in stem_words for w in al_words)

    @staticmethod
    def build_from_svo(subj, verb, obj, answer, answer_is_subj):
        SUBJ_VERB_MAP = {
            "be":        lambda o: f"What is {o}?",
            "define":    lambda o: f"What defines {o}?",
            "enable":    lambda o: f"What enables {o}?",
            "allow":     lambda o: f"What allows {o}?",
            "provide":   lambda o: f"What provides {o}?",
            "support":   lambda o: f"What supports {o}?",
            "store":     lambda o: f"What stores {o}?",
            "manage":    lambda o: f"What manages {o}?",
            "ensure":    lambda o: f"What ensures {o}?",
            "handle":    lambda o: f"What handles {o}?",
            "contain":   lambda o: f"What contains {o}?",
            "include":   lambda o: f"What includes {o}?",
            "represent": lambda o: f"What represents {o}?",
            "process":   lambda o: f"What processes {o}?",
            "create":    lambda o: f"What creates {o}?",
            "require":   lambda o: f"What requires {o}?",
            "improve":   lambda o: f"What improves {o}?",
        }
        OBJ_VERB_MAP = {
            "be":        lambda s: f"What is '{s}'?",
            "define":    lambda s: f"What does '{s}' define?",
            "enable":    lambda s: f"What does '{s}' enable?",
            "allow":     lambda s: f"What does '{s}' allow?",
            "provide":   lambda s: f"What does '{s}' provide?",
            "support":   lambda s: f"What does '{s}' support?",
            "store":     lambda s: f"What does '{s}' store?",
            "manage":    lambda s: f"What does '{s}' manage?",
            "ensure":    lambda s: f"What does '{s}' ensure?",
            "handle":    lambda s: f"What does '{s}' handle?",
            "contain":   lambda s: f"What does '{s}' contain?",
            "include":   lambda s: f"What does '{s}' include?",
            "represent": lambda s: f"What does '{s}' represent?",
            "process":   lambda s: f"What does '{s}' process?",
            "create":    lambda s: f"What does '{s}' create?",
            "require":   lambda s: f"What does '{s}' require?",
            "improve":   lambda s: f"What does '{s}' improve?",
            "use":       lambda s: f"What mechanism does '{s}' use?",
            "return":    lambda s: f"What does '{s}' return?",
        }

        if answer_is_subj:
            fn = SUBJ_VERB_MAP.get(verb)
            return fn(obj) if fn else f"What {verb}s {obj}?"
        else:
            fn = OBJ_VERB_MAP.get(verb)
            return fn(subj) if fn else f"What does '{subj}' {verb}?"

    @staticmethod
    def build_definition_question(answer, predicate_text):
        templates = [
            f"Which concept is defined as \"{predicate_text}\"?",
            f"What term best fits the following description: \"{predicate_text}\"?",
            f"Identify the concept that refers to \"{predicate_text}\".",
            f"What is the name for \"{predicate_text}\"?",
        ]
        return random.choice(templates)

    @staticmethod
    def build_blank_question(answer, sentence):
        redacted = re.sub(re.escape(answer), "________", sentence, count=1, flags=re.IGNORECASE)
        if "________" not in redacted:
            return None
        blank_pos = redacted.index("________") / max(len(redacted), 1)
        if blank_pos < 0.20:
            return None
        return f"What fills the blank: \"{redacted}\""

    @staticmethod
    def build_true_false(sentence, doc):
        s = sentence.strip()
        if not s.endswith("."):
            s += "."

        if random.random() < 0.5:
            return s, "True"

        mutated = _mutate_false(s, doc)
        if mutated and mutated != s and _is_grammatical_tf(mutated):
            return mutated, "False"
        neg = _insert_not(s, doc)
        if neg and neg != s and _is_grammatical_tf(neg):
            return neg, "False"

        return s, "True"


    @staticmethod
    def build_msq_stem(subj_text):
        if subj_text and subj_text.lower().split()[0] not in VAGUE_SUBJECTS:
            return f"Which of the following correctly describe '{subj_text}'? (Select all that apply)"
        return "Which of the following statements are correct? (Select all that apply)"


class SentenceRanker:
    def __init__(self, keyword_extractor):
        self.ke = keyword_extractor
        self.gen_emb = None
        if sbert_model:
            generic = [
                "this is a feature of the system",
                "it is used in many different cases",
                "it allows the user to do things",
                "this is an important concept to know",
                "we can use this in our application",
            ]
            try:
                self.gen_emb = sbert_model.encode(generic, convert_to_tensor=True)
            except Exception:
                pass

    def score(self, sent, doc):
        has_subj = any(t.dep_ in ("nsubj", "nsubjpass") for t in doc)
        has_verb = any(t.dep_ == "ROOT" and t.pos_ in ("VERB", "AUX") for t in doc)
        if not has_subj or not has_verb:
            return -100.0
        for tok in doc:
            if tok.dep_ in ("nsubj", "nsubjpass") and tok.text.lower() in VAGUE_SUBJECTS:
                return -100.0
        if sent.strip().split()[0] in ("Unlike", "However", "Therefore", "Thus", "Moreover"):
            return -40.0

        score = 0.0
        score += len(doc.ents) * 0.8
        if any(t.dep_ in ("dobj", "attr", "pobj") for t in doc):
            score += 2.0
        score += 2.0 + 1.5

        if re.search(
            r"\bis\b|\bare\b|\bwas\b|\bwere\b|\brefers to\b|\bdefined as\b"
            r"|\bconsists of\b|\binvolves\b|\benables\b|\ballows\b|\bprovides\b",
            sent, re.I,
        ):
            score += 3.5

        content = [t.text for t in doc if not t.is_stop and t.is_alpha and len(t.text) > 3]
        if content:
            dc = sum(1 for w in content if self.ke.is_domain_term(w))
            score += (dc / len(content)) * 14.0
            score += (sum(self.ke.score(w) for w in content) / len(content)) * 9.0

        wc = len(sent.split())
        if wc < 10:
            score -= 2.0
        if wc > 40:
            score -= 1.5

        svo = SVOExtractor.extract(doc)
        if svo:
            score += 4.0

        if sbert_model and self.gen_emb is not None:
            try:
                emb = sbert_model.encode(sent, convert_to_tensor=True)
                sim = sbert_util.cos_sim(emb, self.gen_emb).max().item()
                score -= sim * 9.0
            except Exception:
                pass

        return score


class AnswerSelector:
    def __init__(self, keyword_extractor):
        self.ke = keyword_extractor

    def select(self, doc, sentence_text):
        sl = sentence_text.lower()
        candidates = []

        if kw_model:
            try:
                kws = kw_model.extract_keywords(
                    sentence_text, keyphrase_ngram_range=(1, 2),
                    stop_words="english", top_n=5
                )
                for kw, score in kws:
                    kw = kw.strip()
                    if len(kw) < 4 or re.search(r"[/$:→]", kw):
                        continue
                    if kw.lower() not in sl:
                        continue
                    kw = _strip_determiners(kw)
                    if not kw or QuestionBuilder.is_bad_answer(kw):
                        continue
                    label = next(
                        (e.label_ for e in doc.ents if kw.lower() in e.text.lower()), "KEYWORD"
                    )
                    candidates.append((kw, label, score * 3.5))
            except Exception:
                pass

        for ent in doc.ents:
            if ent.label_ not in ("PERSON", "GPE", "LOC", "ORG", "DATE",
                                   "NORP", "MONEY", "PRODUCT", "WORK_OF_ART", "EVENT"):
                continue
            txt = _strip_determiners(ent.text)
            if not txt or len(txt) < 4 or any(c.isdigit() for c in txt):
                continue
            if re.search(r"[/$:→]", txt) or txt.lower() not in sl:
                continue
            if QuestionBuilder.is_bad_answer(txt):
                continue
            boost = {"PERSON": 3.0, "ORG": 2.5, "GPE": 2.5, "DATE": 2.0, "NORP": 2.2}.get(ent.label_, 1.0)
            candidates.append((txt, ent.label_, self.ke.score(txt) * boost))

        for chunk in doc.noun_chunks:
            if not (1 <= len(chunk.text.split()) <= 3):
                continue
            txt = _strip_determiners(chunk.text)
            if not txt or len(txt) < 4 or len(txt) > 30:
                continue
            if not re.match(r"^[a-zA-Z\s\-]+$", txt):
                continue
            if QuestionBuilder.is_bad_answer(txt) or txt.lower() not in sl:
                continue
            boost = 1.6 if self.ke.is_domain_term(txt) else 0.6
            candidates.append((txt, "CONCEPT", self.ke.score(txt) * boost))

        candidates.sort(key=lambda x: x[2], reverse=True)
        for txt, label, _ in candidates:
            if not QuestionBuilder.is_bad_answer(txt):
                return txt, label
        return None, None


class QuestionGenerator:
    def __init__(self, text):
        self.tp = TextProcessor()
        raw_clean = self.tp.clean(text)
        self.text = DocumentSummarizer.summarize(raw_clean)
        self.ke = KeywordExtractor(self.text)
        self.dg = DistractorGenerator(self.text, self.ke)
        self.ranker = SentenceRanker(self.ke)
        self.ans_selector = AnswerSelector(self.ke)

    def _build_mcq(self, sentence, doc, relaxed=False):
        answer, label = self.ans_selector.select(doc, sentence)
        if not answer or answer.lower() not in sentence.lower():
            return None
        if QuestionBuilder.is_bad_answer(answer):
            return None

        svo_triples = SVOExtractor.extract(doc)
        stem = None

        for subj, verb, obj, _ in svo_triples:
            ans_is_subj = answer.lower() in subj.lower() or subj.lower() in answer.lower()
            ans_is_obj = answer.lower() in obj.lower() or obj.lower() in answer.lower()

            if not ans_is_subj and not ans_is_obj:
                continue

            if ans_is_subj and subj.lower() == answer.lower():
                if verb == "be":
                    stem = QuestionBuilder.build_definition_question(answer, obj)
                else:
                    stem = QuestionBuilder.build_from_svo(subj, verb, obj, answer, answer_is_subj=True)
                if stem and not QuestionBuilder.answer_leaked_in_stem(answer, stem):
                    break
                stem = None

            elif ans_is_obj and subj.lower() != answer.lower():
                stem = QuestionBuilder.build_from_svo(subj, verb, obj, answer, answer_is_subj=False)
                if stem and not QuestionBuilder.answer_leaked_in_stem(answer, stem):
                    break
                stem = None

        if not stem:
            stem = QuestionBuilder.build_blank_question(answer, sentence)

        if not stem and answer_label_ok(label):
            if label == "PERSON":
                stem = f"Who is being described in: \"{sentence}\""
            elif label in ("ORG", "PRODUCT"):
                stem = f"Which tool or system is described as: \"{sentence}\""

        if not stem and relaxed:
            stem = QuestionBuilder.build_blank_question(answer, sentence)

        if not stem or len(stem.split()) < 7:
            return None
        if QuestionBuilder.answer_leaked_in_stem(answer, stem):
            return None

        distractors = self.dg.generate(answer, label, n=3, context_sentence=sentence)
        seen = {answer.lower()}
        clean_d = [d for d in distractors if d.lower() not in seen and not QuestionBuilder.is_bad_answer(d)]
        options = list(dict.fromkeys([answer] + clean_d))
        for fb in ["None of the above", "All of the above", "Cannot be determined"]:
            if len(options) >= 4:
                break
            options.append(fb)
        options = options[:4]
        random.shuffle(options)

        return {"question": stem, "options": options, "answer": answer, "type": "mcq"}

    def _build_true_false(self, sentence, doc):
        qt, ans = QuestionBuilder.build_true_false(sentence, doc)
        if not qt:
            return None
        return {"question": qt, "options": ["True", "False"], "answer": ans, "type": "true_false"}

    def _build_msq(self, sentence, doc):
        items = []
        conj_heads = defaultdict(list)
        for tok in doc:
            if tok.dep_ == "conj" and tok.head.pos_ in ("NOUN", "PROPN"):
                if tok.text.isalpha() and len(tok.text) > 3 and tok.text.lower() not in GENERIC_WORDS:
                    conj_heads[tok.head.i].append(tok.text)
        for head_i, conjuncts in conj_heads.items():
            head = doc[head_i]
            if head.text.lower() not in GENERIC_WORDS and len(head.text) > 3:
                group = [head.text] + conjuncts
                if len(group) >= 2:
                    items = group
                    break
        if not items:
            m = re.search(
                r"([A-Z][a-zA-Z]{3,})(?:,\s+[A-Za-z][a-zA-Z]{3,}){2,}(?:,?\s+and\s+[A-Za-z][a-zA-Z]{3,})?",
                sentence,
            )
            if m:
                raw = m.group(0)
                cands = [x.strip() for x in re.split(r",\s*| and ", raw) if x.strip() and len(x.strip()) > 3]
                domain = [c for c in cands if self.ke.is_domain_term(c) or c[0].isupper()]
                items = domain[:4] if len(domain) >= 3 else (cands[:4] if len(cands) >= 3 else [])
        if len(items) < 2:
            return None

        correct = items[:min(3, len(items))]
        correct_lower = {a.lower() for a in correct}

        distractors = self.dg.generate_for_msq(correct, n_per_answer=3)
        seen_d = set(correct_lower)
        filtered = []
        min_len = min(len(a) for a in correct)
        for d in distractors:
            if d.lower() in GENERIC_WORDS or d.lower() in seen_d:
                continue
            if len(d) < max(4, min_len // 2):
                continue
            filtered.append(d)
            seen_d.add(d.lower())

        if len(filtered) < 2:
            extra = [
                k for k in self.ke.domain_keyword_set
                if k.lower() not in correct_lower and len(k) >= 5
                and k.lower() not in GENERIC_WORDS and k.lower() not in seen_d
            ]
            random.shuffle(extra)
            filtered.extend(extra[:3])

        all_opts = list(dict.fromkeys(correct + filtered[:max(4 - len(correct), 2)]))
        random.shuffle(all_opts)

        nsubj = next((tok for tok in doc if tok.dep_ in ("nsubj", "nsubjpass")), None)
        subj_text = _strip_determiners(_get_span(doc, nsubj)) if nsubj else None
        stem = QuestionBuilder.build_msq_stem(subj_text)
        return {"question": stem, "options": all_opts[:6], "answer": correct, "type": "msq"}

    def generate(self, config_blocks):
        sentences = self.tp.sentences(self.text)
        scored = []
        for sent in sentences:
            doc = nlp(sent)
            sc = self.ranker.score(sent, doc)
            scored.append((sent, doc, sc))
        scored.sort(key=lambda x: x[2], reverse=True)

        generated = defaultdict(list)
        used = defaultdict(set)

        for block in config_blocks:
            q_type = block.get("type")
            target = block.get("count", 0)
            if not target or q_type == "theoretical":
                continue

            for sent, doc, sc in scored:
                if len(generated[q_type]) >= target:
                    break
                if sent in used[q_type]:
                    continue
                q = None
                if q_type == "mcq":
                    q = self._build_mcq(sent, doc, relaxed=False)
                elif q_type == "msq":
                    q = self._build_msq(sent, doc)
                elif q_type == "true_false":
                    q = self._build_true_false(sent, doc)
                if q:
                    generated[q_type].append(q)
                    used[q_type].add(sent)

            if len(generated[q_type]) < target:
                for sent, doc, sc in scored:
                    if len(generated[q_type]) >= target:
                        break
                    if sent in used[q_type]:
                        continue
                    q = None
                    if q_type == "mcq":
                        q = self._build_mcq(sent, doc, relaxed=True)
                    elif q_type == "msq" and sc > 1.5:
                        q = self._build_msq(sent, doc)
                    elif q_type == "true_false":
                        q = self._build_true_false(sent, doc)
                    if q:
                        generated[q_type].append(q)
                        used[q_type].add(sent)

        return dict(generated)


def answer_label_ok(label):
    return label in ("PERSON", "GPE", "LOC", "ORG", "DATE", "NORP",
                     "MONEY", "PRODUCT", "WORK_OF_ART", "EVENT", "KEYWORD", "CONCEPT")


class QuizGenerator:
    def generate_from_text(self, text, config_blocks):
        if not config_blocks:
            config_blocks = [{"type": "mcq", "count": 5, "marks": 1}]
        qg = QuestionGenerator(text)
        pool = qg.generate(config_blocks)
        results = []
        for block in config_blocks:
            q_type = block.get("type", "mcq")
            count = block.get("count", 1)
            marks = block.get("marks", 1)
            for q in pool.get(q_type, [])[:count]:
                results.append({
                    "question_text": q["question"],
                    "options": q.get("options", []),
                    "answer": q["answer"],
                    "marks": marks,
                    "type": q["type"],
                })
        return results
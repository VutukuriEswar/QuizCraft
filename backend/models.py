from pymongo import MongoClient
from config import Config

client = None
db = None

def init_db():
    global client, db
    client = MongoClient(Config.MONGO_URI)
    db = client.get_database()
    print("Database connected successfully.")

def get_db():
    return db

class ModuleModel:
    def __init__(self):
        self.collection = db.modules

    def add_module(self, data):
        return self.collection.insert_one(data)

    def get_all_modules(self):
        return list(self.collection.find({}, {"_id": 0, "module_content": 0}))

class QuizModel:
    def __init__(self):
        self.collection = db.quizzes

    def create_quiz(self, data):
        return self.collection.insert_one(data)

    def get_quiz_by_id(self, quiz_id):
        return self.collection.find_one({"quiz_id": quiz_id})

class ResultModel:
    def __init__(self):
        self.collection = db.results

    def save_result(self, data):
        return self.collection.insert_one(data)
import os

class Config:
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/quiz')
    SECRET_KEY = os.environ.get('SECRET_KEY', 'quiz_craft_secret_key')
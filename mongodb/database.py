from config import settings
from pymongo import MongoClient


def connect_db():
    db_pass = settings.MONGO_INITDB_ROOT_PASSWORD
    db_user = settings.MONGO_INITDB_ROOT_USERNAME
    db_address = settings.MONGO_DB_ADDRESS
    db_path = "/?authMechanism=DEFAULT"
    uri = f"mongodb://{db_user}:{db_pass}@{db_address}:27017{db_path}"

    client = MongoClient(uri)
    db = client['wellDB']
    return db
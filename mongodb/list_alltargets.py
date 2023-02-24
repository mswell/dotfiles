import sys
from database import connect_db


db = connect_db()
collection = db['subdomains']

query = collection.distinct('target')

for result in query:
    print(result)
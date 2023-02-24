import sys
from database import connect_db

target = sys.argv[1]

db = connect_db()
collection = db['subdomains']

query = collection.find({'target': target})

for result in query:
    print(result['subdomain'])
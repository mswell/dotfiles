import sys
import datetime
import concurrent.futures
from pymongo import MongoClient
from pathlib import Path


mongo_pass = input("Enter mongo password: ")
mongo_addr = input("Enter mongo address: ")
uri = f'mongodb://root:{mongo_pass}@{mongo_addr}:27017/default_db?authSource=admin'
client = MongoClient(uri)
db = client['wellDB']
collection = db['subdomains']

dic_subdomain = {}

target = sys.argv[1]
domain_list = sys.argv[2]

filepath = Path(domain_list)


def setup_parser(line):

    dic_subdomain['target'] = target
    dic_subdomain['subdomain'] = line.rstrip('\n')
    data = {
        'target': dic_subdomain['target'],
        'subdomain': dic_subdomain['subdomain'],
        'date': datetime.datetime.utcnow(),
    }

    if collection.find_one({'subdomain': data['subdomain']}):
        print('Document already exists')
    else:
        collection.insert_one(data)
        print('Document inserted')


def subdomain_parser():
    with open(f'{filepath}', mode='r') as file:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = []
            for line in file:
                futures.append(
                    executor.submit(setup_parser, line=line.rstrip('\n'))
                )


def main():
    subdomain_parser()


if __name__ == '__main__':
    main()

import sys
import datetime
import concurrent.futures
from database import connect_db
from pathlib import Path


db = connect_db()
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

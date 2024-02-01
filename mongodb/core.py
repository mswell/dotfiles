import datetime
import concurrent.futures
from database import connect_db
from pathlib import Path


db = connect_db()
collection = db["subdomains"]

dic_subdomain = {}


def setup_parser(target, line):
    dic_subdomain["target"] = target
    dic_subdomain["subdomain"] = line.rstrip("\n")
    data = {
        "target": dic_subdomain["target"],
        "subdomain": dic_subdomain["subdomain"],
        "date": datetime.datetime.utcnow(),
    }

    if collection.find_one({"subdomain": data["subdomain"]}):
        print("Document already exists")
    else:
        collection.insert_one(data)
        print("Document inserted")


def subdomain_parser(target, subs_files):
    filepath = Path(subs_files)
    with open(f"{filepath}", mode="r") as file:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = []
            for line in file:
                futures.append(
                    executor.submit(
                        setup_parser, target, line=line.rstrip("\n"))
                )


def list_all_target():
    query = collection.distinct("target")

    for result in query:
        print(result)


def get_all_subdomains():
    query = collection.distinct("subdomain")

    for result in query:
        print(result)


def list_subdomains(target):
    query = collection.find({"target": target})

    for result in query:
        print(result["subdomain"])


def delete_target(target):
    query = {"target": target}

    x = collection.delete_many(query)
    print(x.deleted_count, " documents deleted")

import datetime
from pathlib import Path
from typing import Iterable, List, Optional, Protocol


class ReconStore(Protocol):
    def add_subdomain(self, target: str, subdomain: str, date: datetime.datetime) -> bool:
        ...

    def list_targets(self) -> List[str]:
        ...

    def list_all_subdomains(self) -> List[str]:
        ...

    def list_subdomains(self, target: str) -> List[str]:
        ...

    def delete_target(self, target: str) -> int:
        ...


class MongoReconStore:
    """Mongo-backed recon store with lazy connection setup."""

    def __init__(self, db=None):
        self._db = db
        self._collection = None

    @property
    def collection(self):
        if self._collection is None:
            if self._db is None:
                from database import connect_db

                self._db = connect_db()
            self._collection = self._db["subdomains"]
        return self._collection

    def add_subdomain(self, target: str, subdomain: str, date: datetime.datetime) -> bool:
        data = {"target": target, "subdomain": subdomain, "date": date}
        # Preserve historical duplicate behavior: a subdomain is unique globally.
        if self.collection.find_one({"subdomain": subdomain}):
            return False
        self.collection.insert_one(data)
        return True

    def list_targets(self) -> List[str]:
        return list(self.collection.distinct("target"))

    def list_all_subdomains(self) -> List[str]:
        return list(self.collection.distinct("subdomain"))

    def list_subdomains(self, target: str) -> List[str]:
        return [result["subdomain"] for result in self.collection.find({"target": target})]

    def delete_target(self, target: str) -> int:
        result = self.collection.delete_many({"target": target})
        return int(result.deleted_count)


class InMemoryReconStore:
    """Non-network storage adapter for fast tests and dry behavior checks."""

    def __init__(self):
        self.documents = []

    def add_subdomain(self, target: str, subdomain: str, date: datetime.datetime) -> bool:
        if any(doc["subdomain"] == subdomain for doc in self.documents):
            return False
        self.documents.append({"target": target, "subdomain": subdomain, "date": date})
        return True

    def list_targets(self) -> List[str]:
        return sorted({doc["target"] for doc in self.documents})

    def list_all_subdomains(self) -> List[str]:
        return sorted({doc["subdomain"] for doc in self.documents})

    def list_subdomains(self, target: str) -> List[str]:
        return [doc["subdomain"] for doc in self.documents if doc["target"] == target]

    def delete_target(self, target: str) -> int:
        before = len(self.documents)
        self.documents = [doc for doc in self.documents if doc["target"] != target]
        return before - len(self.documents)


def default_store() -> ReconStore:
    return MongoReconStore()


def parse_subdomain_lines(lines: Iterable[str]) -> List[str]:
    seen = set()
    parsed = []
    for line in lines:
        subdomain = line.strip()
        if not subdomain or subdomain in seen:
            continue
        seen.add(subdomain)
        parsed.append(subdomain)
    return parsed


def parse_subdomain_file(subs_file: str) -> List[str]:
    filepath = Path(subs_file)
    with filepath.open(mode="r", encoding="utf-8") as file:
        return parse_subdomain_lines(file)


def setup_parser(target: str, line: str, store: Optional[ReconStore] = None) -> bool:
    active_store = store or default_store()
    subdomain = line.strip()
    if not subdomain:
        return False
    inserted = active_store.add_subdomain(target, subdomain, datetime.datetime.now(datetime.UTC))
    print("Document inserted" if inserted else "Document already exists")
    return inserted


def subdomain_parser(target: str, subs_files: str, store: Optional[ReconStore] = None) -> int:
    active_store = store or default_store()
    inserted = 0
    for subdomain in parse_subdomain_file(subs_files):
        if setup_parser(target, subdomain, active_store):
            inserted += 1
    return inserted


def list_all_target(store: Optional[ReconStore] = None) -> List[str]:
    active_store = store or default_store()
    results = active_store.list_targets()
    for result in results:
        print(result)
    return results


def get_all_subdomains(store: Optional[ReconStore] = None) -> List[str]:
    active_store = store or default_store()
    results = active_store.list_all_subdomains()
    for result in results:
        print(result)
    return results


def list_subdomains(target: str, store: Optional[ReconStore] = None) -> List[str]:
    active_store = store or default_store()
    results = active_store.list_subdomains(target)
    for result in results:
        print(result)
    return results


def delete_target(target: str, store: Optional[ReconStore] = None) -> int:
    active_store = store or default_store()
    deleted_count = active_store.delete_target(target)
    print(deleted_count, " documents deleted")
    return deleted_count

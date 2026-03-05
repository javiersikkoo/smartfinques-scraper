import json
import os
import time

CACHE_FILE = "cache.json"
CACHE_TTL = 3600


def is_cache_valid():

    if not os.path.exists(CACHE_FILE):
        return False

    age = time.time() - os.path.getmtime(CACHE_FILE)

    return age < CACHE_TTL


def load_cache():

    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_cache(data):

    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

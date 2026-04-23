import urllib.parse
from pymongo import MongoClient

# 1. Properly encode your password (essential if it has @, #, !, etc.)
password = urllib.parse.quote_plus("Ve1nk0y2@40")

# 2. Use your specific URI string
uri = f"mongodb+srv://ritheshbilli_db_user:{password}@cluster0.6lj6frr.mongodb.net/"

try:
    client = MongoClient(uri)
    # The 'ping' command is the best way to verify the connection is actually alive
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(f"Connection failed: {e}")
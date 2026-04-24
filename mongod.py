import urllib.parse

# 1. Properly encode your password (essential if it has @, #, !, etc.)
'''password = urllib.parse.quote_plus("Ve1nk0y2")'''

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
uri = "mongodb+srv://ritheshbilli_db_user:Ve1nk0y2@cluster0.6lj6frr.mongodb.net/?appName=Cluster0"
# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))
# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)
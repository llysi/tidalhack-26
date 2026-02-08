import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
let cachedClient: MongoClient | null = null;

export async function getDb(): Promise<Db> {
  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }
  return cachedClient.db();
}

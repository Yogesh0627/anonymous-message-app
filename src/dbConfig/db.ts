import mongoose from "mongoose"
import dns from "dns"
import { env } from "@/lib/env"

// Some networks block node's default DNS client, which breaks mongodb+srv SRV
// lookups (the app can't find the Atlas cluster). Setting DNS_SERVERS routes
// resolution through public DNS. No-op in environments where DNS already works.
if (process.env.DNS_SERVERS) {
  try {
    dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean))
  } catch {
    /* invalid list — fall back to default resolver */
  }
}

/**
 * In a serverless / Next.js environment the module can be re-evaluated on every
 * invocation, so we cache the connection on the global object to avoid opening a
 * new pool on each request. We never call process.exit here — throwing lets the
 * caller (an API route) return a clean 500 instead of killing the whole server.
 */
type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalForMongoose = global as unknown as { mongooseCache?: MongooseCache }
const cache: MongooseCache =
  globalForMongoose.mongooseCache ?? { conn: null, promise: null }
globalForMongoose.mongooseCache = cache

export const connectDB = async (): Promise<typeof mongoose> => {
  if (cache.conn) {
    return cache.conn
  }

  if (!cache.promise) {
    cache.promise = mongoose
      // serverSelectionTimeoutMS: fail fast (5s) when the DB is unreachable
      // instead of hanging on the driver's 30s default — a real outage returns a
      // clean 500 quickly rather than stalling the request.
      .connect(env.MONGOOSE_URI, { bufferCommands: false, serverSelectionTimeoutMS: 5000 })
      .then((m) => {
        console.log("Connected to database")
        return m
      })
  }

  try {
    cache.conn = await cache.promise
  } catch (error) {
    // Reset the promise so a later request can retry instead of reusing a
    // rejected promise forever.
    cache.promise = null
    throw error
  }

  return cache.conn
}

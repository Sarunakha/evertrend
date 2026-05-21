import mongoose from 'mongoose';

const globalCache = globalThis;

if (!globalCache.mongoose) {
  globalCache.mongoose = { conn: null, promise: null };
}

const cached = globalCache.mongoose;

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  return uri?.trim() || null;
};

const connectDB = async () => {
  const uri = getMongoUri();

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it in Vercel → Project Settings → Environment Variables (enable Preview for development branch).'
    );
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    };

    cached.promise = mongoose
      .connect(uri, options)
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        console.error(`MongoDB connection error: ${error.message}`);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    throw error;
  }

  return cached.conn;
};

export const isDatabaseConfigured = () => Boolean(getMongoUri());

export default connectDB;

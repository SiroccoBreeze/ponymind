import mongoose from 'mongoose';

// 定义全局mongoose类型
declare global {
  // eslint-disable-next-line no-var
  var mongoose: Cached | undefined;
}

// MongoDB连接URI格式：mongodb://username:password@host:port/database
const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('请在环境变量中定义 MONGODB_URI');
}

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const cached: Cached = global.mongoose || {
  conn: null,
  promise: null,
};

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    console.log('使用现有的MongoDB连接');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB连接成功');
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB连接失败:', error);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB; 
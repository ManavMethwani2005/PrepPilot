const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers (Google DNS) for MongoDB Atlas SRV record resolution
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (dnsErr) {
  console.warn(`[DNS Config Warning]: Unable to set custom DNS servers: ${dnsErr.message}`);
}

const connectDB = async () => {
  try {
    try {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    } catch (_) {}

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    // Do not crash server in dev if local mongo is offline; allow routes to handle or inform
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;

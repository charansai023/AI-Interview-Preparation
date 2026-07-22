const mongoose = require("mongoose");
const { mongodbUri } = require("./env");

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  mongoose.connection.on("error", (err) => {
    console.error("[mongodb] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("[mongodb] disconnected");
  });

  await mongoose.connect(mongodbUri);
  isConnected = true;
  console.log("[mongodb] connected");
  return mongoose.connection;
}

module.exports = { connectDB };

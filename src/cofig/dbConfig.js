import mongoose from 'mongoose';

export const connectDB = async () => {
    const URL = process.env.MONGO_DB;
    if (!URL) {
        console.warn("⚠️ Warning: MONGO_DB environment variable is not set.");
        return;
    }
    try {
        await mongoose.connect(URL);
        console.log("✅ MongoDB connected successfully");
        console.log("Database Name:", mongoose.connection.name);
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
    }
};

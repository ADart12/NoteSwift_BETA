import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory if present, or cwd
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/cofig/dbConfig.js';
import "./src/scheduler/attendenceScheduler.js";

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening at port ${PORT}`);
});

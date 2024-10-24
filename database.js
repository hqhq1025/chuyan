import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'users.db');

let db;

async function initializeDatabase() {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL
            )
        `);

        console.log('成功连接到 SQLite 数据库');
    } catch (error) {
        console.error('无法连接到数据库', error.message);
    }
}

initializeDatabase();

export default db;

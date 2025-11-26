const { Pool } = require('pg');

// Используем pooled connection для Vercel
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Функция для инициализации базы данных
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🚀 Initializing Neon PostgreSQL database...');
    
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName VARCHAR(100),
        lastName VARCHAR(100),
        photo TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Cases (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        theme VARCHAR(100),
        description TEXT,
        cover TEXT,
        files JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'open',
        executorId INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ProcessedCases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ProcessedCases (
        id SERIAL PRIMARY KEY,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        theme VARCHAR(100),
        description TEXT,
        cover TEXT,
        files JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'in_process',
        executorId INTEGER,
        executorEmail VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Projects (
        id SERIAL PRIMARY KEY,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        theme VARCHAR(100),
        description TEXT,
        cover TEXT,
        files JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'closed',
        executorEmail VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Reviews (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL,
        reviewerId INTEGER NOT NULL,
        reviewerName VARCHAR(100),
        reviewerPhoto TEXT,
        text TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ All tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
  } finally {
    client.release();
  }
}

// Инициализируем базу при старте
pool.on('connect', () => {
  console.log('🔗 Connected to Neon PostgreSQL');
  initializeDatabase();
});

pool.on('error', (err) => {
  console.error('💥 PostgreSQL pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
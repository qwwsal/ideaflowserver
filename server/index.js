const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const db = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      message: 'Server and database are running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// Регистрация
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO Users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Email уже зарегистрирован' });
    } else {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM Users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Неверный пароль' });
    
    res.json({ 
      id: user.id, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photo: user.photo
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение кейсов
app.get('/api/cases', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT Cases.*, Users.email as userEmail 
      FROM Cases 
      LEFT JOIN Users ON Cases.userId = Users.id
    `);
    
    const cases = result.rows.map(row => ({
      ...row,
      files: row.files || []
    }));
    
    res.json(cases);
  } catch (err) {
    console.error('Get cases error:', err);
    res.status(500).json({ error: 'Ошибка при получении кейсов' });
  }
});

// Получение проектов
app.get('/api/projects', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT Projects.*, Users.email as userEmail 
      FROM Projects 
      LEFT JOIN Users ON Projects.userId = Users.id
    `);
    
    const projects = result.rows.map(row => ({
      ...row,
      files: row.files || []
    }));
    
    res.json(projects);
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Ошибка при получении проектов' });
  }
});

// Test endpoint
app.post('/api/test-data', async (req, res) => {
  try {
    const hash = await bcrypt.hash('test123', 10);
    const userResult = await db.query(
      'INSERT INTO Users (email, password, firstName, lastName) VALUES ($1, $2, $3, $4) RETURNING id',
      ['test@example.com', hash, 'Test', 'User']
    );
    
    const userId = userResult.rows[0].id;
    
    await db.query(
      'INSERT INTO Cases (userId, title, theme, description) VALUES ($1, $2, $3, $4)',
      [userId, 'Тестовый кейс', 'Разработка', 'Описание тестового кейса']
    );
    
    res.json({ message: 'Тестовые данные созданы', userId });
  } catch (err) {
    console.error('Test data error:', err);
    res.status(500).json({ error: 'Ошибка создания тестовых данных' });
  }
});

// ВАЖНО: Для Vercel нужно экспортировать app
module.exports = app;
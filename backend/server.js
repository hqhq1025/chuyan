const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/mongodb');
const coursesRoute = require('./api/courses');

const app = express();

// 连接到 MongoDB
connectDB();

// CORS 配置
app.use(cors({
  origin: 'https://chuyan.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 中间件
app.use(express.json());

// 路由
app.use('/api/courses', coursesRoute);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

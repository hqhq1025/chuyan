const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/mongodb');
const coursesRoute = require('./api/courses');

const app = express();

// 连接到 MongoDB
connectDB().catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
});

// CORS 配置
app.use(cors({
  origin: ['https://chuyan.vercel.app', 'http://localhost:3000'],  // 添加本地开发 URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 中间件
app.use(express.json());

// 路由
app.use('/api/courses', coursesRoute);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('MongoDB URI:', process.env.MONGODB_URI);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

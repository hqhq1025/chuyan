const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/mongodb');
const coursesRoute = require('./api/courses');

const app = express();

// 连接到 MongoDB
connectDB();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/courses', coursesRoute);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

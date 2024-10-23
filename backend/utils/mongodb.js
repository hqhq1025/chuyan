const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        console.log('MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/.*:.*@/, '//<USERNAME>:<PASSWORD>@')); // 隐藏敏感信息
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            authSource: 'admin', // 添加这行
            retryWrites: true,
            w: 'majority'
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        if (error.name === 'MongoServerError' && error.code === 18) {
            console.error('Authentication failed. Please check your username and password.');
        } else if (error.name === 'MongoServerError' && error.code === 13) {
            console.error('Unauthorized access. Please check your database user permissions.');
        }
        process.exit(1);
    }
};

module.exports = connectDB;

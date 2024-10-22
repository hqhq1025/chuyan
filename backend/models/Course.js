const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: String,
    teacher: String,
    day: String,
    startTime: Date,
    endTime: Date,
    location: String,
    weeks: [Number],
});

module.exports = mongoose.model('Course', courseSchema);

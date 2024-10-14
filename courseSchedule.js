// courseSchedule.js

function parseXLSFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            resolve(jsonData);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function extractCourses(jsonData) {
    const courses = [];
    const timeSlots = {
        '1': { start: '08:00', end: '08:45' },
        '2': { start: '08:50', end: '09:35' },
        '3': { start: '09:50', end: '10:35' },
        '4': { start: '10:40', end: '11:25' },
        '5': { start: '11:30', end: '12:15' },
        '6': { start: '13:00', end: '13:45' },
        '7': { start: '13:50', end: '14:35' },
        '8': { start: '14:45', end: '15:30' },
        '9': { start: '15:40', end: '16:25' },
        '10': { start: '16:35', end: '17:20' },
        '11': { start: '17:25', end: '18:10' },
        '12': { start: '18:30', end: '19:15' },
        '13': { start: '19:20', end: '20:05' },
        '14': { start: '20:10', end: '20:55' }
    };
    
    const daysOfWeek = jsonData[2].slice(1, 8);
    
    for (let i = 3; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && typeof row[0] === 'string' && row[0].includes('-')) {
            const slotInfo = row[0].split('\n');
            const slotNumber = slotInfo[0];
            const timeSlot = timeSlots[slotNumber];
            
            for (let j = 1; j < 8; j++) {
                if (row[j] && typeof row[j] === 'string') {
                    const courseInfo = row[j].split('\n').filter(item => item.trim() !== '');
                    if (courseInfo.length >= 3) {
                        const weekInfo = courseInfo[courseInfo.length - 3].match(/(\d+)(?:-(\d+))?(?:\[单周\]|\[双周\])?/);
                        const weeks = weekInfo ? extractWeeks(weekInfo[0]) : [];
                        courses.push({
                            name: courseInfo[0],
                            teacher: courseInfo[1],
                            day: daysOfWeek[j-1],
                            startTime: timeSlot.start,
                            endTime: timeSlot.end,
                            location: courseInfo[courseInfo.length - 2],
                            weeks: weeks,
                            duration: calculateDuration(timeSlot.start, timeSlot.end)
                        });
                    }
                }
            }
        }
    }
    return courses;
}

function extractWeeks(weekString) {
    const weeks = [];
    const patterns = [
        /(\d+)-(\d+)(?:\[单周\]|\[双周\])?/g,
        /(\d+)(?:,(\d+))*(?:\[单周\]|\[双周\])?/g,
    ];

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(weekString)) !== null) {
            if (match[2] && match[2].includes(',')) {
                match[2].split(',').forEach(week => weeks.push(parseInt(week)));
            } else if (match[2]) {
                const start = parseInt(match[1]);
                const end = parseInt(match[2]);
                for (let i = start; i <= end; i++) {
                    if (weekString.includes('[单周]') && i % 2 === 1) {
                        weeks.push(i);
                    } else if (weekString.includes('[双周]') && i % 2 === 0) {
                        weeks.push(i);
                    } else if (!weekString.includes('[单周]') && !weekString.includes('[双周]')) {
                        weeks.push(i);
                    }
                }
            } else {
                weeks.push(parseInt(match[1]));
            }
        }
    });

    return [...new Set(weeks)].sort((a, b) => a - b);
}

function calculateDuration(startTime, endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    return `${Math.floor(durationMinutes / 60)}小时${durationMinutes % 60}分钟`;
}

function convertToCalendarEvents(courses) {
    const events = [];
    const startDate = new Date('2024-08-26'); // 假设学期开始日期为2024年8月26日，请根据实际情况调整

    const dayMapping = {
        '星期一': 0, '星期二': 1, '星期三': 2, '星期四': 3, 
        '星期五': 4, '星期六': 5, '星期日': 6
    };

    courses.forEach(course => {
        const dayIndex = dayMapping[course.day];
        if (dayIndex === undefined) {
            console.error('Invalid day:', course.day);
            return;
        }
        
        // 检查 course.time 是否存在并且包含 '-'
        if (!course.time || !course.time.includes('-')) {
            console.error('Invalid time format for course:', course);
            return;
        }

        const [startTime, endTime] = course.time.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        // 检查 course.weeks 是否为字符串，如果是，则分割它
        const weeks = typeof course.weeks === 'string' ? course.weeks.split(',').map(Number) : course.weeks;

        weeks.forEach(week => {
            const eventStartDate = new Date(startDate);
            eventStartDate.setDate(startDate.getDate() + (week - 1) * 7 + dayIndex);
            eventStartDate.setHours(startHour, startMinute, 0, 0);

            const eventEndDate = new Date(eventStartDate);
            eventEndDate.setHours(endHour, endMinute, 0, 0);

            events.push({
                title: `${course.name}\n${course.location}`,
                start: eventStartDate,
                end: eventEndDate,
                allDay: false,
                extendedProps: {
                    location: course.location
                }
            });
        });
    });

    return events;
}

function prepareParseResult(courses) {
    return {
        coursesCount: courses.length,
        coursesList: courses.map(course => ({
            name: course.name,
            day: course.day,
            time: `${course.startTime}-${course.endTime}`,
            location: course.location,
            weeks: course.weeks.join(',')
        }))
    };
}

function processUploadedCourses(jsonData) {
    const courses = extractCourses(jsonData);
    return prepareParseResult(courses);
}

// 在文件末尾添加：
window.parseXLSFile = parseXLSFile;
window.processUploadedCourses = processUploadedCourses;
window.convertToCalendarEvents = convertToCalendarEvents;

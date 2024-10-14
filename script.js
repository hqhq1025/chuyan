let notificationDate = new Date(); // 默认为当前日期
let calendar;

document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    // ... 其他初始化代码 ...

    // 添加课程表按钮的事件监听器
    const addCourseScheduleBtn = document.getElementById('addCourseScheduleBtn');
    if (addCourseScheduleBtn) {
        addCourseScheduleBtn.addEventListener('click', showUploadModal);
    } else {
        console.error('添加课程表按钮未找到');
    }
});

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true,
        selectable: true,
        select: function(info) {
            addEventPrompt(info.start, info.end, info.allDay);
        },
        eventClick: function(info) {
            showEventDetails(info.event);
        },
        events: [], // 初始化一个的事件数
        displayEventTime: true, // 显示事件时间
        eventTimeFormat: { // 自定义时间格式
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
        }
    });
    calendar.render();
    console.log('Calendar initialized:', calendar);
}

const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatBox = document.getElementById('chatBox');

sendButton.addEventListener('click', processInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        processInput();
    }
});

// 在文件开头添加以下函数
async function callAI(userInput) {
    if (typeof window.processUserInput === 'undefined') {
        console.error('processUserInput 函数未定义。请确保 aiAssistant.js 文件已正确加载。');
        throw new Error('AI 助手功能未正确加载');
    }
    try {
        const aiResponse = await window.processUserInput(userInput);
        console.log('AI响应:', aiResponse);
        return aiResponse;
    } catch (error) {
        console.error('调用AI时出错:', error);
        throw error;
    }
}

// 修改 processInput 函数
async function processInput() {
    notificationDate = new Date(); // 更新 notificationDate
    const input = userInput.value.trim();
    if (input) {
        updateChat(`用户输入: ${input}`);
        try {
            const aiResponse = await callAI(input);
            updateChat(`AI回复: ${aiResponse}`);
            const { schedules, reminders } = parseAIResponse(aiResponse, input); // 传递原始输入
            
            console.log('Parsed schedules:', schedules);
            console.log('Parsed reminders:', reminders);

            if (schedules.length > 0) {
                const selectedSchedules = await showConfirmDialog(schedules);
                console.log('Selected schedules after confirmation:', selectedSchedules);
            } else {
                updateChat('无法从AI回复中提取完整的任务信息，请尝试更明确的表述。');
            }

            if (reminders.length > 0) {
                updateChat('提醒事项：');
                reminders.forEach(reminder => updateChat(`- ${reminder}`));
            }
        } catch (error) {
            console.error('处理输入时出错:', error);
            updateChat(`处理输入出错: ${error.message}。请尝试重新输入或联系管理员。`);
        }
        userInput.value = '';
    }
}

// 在文件顶部添加这个函数
function getNextOccurrence(dayOfWeek, referenceDate = new Date()) {
    const daysUntilNext = (dayOfWeek - referenceDate.getDay() + 7) % 7;
    const nextDate = new Date(referenceDate);
    nextDate.setDate(referenceDate.getDate() + daysUntilNext);
    return nextDate;
}

// 修改 parseAIResponse 函数
function parseAIResponse(aiResponse, originalInput) {
    try {
        // 移除可能存在的 Markdown 代码块标记
        let cleanResponse = aiResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
        
        // 尝试解析为JSON
        try {
            const jsonResponse = JSON.parse(cleanResponse);
            return parseJsonResponse(jsonResponse, originalInput);
        } catch (jsonError) {
            // 如果JSON解析失败，试解析Markdown格式
            return parseMarkdownResponse(cleanResponse, originalInput);
        }
    } catch (error) {
        console.error('解析AI响应时出错:', error);
        return { schedules: [], reminders: [] };
    }
}

// 修改 parseJsonResponse 函数
function parseJsonResponse(jsonResponse, originalInput) {
    const schedules = [];
    let reminders = [];

    if (jsonResponse.日程) {
        jsonResponse.日程.forEach(event => {
            const startDate = parseChineseDateTime(event.开始时间);
            if (isValidDate(startDate)) {
                schedules.push({
                    title: event.待办事项,
                    start: startDate,
                    end: event.预计时长 !== '未知' ? calculateEndTime(startDate, event.预计时长) : null,
                    allDay: false,
                    recurrence: event.重复频率,
                    notes: event.备注,
                    isReminder: false,
                    originalInput: originalInput // 使用原始用户输入
                });
            } else {
                console.error('无效的日期时间:', event.开始时间);
            }
        });
    }

    if (jsonResponse.提醒事项) {
        reminders = jsonResponse.提醒事项;
    }

    console.log('解析后的程:', schedules);
    console.log('解析后的提醒事项:', reminders);
    return { schedules, reminders };
}

// 修改 parseMarkdownResponse 函数
function parseMarkdownResponse(markdownResponse, originalInput) {
    const schedules = [];
    let reminders = [];
    let currentSchedule = null;

    const lines = markdownResponse.split('\n');
    for (const line of lines) {
        if (line.startsWith('### 日程')) {
            if (currentSchedule) {
                schedules.push(currentSchedule);
            }
            currentSchedule = {
                title: '',
                start: null,
                end: null,
                allDay: false,
                recurrence: '不重复',
                notes: '',
                isReminder: false,
                originalInput: originalInput // 添加原始输入
            };
        } else if (line.startsWith('1. 待办事项：')) {
            currentSchedule.title = line.substring('1. 待办事项：'.length).trim();
        } else if (line.startsWith('2. 开始时间：')) {
            currentSchedule.start = parseChineseDateTime(line.substring('2. 开始时间：'.length).trim());
        } else if (line.startsWith('3. 预计时长：')) {
            const durationStr = line.substring('3. 预计时长：'.length).trim();
            if (durationStr !== '未知' && currentSchedule.start) {
                currentSchedule.end = calculateEndTime(currentSchedule.start, durationStr);
            }
        } else if (line.startsWith('4. 重复频率：')) {
            currentSchedule.recurrence = line.substring('4. 重复频率：'.length).trim();
        } else if (line.startsWith('5. 备注：')) {
            currentSchedule.notes = line.substring('5. 备注：'.length).trim();
        } else if (line.startsWith('### 提醒事项：')) {
            reminders.push(line.substring('### 提醒事项：'.length).trim());
        }
    }

    if (currentSchedule) {
        schedules.push(currentSchedule);
    }

    console.log('解析后的日程:', schedules);
    console.log('解析后的提醒事项:', reminders);
    return { schedules, reminders };
}

// 修改 parseChineseDateTime 函数
function parseChineseDateTime(dateTimeStr, referenceDate = new Date()) {
    if (!dateTimeStr) {
        console.warn('日期时间字符串为空');
        return null;
    }

    console.log('正在解析日期时间:', dateTimeStr);

    const result = new Date(referenceDate);
    const currentYear = referenceDate.getFullYear();

    // 处理相对日期
    if (dateTimeStr.includes('今天') || dateTimeStr.includes('今日')) {
        // 保持当前日期不变
    } else if (dateTimeStr.includes('明天')) {
        result.setDate(result.getDate() + 1);
    } else if (dateTimeStr.includes('后天')) {
        result.setDate(result.getDate() + 2);
    } else if (dateTimeStr.includes('下周')) {
        result.setDate(result.getDate() + 7);
    } else {
        // 解析具体日期
        const dateMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})[日号]/);
        if (dateMatch) {
            result.setFullYear(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
        }
    }

    // 解析时间
    const timeMatch = dateTimeStr.match(/(\d{1,2})[:：](\d{2})|(\d{1,2})(点|时)(?:(\d{1,2})分?)?/);
    if (timeMatch) {
        let hours, minutes;
        if (timeMatch[1] && timeMatch[2]) {
            // 处理 HH:mm 格式
            hours = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
        } else {
            // 处理 X点Y分 或 X时Y分 格式
            hours = parseInt(timeMatch[3]);
            minutes = timeMatch[5] ? parseInt(timeMatch[5]) : 0;
        }

        // 处理时间段
        const periodMatch = dateTimeStr.match(/(上午|下午|晚上|凌晨)/);
        if (periodMatch) {
            const period = periodMatch[1];
            if ((period === '下午' || period === '晚上') && hours < 12) {
                hours += 12;
            } else if (period === '凌晨' && hours === 12) {
                hours = 0;
            }
        } else if (hours < 12 && !dateTimeStr.includes('上午') && !dateTimeStr.includes('凌晨')) {
            // 如果没有明指定上午，且小于12点，默认为下午
            hours += 12;
        }

        result.setHours(hours, minutes, 0, 0);
    } else {
        // 如果没有指定时间，默认设置为当天的上午9点
        result.setHours(9, 0, 0, 0);
    }

    console.log('解析后的日期时间:', result);
    return result;
}

// 修改 calculateEndTime 函数
function calculateEndTime(startTime, duration) {
    if (!startTime || !duration) {
        console.warn('计算结束时间失败: 开始时间或持续时间无效');
        return null;
    }

    const durationMatch = duration.match(/(\d+)\s*(小时|分钟)/);
    if (durationMatch) {
        const amount = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        const durationInMinutes = unit === '小时' ? amount * 60 : amount;
        return new Date(startTime.getTime() + durationInMinutes * 60000);
    }

    console.warn(`无法解析持续时间: ${duration}`);
    return null;
}

// 修改 showConfirmDialog 函数
async function showConfirmDialog(schedules) {
    console.log('Schedules to confirm:', schedules);
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        modalTitle.textContent = '确认添加任务';
        
        let bodyContent = '<div style="max-height: 400px; overflow-y: auto;">';
        schedules.forEach((taskInfo, index) => {
            bodyContent += `
                <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px;">
                    <h3>${taskInfo.isReminder ? '提醒事项' : '日程'} ${index + 1}</h3>
                    <p><strong>标题:</strong> ${taskInfo.title}</p>
                    <p><strong>开始时间:</strong> ${taskInfo.start ? taskInfo.start.toLocaleString() : '未指定'}</p>
                    <p><strong>结束时间:</strong> ${taskInfo.end ? taskInfo.end.toLocaleString() : '未指定'}</p>
                    <p><strong>重复频率:</strong> ${taskInfo.recurrence}</p>
                    <p><strong>备注:</strong> ${taskInfo.notes}</p>
                    <label>
                        <input type="checkbox" class="schedule-checkbox" checked> 添加此${taskInfo.isReminder ? '提醒' : '日程'}
                    </label>
                </div>
            `;
        });
        bodyContent += '</div>';
        
        modalBody.innerHTML = bodyContent;

        modal.style.display = 'block';

        confirmBtn.onclick = function() {
            const selectedSchedules = [];
            const checkboxes = modalBody.querySelectorAll('.schedule-checkbox');
            checkboxes.forEach((checkbox, index) => {
                if (checkbox.checked) {
                    selectedSchedules.push(schedules[index]);
                }
            });
            modal.style.display = 'none';
            
            console.log('Selected schedules:', selectedSchedules);
            
            // 立即添加事件到日历
            selectedSchedules.forEach(taskInfo => {
                addEventToCalendar(taskInfo);
            });
            
            calendar.render(); // 确保在添加所有事件后重新渲染日历
            
            resolve(selectedSchedules);
        };

        cancelBtn.onclick = function() {
            modal.style.display = 'none';
            resolve([]);
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                resolve([]);
            }
        };
    });
}

// 修 addEventToCalendar 函数
function addEventToCalendar(taskInfo) {
    console.log('Adding event to calendar:', taskInfo);

    if (!taskInfo.start) {
        console.error('无效的开始时间:', taskInfo);
        updateChat(`添加日败：${taskInfo.title} - 无效的开始时间`);
        return;
    }

    const eventData = {
        title: taskInfo.title,
        start: taskInfo.start,
        end: taskInfo.end || null,
        allDay: taskInfo.allDay || false,
        extendedProps: {
            notes: taskInfo.notes,
            originalInput: taskInfo.originalInput,
            isReminder: taskInfo.isReminder
        }
    };

    if (taskInfo.recurrence && taskInfo.recurrence !== '不重复') {
        eventData.rrule = {
            freq: getFrequency(taskInfo.recurrence),
            dtstart: taskInfo.start
        };
    }

    console.log('Event data to be added:', eventData);

    try {
        const addedEvent = calendar.addEvent(eventData);
        console.log('Event added successfully:', addedEvent);
        calendar.gotoDate(taskInfo.start); // 跳转到事件日期
        calendar.render();
        console.log('Calendar events after adding:', calendar.getEvents());
        updateChat(`已添加${taskInfo.isReminder ? '提醒' : '日程'}：${taskInfo.title}`);
    } catch (error) {
        console.error('Failed to add event:', error);
        updateChat(`添加${taskInfo.isReminder ? '提醒' : '日程'}失败：${taskInfo.title}`);
    }
}

function getFrequency(recurrence) {
    switch (recurrence.toLowerCase()) {
        case '每天': return 'daily';
        case '每周': return 'weekly';
        case '每月': return 'monthly';
        case '每年': return 'yearly';
        default: return 'daily';
    }
}

function updateChat(message) {
    const chatMessage = document.createElement('p');
    chatMessage.textContent = message;
    chatBox.appendChild(chatMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addEventPrompt(start, end, allDay) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    modalTitle.textContent = '添加新事件';
    modalBody.innerHTML = `
        <input type="text" id="newEventTitle" placeholder="请入新事件的标题">
    `;

    modal.style.display = 'block';

    confirmBtn.onclick = function() {
        const title = document.getElementById('newEventTitle').value;
        if (title) {
            calendar.addEvent({
                title: title,
                start: start,
                end: end,
                allDay: allDay
            });
        }
        modal.style.display = 'none';
        calendar.unselect();
    };

    cancelBtn.onclick = function() {
        modal.style.display = 'none';
        calendar.unselect();
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            calendar.unselect();
        }
    };
}

// 修改 showEventDetails 函数
function showEventDetails(event) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    modalTitle.textContent = '事件详情';
    modalBody.innerHTML = `
        <p><strong>标题:</strong> ${event.title}</p>
        <p><strong>开始时间:</strong> ${event.start.toLocaleString()}</p>
        <p><strong>结束时间:</strong> ${event.end ? event.end.toLocaleString() : '未指定'}</p>
        <p><strong>重复频率:</strong> ${event.rrule ? getRecurrenceText(event.rrule) : '不重复'}</p>
        <p><strong>备注:</strong> ${event.extendedProps.notes || '无'}</p>
        <div class="original-input-container">
            <button id="toggleOriginalInput" class="toggle-btn">显示原文</button>
            <div id="originalInputText" class="original-input-text" style="display: none;">
                <p>${event.extendedProps.originalInput || '无原始输入'}</p>
            </div>
        </div>
    `;

    const toggleBtn = modalBody.querySelector('#toggleOriginalInput');
    const originalInputText = modalBody.querySelector('#originalInputText');

    toggleBtn.addEventListener('click', function() {
        if (originalInputText.style.display === 'none') {
            originalInputText.style.display = 'block';
            toggleBtn.textContent = '隐藏原文';
            toggleBtn.classList.add('active');
        } else {
            originalInputText.style.display = 'none';
            toggleBtn.textContent = '显示原文';
            toggleBtn.classList.remove('active');
        }
    });

    modal.style.display = 'block';

    confirmBtn.style.display = 'none';
    cancelBtn.textContent = '关闭';

    cancelBtn.onclick = function() {
        modal.style.display = 'none';
        confirmBtn.style.display = 'inline-block';
        cancelBtn.textContent = '取消';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            confirmBtn.style.display = 'inline-block';
            cancelBtn.textContent = '取消';
        }
    };
}

function getRecurrenceText(rrule) {
    switch (rrule.freq) {
        case 'daily':
            return '每天';
        case 'weekly':
            return '每周';
        case 'monthly':
            return '每月';
        case 'yearly':
            return '每年';
        default:
            return '自定义';
    }
}

// 加入样式模板功能
window.setInput = function(sample) {
    userInput.value = sample;
}

// 文件末尾添加以下函数

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
    const daysOfWeek = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
    
    for (let i = 2; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && typeof row[0] === 'string' && row[0].includes('-')) {
            const timeSlot = row[0].split('\n');
            const startTime = timeSlot[1].split('-')[0];
            
            for (let j = 1; j < 8; j++) {
                if (row[j] && typeof row[j] === 'string') {
                    const courseInfo = row[j].split('\n').filter(item => item.trim() !== '');
                    if (courseInfo.length >= 3) {
                        courses.push({
                            name: courseInfo[0],
                            day: daysOfWeek[j-1],
                            startTime: startTime,
                            location: courseInfo[courseInfo.length - 2],
                            weeks: extractWeeks(courseInfo[courseInfo.length - 3])
                        });
                    }
                }
            }
        }
    }
    return courses;
}

function extractWeeks(weekString) {
    const weekRanges = weekString.match(/\d+-\d+|\d+/g);
    const weeks = [];
    if (weekRanges) {
        weekRanges.forEach(range => {
            if (range.includes('-')) {
                const [start, end] = range.split('-').map(Number);
                for (let i = start; i <= end; i++) {
                    weeks.push(i);
                }
            } else {
                weeks.push(Number(range));
            }
        });
    }
    return weeks;
}

function convertToCalendarEvents(courses) {
    const events = [];
    const startDate = new Date('2024-09-02'); // 假设学期开始日期为2024年9月2日，请根据实际情况调整

    courses.forEach(course => {
        const dayIndex = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'].indexOf(course.day);
        const [hours, minutes] = course.startTime.split(':').map(Number);

        course.weeks.forEach(week => {
            const eventDate = new Date(startDate);
            eventDate.setDate(startDate.getDate() + (week - 1) * 7 + dayIndex);
            eventDate.setHours(hours, minutes, 0, 0);

            events.push({
                title: `${course.name}\n${course.location}`,
                start: eventDate,
                allDay: false,
                extendedProps: {
                    location: course.location
                }
            });
        });
    });

    return events;
}

function processUploadedCourses(jsonData) {
    const courses = extractCourses(jsonData);
    const events = convertToCalendarEvents(courses);
    events.forEach(event => calendar.addEvent(event));
    calendar.render();
    updateChat('课程表已成功添加');
}

// 修改 showUploadModal 函数
function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    const fileInput = document.getElementById('xlsFileInput');
    const uploadBtn = document.getElementById('uploadFileBtn');
    const cancelBtn = document.getElementById('cancelUploadBtn');

    modal.style.display = 'block';

    uploadBtn.onclick = function() {
        const file = fileInput.files[0];
        if (file) {
            parseXLSFile(file).then(jsonData => {
                const courses = extractCourses(jsonData);
                showParseResult(courses);
            });
        } else {
            alert('请选择一个文件');
        }
    };

    cancelBtn.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function showParseResult(courses) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
        <h3>解析结果</h3>
        <p>共解析到 ${courses.length} 门课程：</p>
        <ul>
            ${courses.map(course => `
                <li>
                    ${course.name} - 
                    ${course.day} 
                    ${course.startTime}
                    ${course.location}
                    (第${course.weeks.join(',')}周)
                </li>
            `).join('')}
        </ul>
        <p>是否确认添加这些课程到日历？</p>
    `;

    showCustomModal(
        '课程表解析结果',
        modalContent,
        () => {
            const events = convertToCalendarEvents(courses);
            events.forEach(event => calendar.addEvent(event));
            calendar.render();
            hideCustomModal();
            updateChat('课程表已成功添加');
        },
        hideCustomModal
    );
}

function showCustomModal(title, content, onConfirm, onCancel) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    modalBody.appendChild(content);

    confirmBtn.onclick = onConfirm;
    cancelBtn.onclick = onCancel;

    modal.style.display = 'block';
}

function hideCustomModal() {
    const modal = document.getElementById('customModal');
    modal.style.display = 'none';
}
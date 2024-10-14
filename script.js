// 在文件开头添加导入语句
// import { parseXLSFile, processUploadedCourses } from './courseSchedule.js';

let notificationDate = new Date(); // 默认为当前日期
let calendar;
let isMemoryModeEnabled = true;

document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    // ... 其他初始化代码 ...

    const memoryModeToggle = document.getElementById('memoryModeToggle');
    if (memoryModeToggle) {
        memoryModeToggle.addEventListener('change', toggleMemoryMode);
        // 初始化时检查本地存储中的设置
        const savedMemoryMode = localStorage.getItem('memoryModeEnabled');
        if (savedMemoryMode !== null) {
            isMemoryModeEnabled = JSON.parse(savedMemoryMode);
            memoryModeToggle.checked = isMemoryModeEnabled;
        }
    } else {
        console.error('记忆模式开关未找到');
    }

    // 如果记忆模式开启，则加载保存的事件
    if (isMemoryModeEnabled) {
        loadEvents();
    }

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
        events: [], // 初始化一个事件数
        displayEventTime: true, // 显示事件时间
        eventTimeFormat: { // 自定义时间格式
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
        },
        eventAdd: function(info) {
            if (isMemoryModeEnabled) saveEvents();
        },
        eventChange: function(info) {
            if (isMemoryModeEnabled) saveEvents();
        },
        eventRemove: function(info) {
            if (isMemoryModeEnabled) saveEvents();
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
            const { schedules, reminders } = parseAIResponse(aiResponse, input);
            
            console.log('Parsed schedules:', schedules);
            console.log('Parsed reminders:', reminders);

            if (schedules.length > 0) {
                const selectedSchedules = await showConfirmDialog(schedules);
                console.log('Selected schedules after confirmation:', selectedSchedules);
                selectedSchedules.forEach(taskInfo => {
                    addEventToCalendar(taskInfo);
                });
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

// 在文件顶部添这个函数
function getNextOccurrence(dayOfWeek, referenceDate = new Date()) {
    const daysUntilNext = (dayOfWeek - referenceDate.getDay() + 7) % 7;
    const nextDate = new Date(referenceDate);
    nextDate.setDate(referenceDate.getDate() + daysUntilNext);
    return nextDate;
}

// 确保 parseAIResponse 函数正确实现
function parseAIResponse(aiResponse, originalInput) {
    try {
        // 移除可能存在的 Markdown 代码块标记
        let cleanResponse = aiResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
        
        // 尝试解析为JSON
        const jsonResponse = JSON.parse(cleanResponse);
        return parseJsonResponse(jsonResponse, originalInput);
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
            if (startDate) {
                schedules.push({
                    title: event.待办事项,
                    start: startDate,
                    end: event.预计时长 !== '未知' ? calculateEndTime(startDate, event.预计时长) : null,
                    allDay: false,
                    recurrence: event.重复频率,
                    notes: event.备注,
                    isReminder: false,
                    originalInput: originalInput
                });
            } else {
                console.error('无效的日期时间:', event.开始时间);
            }
        });
    }

    if (jsonResponse.提醒事项) {
        reminders = jsonResponse.提醒事项;
    }

    console.log('解析后的日程:', schedules);
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

    // 直接解析 AI 返回的日期时间格式
    const dateTimeParts = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})/);
    if (dateTimeParts) {
        const [_, year, month, day, hour, minute] = dateTimeParts;
        const result = new Date(year, month - 1, day, hour, minute);
        console.log('解析后的日期时间:', result);
        return result;
    }

    console.error('无法解析日期时间:', dateTimeStr);
    return null;
}

// 添加 calculateEndTime 函数（如果还没有的话）
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
        calendar.render();
        if (isMemoryModeEnabled) saveEvents();
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
                <p>${event.extendedProps.originalInput || '原始输入'}</p>
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

function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    const fileInput = document.getElementById('xlsFileInput');
    const uploadBtn = document.getElementById('uploadFileBtn');
    const cancelBtn = document.getElementById('cancelUploadBtn');

    modal.style.display = 'block';

    uploadBtn.onclick = function() {
        const file = fileInput.files[0];
        if (file) {
            window.parseXLSFile(file).then(jsonData => {
                const parseResult = window.processUploadedCourses(jsonData);
                hideAllModals(); // 关闭上传模态框
                showParseResult(parseResult);
            });
        } else {
            alert('请选择一个文件');
        }
    };

    cancelBtn.onclick = hideAllModals;

    window.onclick = function(event) {
        if (event.target == modal) {
            hideAllModals();
        }
    };
}

function showParseResult(parseResult) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
        <h3>解析结果</h3>
        <p>共解析到 ${parseResult.coursesCount} 门课程：</p>
        <div style="max-height: 300px; overflow-y: auto;">
            <ul>
                ${parseResult.coursesList.map(course => `
                    <li>
                        ${course.name} - 
                        ${course.day} 
                        ${course.time}
                        ${course.location}
                        (第${course.weeks}周)
                    </li>
                `).join('')}
            </ul>
        </div>
        <p>是否确认添加这些课程到日历？</p>
    `;

    showCustomModal(
        '课程表解析结果',
        modalContent,
        () => {
            const events = window.convertToCalendarEvents(parseResult.coursesList);
            events.forEach(event => calendar.addEvent(event));
            calendar.render();
            if (isMemoryModeEnabled) saveEvents();
            hideAllModals();
            updateChat('课程表已成功添加');
        },
        hideAllModals
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

    confirmBtn.onclick = () => {
        onConfirm();
        hideAllModals();
    };
    cancelBtn.onclick = () => {
        onCancel();
        hideAllModals();
    };

    modal.style.display = 'block';
}

function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
}

// 修改 saveEvents 函数
function saveEvents() {
    if (isMemoryModeEnabled) {
        const events = calendar.getEvents().map(event => ({
            title: event.title,
            start: event.start.toISOString(),
            end: event.end ? event.end.toISOString() : null,
            allDay: event.allDay,
            extendedProps: event.extendedProps
        }));
        localStorage.setItem('calendarEvents', JSON.stringify(events));
    }
}

// 修改 loadEvents 函数
function loadEvents() {
    if (isMemoryModeEnabled) {
        const savedEvents = localStorage.getItem('calendarEvents');
        if (savedEvents) {
            const events = JSON.parse(savedEvents);
            events.forEach(event => {
                calendar.addEvent({
                    title: event.title,
                    start: new Date(event.start),
                    end: event.end ? new Date(event.end) : null,
                    allDay: event.allDay,
                    extendedProps: event.extendedProps
                });
            });
        }
    }
}

function toggleMemoryMode() {
    isMemoryModeEnabled = !isMemoryModeEnabled;
    localStorage.setItem('memoryModeEnabled', JSON.stringify(isMemoryModeEnabled));
    
    if (isMemoryModeEnabled) {
        saveEvents();
    } else {
        localStorage.removeItem('calendarEvents');
    }
}

// 确保 isValidDate 函数存在
function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}
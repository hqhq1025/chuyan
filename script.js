let notificationDate = new Date(); // 默认为当前日期

document.addEventListener('DOMContentLoaded', () => {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
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
        }
    });
    calendar.render();

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
        const input = userInput.value.trim();
        if (input) {
            updateChat(`用户输入: ${input}`);
            try {
                const aiResponse = await callAI(input);
                updateChat(`AI回复: ${aiResponse}`);
                const { schedules, reminders } = parseAIResponse(aiResponse);
                
                if (schedules.length > 0) {
                    const selectedSchedules = await showConfirmDialog(schedules);
                    for (const taskInfo of selectedSchedules) {
                        taskInfo.originalInput = input;
                        addEventToCalendar(taskInfo);
                    }
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
    function parseAIResponse(aiResponse) {
        try {
            // 移除可能存在的 Markdown 代码块标记
            let cleanResponse = aiResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
            const jsonResponse = JSON.parse(cleanResponse);
            const schedules = [];
            let reminders = [];

            for (const key in jsonResponse) {
                if (key.startsWith('日程')) {
                    const event = jsonResponse[key];
                    const startTime = parseChineseDateTime(event.开始时间);
                    if (startTime) {
                        schedules.push({
                            title: event.待办事项 || '未知事项',
                            start: startTime,
                            end: event.预计时长 !== '未知' ? calculateEndTime(startTime, event.预计时长) : null,
                            allDay: false,
                            recurrence: event.重复频率 || '不重复',
                            notes: event.备注 || '',
                            isReminder: false
                        });
                    }
                } else if (key === '提醒事项') {
                    if (typeof jsonResponse.提醒事项 === 'string') {
                        reminders = [jsonResponse.提醒事项];
                    } else if (Array.isArray(jsonResponse.提醒事项)) {
                        reminders = jsonResponse.提醒事项;
                    }
                }
            }

            // 将提醒事项也添加到日程中
            reminders.forEach(reminder => {
                const reminderDate = parseChineseDateTime(reminder) || new Date();
                schedules.push({
                    title: reminder,
                    start: reminderDate,
                    end: null,
                    allDay: true,
                    recurrence: '不重复',
                    notes: '提醒事项',
                    isReminder: true
                });
            });

            return { schedules, reminders };
        } catch (error) {
            console.error('解析AI响应时出错:', error);
            return { schedules: [], reminders: [] };
        }
    }

    // 修改 parseChineseDateTime 函数
    function parseChineseDateTime(dateTimeStr, referenceDate = new Date()) {
        if (!dateTimeStr) {
            console.warn('日期时间字符串为空');
            return null;
        }

        const result = new Date(referenceDate);
        const currentYear = referenceDate.getFullYear();

        // 解析日期
        const dateMatch = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            result.setFullYear(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
        } else {
            // 如果没有找到完整的日期，尝试解析年月日
            const yearMatch = dateTimeStr.match(/(\d{4})年/);
            const monthMatch = dateTimeStr.match(/(\d{1,2})月/);
            const dayMatch = dateTimeStr.match(/(\d{1,2})[日号]/);

            if (yearMatch) result.setFullYear(parseInt(yearMatch[1]));
            if (monthMatch) result.setMonth(parseInt(monthMatch[1]) - 1);
            if (dayMatch) result.setDate(parseInt(dayMatch[1]));
        }

        // 解析时间
        const timeMatch = dateTimeStr.match(/(\d{1,2})([:：](\d{2}))?\s*(上午|下午|晚上)?/);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
            const period = timeMatch[4];

            if (period === '下午' || period === '晚上' || (period === undefined && hours < 12 && hours !== 0)) {
                hours += 12;
            }
            if (hours === 24) hours = 0;

            result.setHours(hours, minutes, 0, 0);
        } else {
            // 如果没有指定时间，默认设置为当天的上午9点
            result.setHours(9, 0, 0, 0);
        }

        return result;
    }

    // 修改 calculateEndTime 函数
    function calculateEndTime(startTime, duration) {
        const durationMatch = duration.match(/(\d+)\s*(小时|分钟)/);
        if (durationMatch) {
            const amount = parseInt(durationMatch[1]);
            const unit = durationMatch[2];
            const durationInMinutes = unit === '小时' ? amount * 60 : amount;
            return new Date(startTime.getTime() + durationInMinutes * 60000);
        }
        return null;
    }

    // 修改 showConfirmDialog 函数
    async function showConfirmDialog(schedules) {
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

    // 修改 addEventToCalendar 函数
    function addEventToCalendar(taskInfo) {
        const eventData = {
            title: taskInfo.title,
            start: taskInfo.start,
            end: taskInfo.end,
            allDay: taskInfo.allDay,
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

        calendar.addEvent(eventData);
        updateChat(`已添加${taskInfo.isReminder ? '提醒' : '日程'}：${taskInfo.title}`);
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
            <p><strong>始时间:</strong> ${event.start.toLocaleString()}</p>
            <p><strong>结束时间:</strong> ${event.end ? event.end.toLocaleString() : '未指定'}</p>
            <p><strong>重复频率:</strong> ${event.rrule ? getRecurrenceText(event.rrule) : '不重复'}</p>
            <p><strong>备注:</strong> ${event.extendedProps.notes || '无'}</p>
            <div class="original-input-container">
                <button id="toggleOriginalInput" class="toggle-btn">显示原文</button>
                <div id="originalInputText" class="original-input-text" style="display: none;">
                    <p>${event.extendedProps.originalInput || '无'}</p>
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

    // 添加输入样式模板功能
    window.setInput = function(sample) {
        userInput.value = sample;
    }

    // 文件末尾添加以下函数
    function showCustomPrompt(title, message, callback, defaultValue = '') {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        modalTitle.textContent = title;
        modalBody.innerHTML = `
            <p>${message}</p>
            <input type="text" id="customPromptInput" value="${defaultValue}">
        `;

        modal.style.display = 'block';

        confirmBtn.onclick = function() {
            const input = document.getElementById('customPromptInput').value;
            modal.style.display = 'none';
            callback(input);
        };

        cancelBtn.onclick = function() {
            modal.style.display = 'none';
            callback(null);
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                callback(null);
            }
        };
    }

    // 确保 aiAssistant.js 中的函数可用
    if (typeof window.processUserInput === 'undefined') {
        console.error('AI 助能未正确加载。请确保 aiAssistant.js 文件已确引入并且有语法错误。');
    } else {
        console.log('AI 助手功能已正确加载。');
    }

    const addCourseScheduleBtn = document.getElementById('addCourseScheduleBtn');
    const uploadModal = document.getElementById('uploadModal');
    const xlsFileInput = document.getElementById('xlsFileInput');
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    const cancelUploadBtn = document.getElementById('cancelUploadBtn');

    addCourseScheduleBtn.addEventListener('click', () => {
        uploadModal.style.display = 'block';
    });

    cancelUploadBtn.addEventListener('click', () => {
        uploadModal.style.display = 'none';
    });

    uploadFileBtn.addEventListener('click', async () => {
        const file = xlsFileInput.files[0];
        if (file) {
            try {
                const jsonData = await parseXLSFile(file);
                const courses = extractCourses(jsonData);
                const calendarEvents = convertToCalendarEvents(courses);
                
                // 显示解析结果
                const resultText = JSON.stringify(calendarEvents, null, 2);
                showCustomPrompt('解析结果', `<pre>${resultText}</pre>`, () => {
                    uploadModal.style.display = 'none';
                });
            } catch (error) {
                console.error('文件解析错误:', error);
                alert('文件解析失败，请确保文件格式正确。');
            }
        } else {
            alert('请选择一个文件');
        }
    });

    window.onclick = function(event) {
        if (event.target == uploadModal) {
            uploadModal.style.display = 'none';
        }
    };

    // 为了调试，添加一个控制台日志
    console.log('script.js 已加载');

    // 在文件末尾添加以下函数

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
        // 假设第一行是表头，从第二行开始解析
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length >= 5) { // 确保行有足够的列
                courses.push({
                    name: row[0],
                    day: row[1],
                    startTime: row[2],
                    endTime: row[3],
                    location: row[4]
                });
            }
        }
        return courses;
    }

    function convertToCalendarEvents(courses) {
        const daysOfWeek = ['周日', '周���', '周二', '周三', '周四', '周五', '周六'];
        return courses.map(course => {
            const dayIndex = daysOfWeek.indexOf(course.day);
            const today = new Date();
            const courseDate = new Date(today.setDate(today.getDate() - today.getDay() + dayIndex));
            
            return {
                title: course.name,
                start: `${courseDate.toISOString().split('T')[0]}T${course.startTime}:00`,
                end: `${courseDate.toISOString().split('T')[0]}T${course.endTime}:00`,
                location: course.location,
                rrule: {
                    freq: 'weekly',
                    interval: 1,
                    byweekday: [dayIndex]
                }
            };
        });
    }

    // 修改showCustomPrompt函数以支持HTML内容
    function showCustomPrompt(title, message, callback, defaultValue = '') {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        modalTitle.textContent = title;
        modalBody.innerHTML = message;

        modal.style.display = 'block';

        confirmBtn.onclick = function() {
            modal.style.display = 'none';
            callback(null);
        };

        cancelBtn.style.display = 'none';

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                callback(null);
            }
        };
    }

    // 添加解决时间冲突的函数
    function resolveTimeConflicts(taskInfo) {
        const relativeDate = parseRelativeDate(taskInfo.originalInput);
        const absoluteDate = parseAbsoluteDate(taskInfo.originalInput);

        if (relativeDate && absoluteDate) {
            if (Math.abs(relativeDate - absoluteDate) > 24 * 60 * 60 * 1000) { // 如果差异超过一天
                taskInfo.timeConflict = {
                    relativeDate: relativeDate,
                    absoluteDate: absoluteDate
                };
            } else {
                taskInfo.start = new Date(absoluteDate);
            }
        } else if (relativeDate) {
            taskInfo.start = new Date(relativeDate);
        } else if (absoluteDate) {
            taskInfo.start = new Date(absoluteDate);
        }

        return taskInfo;
    }

    // 解析对日期
    function parseRelativeDate(input) {
        const today = new Date(notificationDate);
        if (input.includes('明天')) {
            return new Date(today.setDate(today.getDate() + 1));
        } else if (input.includes('后天')) {
            return new Date(today.setDate(today.getDate() + 2));
        } else if (input.includes('下周')) {
            return new Date(today.setDate(today.getDate() + 7));
        }
        // 添加更多相对期解析逻辑...
        return null;
    }

    // 解析绝对日期
    function parseAbsoluteDate(input) {
        const dateMatch = input.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (dateMatch) {
            return new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
        }
        // 添加更多绝对日期解析逻辑...
        return null;
    }
});
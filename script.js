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
                const taskInfo = parseAIResponse(aiResponse);
                taskInfo.originalInput = input; // 添加原始输入到taskInfo
                if (taskInfo.title && taskInfo.start) {
                    showConfirmDialog(taskInfo);
                } else {
                    updateChat('无法从AI回复中提取完整的任务信息，请尝试更明确的表述。');
                }
            } catch (error) {
                console.error('处理输入时出错:', error);
                updateChat(`处理输入出错: ${error.message}`);
            }
            userInput.value = '';
        }
    }

    // 修改 parseAIResponse 函数
    function parseAIResponse(aiResponse) {
        const lines = aiResponse.split('\n');
        let taskInfo = {
            title: '',
            start: null,
            end: null,
            allDay: false,
            recurrence: null,
            notes: '' // 新增字段用于存储备注信息
        };

        lines.forEach(line => {
            if (line.startsWith('1. 待办事项：')) {
                taskInfo.title = line.substring('1. 待办事项：'.length).trim();
            } else if (line.startsWith('2. 开始时间：')) {
                const startTimeStr = line.substring('2. 开始时间：'.length).trim();
                taskInfo.start = new Date(startTimeStr);
            } else if (line.startsWith('3. 预计时长：')) {
                const durationStr = line.substring('3. 预计时长：'.length).trim();
                const durationMatch = durationStr.match(/(\d+)\s*(小时|分钟)/);
                if (durationMatch && taskInfo.start) {
                    const amount = parseInt(durationMatch[1]);
                    const unit = durationMatch[2];
                    const durationInMinutes = unit === '小时' ? amount * 60 : amount;
                    taskInfo.end = new Date(taskInfo.start.getTime() + durationInMinutes * 60000);
                }
            } else if (line.startsWith('4. 重复频率：')) {
                taskInfo.recurrence = line.substring('4. 重复频率：'.length).trim();
            } else if (line.startsWith('5. 备注：')) {
                taskInfo.notes = line.substring('5. 备注：'.length).trim();
            }
        });

        return taskInfo;
    }

    // 删除或注释掉 parseInput 函数，因为我们现在直接使用AI的响应

    function showConfirmDialog(taskInfo) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        modalTitle.textContent = '确认添加任务';
        modalBody.innerHTML = `
            <p><strong>标题:</strong> ${taskInfo.title}</p>
            <p><strong>开始时间:</strong> ${taskInfo.start ? taskInfo.start.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未指定'}</p>
            <p><strong>结束时间:</strong> ${taskInfo.end ? taskInfo.end.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未指定'}</p>
            <p><strong>重复频率:</strong> ${taskInfo.recurrence || '不重复'}</p>
            <p><strong>备注:</strong> ${taskInfo.notes || '无'}</p>
        `;

        modal.style.display = 'block';

        confirmBtn.onclick = function() {
            const existingEvents = calendar.getEvents();
            const conflict = existingEvents.some(event => 
                (taskInfo.start < event.end && taskInfo.end > event.start)
            );

            if (conflict) {
                if (confirm('检测到时间冲突。是否仍要添加此任务？')) {
                    addEventToCalendar(taskInfo);
                }
            } else {
                addEventToCalendar(taskInfo);
            }
            modal.style.display = 'none';
        };

        cancelBtn.onclick = function() {
            updateChat('已取消添加任务');
            modal.style.display = 'none';
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };
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
                originalInput: taskInfo.originalInput // 添加原始输入
            }
        };

        // 根据重复频率设置事件的重复规则
        if (taskInfo.recurrence && taskInfo.recurrence !== '不重复') {
            switch (taskInfo.recurrence) {
                case '每天':
                    eventData.rrule = {
                        freq: 'daily',
                        interval: 1
                    };
                    break;
                case '每周':
                    eventData.rrule = {
                        freq: 'weekly',
                        interval: 1
                    };
                    break;
                case '每月':
                    eventData.rrule = {
                        freq: 'monthly',
                        interval: 1
                    };
                    break;
                case '每年':
                    eventData.rrule = {
                        freq: 'yearly',
                        interval: 1
                    };
                    break;
                // 可根据需要添加更多的复规则
            }
        }

        calendar.addEvent(eventData);
        updateChat(`已添加任务：${taskInfo.title}${taskInfo.recurrence !== '不重复' ? `（${taskInfo.recurrence}）` : ''}`);
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
            <input type="text" id="newEventTitle" placeholder="请输入新事件的标题">
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

    // 添加新的函数来解析中文日期时间字符串
    function parseChineseDateTime(dateTimeStr) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const date = now.getDate();

        // 解析相对日期
        if (dateTimeStr.includes('今天')) {
            // 使用当前日期
        } else if (dateTimeStr.includes('明天')) {
            now.setDate(date + 1);
        } else if (dateTimeStr.includes('后天')) {
            now.setDate(date + 2);
        } else if (dateTimeStr.includes('下周')) {
            now.setDate(date + 7);
        } else {
            // 尝试解析具体日期，如果失败则使用当前日期
            const dateMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})��(\d{1,2})日/);
            if (dateMatch) {
                now.setFullYear(parseInt(dateMatch[1]));
                now.setMonth(parseInt(dateMatch[2]) - 1);
                now.setDate(parseInt(dateMatch[3]));
            }
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

            now.setHours(hours, minutes, 0, 0);
        } else {
            // 如果没有指定时间，默认设置为当天的上午9点
            now.setHours(9, 0, 0, 0);
        }

        return now;
    }

    // 确保 aiAssistant.js 中的函数可用
    if (typeof window.processUserInput === 'undefined') {
        console.error('AI 助能未正确加载。请确保 aiAssistant.js 文件已正确引入并且没有语法错误。');
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
        const daysOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
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
});
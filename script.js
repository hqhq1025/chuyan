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
            recurrence: null // 新增字段用于存储重复频率
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

    function addEventToCalendar(taskInfo) {
        const eventData = {
            title: taskInfo.title,
            start: taskInfo.start,
            end: taskInfo.end,
            allDay: taskInfo.allDay
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
                // 可以根据需要添加更多的重复规则
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
        `;

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
            const dateMatch = dateTimeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
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
        console.error('AI 助手功能未正确加载。请确保 aiAssistant.js 文件已正确引入并且没有语法错误。');
    } else {
        console.log('AI 助手功能已正确加载。');
    }
});

// 为了调试，添加一个控制台日志
console.log('script.js 已加载');
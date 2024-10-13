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

    // 在文件开头添加一个新的函数来解析AI的响应
    function parseAIResponse(aiResponse) {
        const lines = aiResponse.split('\n');
        let taskInfo = {
            title: '',
            start: null,
            end: null,
            allDay: false
        };

        lines.forEach(line => {
            if (line.startsWith('1. 待办事项：')) {
                taskInfo.title = line.substring('1. 待办事项：'.length).trim();
            } else if (line.startsWith('2. 开始时间：')) {
                const startTimeStr = line.substring('2. 开始时间：'.length).trim();
                taskInfo.start = parseChineseDateTime(startTimeStr);
            } else if (line.startsWith('3. 预计时长：')) {
                const durationStr = line.substring('3. 预计时长：'.length).trim();
                const durationMatch = durationStr.match(/(\d+)\s*(小时|分钟)/);
                if (durationMatch && taskInfo.start) {
                    const amount = parseInt(durationMatch[1]);
                    const unit = durationMatch[2];
                    const durationInMinutes = unit === '小时' ? amount * 60 : amount;
                    taskInfo.end = new Date(taskInfo.start.getTime() + durationInMinutes * 60000);
                }
            }
        });

        return taskInfo;
    }

    function processInput() {
        const input = userInput.value.trim();
        if (input) {
            updateChat(`用户输入: ${input}`);
            processUserInput(input)
                .then(aiResponse => {
                    console.log('AI处理结果:', aiResponse);
                    updateChat(`AI回复: ${aiResponse}`);
                    const taskInfo = parseAIResponse(aiResponse);
                    if (taskInfo.title && taskInfo.start) {
                        showConfirmDialog(taskInfo);
                    } else {
                        updateChat('无法从AI回复中提取完整的任务信息，请尝试更明确的表述。');
                    }
                })
                .catch(error => {
                    console.error('Error processing input with AI:', error);
                    updateChat(`AI 处理输入时发生错误: ${error.message}`);
                });
            userInput.value = '';
        }
    }

    function parseInput(input, callback) {
        const dateTimeRegex = /(今天|明天|后天|下周[一二三四五六日]|本周[一二三四五六日]|\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日)?\s*(上午|下午|晚上)?\s*(\d{1,2}([点:：]\d{0,2})?)(.*)/;
        const durationRegex = /(?:时长|持续)?\s?(\d+)\s?(小时|分钟)/;

        const match = input.match(dateTimeRegex);
        if (!match) {
            callback(null);
            return;
        }

        const [, dateStr, periodOfDay, timeStr, , title] = match;
        const durationMatch = input.match(durationRegex);

        let date = parseDate(dateStr);
        let time = parseTime(timeStr, periodOfDay);
        let duration = durationMatch ? parseDuration(durationMatch[1], durationMatch[2]) : 60; // 默认1小时

        if (!date && !time) {
            showCustomPrompt('未指定日期和时间', '是否使用当前时间？', (result) => {
                if (result === 'yes') {
                    const now = new Date();
                    date = now;
                    time = now;
                    continueProcessing();
                } else {
                    callback(null);
                }
            });
            return;
        }

        if (!date) {
            date = new Date(); // 如果没有指定日期，使用今天
        }

        if (!time) {
            showCustomPrompt('未指定时间', '请输入时间（如 14:00）：', (result) => {
                if (result) {
                    time = parseTime(result);
                    if (time) {
                        continueProcessing();
                    } else {
                        callback(null);
                    }
                } else {
                    callback(null);
                }
            }, '09:00');
            return;
        }

        continueProcessing();

        function continueProcessing() {
            const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
            const end = new Date(start.getTime() + duration * 60000);

            callback({
                title: title.trim(),
                start: start,
                end: end,
                allDay: false
            });
        }
    }

    function parseDate(dateStr) {
        if (!dateStr) return null;

        const now = new Date();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

        if (dateStr === '今天') return now;
        if (dateStr === '明天') {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            return tomorrow;
        }
        if (dateStr === '后天') {
            const dayAfterTomorrow = new Date(now);
            dayAfterTomorrow.setDate(now.getDate() + 2);
            return dayAfterTomorrow;
        }

        if (dateStr.includes('周') || dateStr.includes('星期')) {
            const dayIndex = weekdays.indexOf(dateStr.charAt(dateStr.length - 1));
            const isNextWeek = dateStr.includes('下');
            const targetDate = new Date(now);
            const currentDay = now.getDay();
            let daysToAdd;

            if (isNextWeek) {
                daysToAdd = dayIndex + 7 - currentDay;
                if (daysToAdd > 7) daysToAdd -= 7;
            } else { // 本周
                daysToAdd = (dayIndex + 7 - currentDay) % 7;
            }

            targetDate.setDate(now.getDate() + daysToAdd);
            return targetDate;
        }

        const dateMatch = dateStr.match(/(\d{4}年)?(\d{1,2})月(\d{1,2})日?/);
        if (dateMatch) {
            const [, yearStr, month, day] = dateMatch;
            const year = yearStr ? parseInt(yearStr) : now.getFullYear();
            return new Date(year, parseInt(month) - 1, parseInt(day));
        }

        return null; // 如果无法解析，返回null
    }

    function parseTime(timeStr, periodOfDay) {
        if (!timeStr) return null;

        let [hours, minutes] = timeStr.split(/[点:：]/).map(num => parseInt(num));
        minutes = minutes || 0;

        // 扩展时间段识别
        const morningPeriods = ['早上', '早晨', '上午', '凌晨'];
        const afternoonPeriods = ['下午', '午后', '晚上', '傍晚', '夜晚'];

        // 如果使用24小时制，则直接使用
        if (hours >= 0 && hours <= 23) {
            // 对于凌晨的特殊处理
            if (hours >= 0 && hours <= 5 && !morningPeriods.includes(periodOfDay)) {
                hours += 12;
            }
        } else if (afternoonPeriods.includes(periodOfDay) || (hours <= 12 && periodOfDay === '中午')) {
            hours = hours % 12 + 12;
        } else if ((morningPeriods.includes(periodOfDay) || !periodOfDay) && hours === 12) {
            hours = 0;
        }

        return new Date(0, 0, 0, hours, minutes);
    }

    function parseDuration(amount, unit) {
        amount = parseInt(amount);
        return unit === '小时' ? amount * 60 : amount;
    }

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
        calendar.addEvent({
            title: taskInfo.title,
            start: taskInfo.start,
            end: taskInfo.end,
            allDay: taskInfo.allDay
        });
        updateChat(`已添加任务：${taskInfo.title}`);
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
    if (typeof processUserInput === 'undefined') {
        console.error('AI 助手功能未正确加载。请确保 aiAssistant.js 文件已正确引入。');
    }
});
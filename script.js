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

    function processInput() {
        const input = userInput.value.trim();
        if (input) {
            updateChat(`用���输入: ${input}`); // 显示用户输入
            // 使用 AI 助手处理输入
            processUserInput(input)
                .then(aiResponse => {
                    console.log('AI处理结果:', aiResponse); // 添加日志
                    updateChat(`AI回复: ${aiResponse}`);
                    // 尝试从AI回复中提取任务信息
                    parseInput(aiResponse, (taskInfo) => {
                        if (taskInfo) {
                            showConfirmDialog(taskInfo);
                        } else {
                            updateChat('无法从AI回复中提取任务信息，请尝试更明确的表述。');
                        }
                    });
                })
                .catch(error => {
                    console.error('Error processing input with AI:', error);
                    updateChat(`AI 处理输入时发生错误: ${error.message}`);
                    // 使用默认解析方法作为备选
                    parseInput(input, (defaultTaskInfo) => {
                        if (defaultTaskInfo) {
                            showConfirmDialog(defaultTaskInfo);
                        } else {
                            updateChat('无法识别任务信息，请使用更明确的格式，例如："明天下午3点开会，时长2小时"');
                        }
                    });
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
            <p><strong>开始时间:</strong> ${taskInfo.start.toLocaleString()}</p>
            <p><strong>结束时间:</strong> ${taskInfo.end.toLocaleString()}</p>
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
        calendar.addEvent(taskInfo);
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

    // 确保 aiAssistant.js 中的函数可用
    if (typeof processUserInput === 'undefined') {
        console.error('AI 助手功能未正确加载。请确保 aiAssistant.js 文件已正确引入。');
    }
});
<<<<<<< HEAD
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
            parseInput(input, (taskInfo) => {
                if (taskInfo) {
                    showConfirmDialog(taskInfo);
                } else {
                    updateChat('无法识别任务信息，请使用更明确的格式，例如："明天下午3点开会，时长2小时"');
                }
            });
=======
function initApp() {
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const scheduleList = document.getElementById('scheduleList');
    const chatBox = document.getElementById('chatBox');

    const APPID = '7f74c9fd';
    const APISecret = 'YmMxMmYzMmQ3NzYzNjc4ZDJiNjA3ZTc1';
    const APIKey = 'ae73f23b9eaa1c164fa2b52d923c5fc1';

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    async function handleUserInput() {
        const userText = userInput.value.trim();
        if (userText) {
            updateChat(`用户: ${userText}`);
            try {
                const response = await callSparkAPI(userText);
                const taskInfo = parseResponse(response);
                if (taskInfo) {
                    updateSchedule(taskInfo);
                    updateChat(`助手: 已添加任务：${taskInfo.task}，时间：${taskInfo.startTime} - ${taskInfo.endTime}`);
                } else {
                    updateChat(`助手: ${response}`);
                }
            } catch (error) {
                updateChat(`错误: ${error.message}`);
            }
>>>>>>> d991d7ad70d7df0f3f0df540ed1271143e549023
            userInput.value = '';
        }
    }

<<<<<<< HEAD
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
=======
    async function callSparkAPI(text) {
        return new Promise((resolve, reject) => {
            const url = 'wss://spark-api.xf-yun.com/v3.5/chat';
            const host = 'spark-api.xf-yun.com';
            const path = '/v3.5/chat';
            const date = new Date().toUTCString();
            const authorization = generateAuthorization(host, date, path);

            const wsUrl = `${url}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;

            const ws = new WebSocket(wsUrl);

            let response = "";

            ws.onopen = () => {
                console.log('WebSocket connected');
                const data = {
                    header: {
                        app_id: APPID
                    },
                    parameter: {
                        chat: {
                            domain: "generalv3.5",
                            temperature: 0.5,
                            max_tokens: 1024
                        }
                    },
                    payload: {
                        message: {
                            text: [
                                { role: "system", content: "你是一个日程助手。请解析用户输入的日程信息，包括任务内容、开始时间和结束时间。请以JSON格式回复，包含task（任务内容）、startTime（开始时间）和endTime（结束时间）字段。" },
                                { role: "user", content: text }
                            ]
                        }
                    }
                };
                ws.send(JSON.stringify(data));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received:', data);
                if (data.header.code !== 0) {
                    reject(new Error(`API error: ${data.header.message}`));
                } else if (data.header.status === 2) {
                    response += data.payload.choices.text[0].content;
                    resolve(response);
                    ws.close();
                } else {
                    response += data.payload.choices.text[0].content;
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            ws.onclose = () => {
                console.log('WebSocket closed');
            };
        });
    }

    function generateAuthorization(host, date, path) {
        const tmp = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
        const hmac = CryptoJS.HmacSHA256(tmp, APISecret);
        const signature = CryptoJS.enc.Base64.stringify(hmac);
        const authorizationOrigin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin));
    }

    function parseResponse(response) {
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Failed to parse response:', error);
            return null;
        }
    }

    function updateSchedule(taskInfo) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task';
        taskElement.style.position = 'relative';
        
        const startTime = new Date(taskInfo.startTime);
        const endTime = new Date(taskInfo.endTime);
        const duration = (endTime - startTime) / (1000 * 60); // 持续时间（分钟）
        
        const top = (startTime.getHours() * 60 + startTime.getMinutes()) / 1440 * 100; // 24小时制下的百分比位置
        const height = duration / 1440 * 100; // 持续时间的百分比高度

        taskElement.style.top = `${top}%`;
        taskElement.style.height = `${height}%`;
        taskElement.innerHTML = `
            <p><strong>${taskInfo.startTime} - ${taskInfo.endTime}</strong></p>
            <p>${taskInfo.task}</p>
        `;
        scheduleList.appendChild(taskElement);
>>>>>>> d991d7ad70d7df0f3f0df540ed1271143e549023
    }

    function updateChat(message) {
        const chatMessage = document.createElement('p');
        chatMessage.textContent = message;
        chatBox.appendChild(chatMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
<<<<<<< HEAD

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
});
=======
}

// 检查 CryptoJS 是否已加载
function checkCryptoJS() {
    if (typeof CryptoJS !== 'undefined') {
        initApp();
    } else {
        setTimeout(checkCryptoJS, 50);
    }
}

document.addEventListener('DOMContentLoaded', checkCryptoJS);
>>>>>>> d991d7ad70d7df0f3f0df540ed1271143e549023

function initApp() {
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const scheduleList = document.getElementById('scheduleList');
    const chatBox = document.getElementById('chatBox');

    const APPID = '7f74c9fd';
    const APISecret = 'YmMxMmYzMmQ3NzYzNjc4ZDJiNjA3ZTc1';
    const APIKey = 'ae73f23b9eaa1c164fa2b52d923c5fc1';

    const dayViewBtn = document.getElementById('dayView');
    const weekViewBtn = document.getElementById('weekView');
    const monthViewBtn = document.getElementById('monthView');
    const prevDateBtn = document.getElementById('prevDate');
    const nextDateBtn = document.getElementById('nextDate');
    const currentDateSpan = document.getElementById('currentDate');

    let currentView = 'day';
    let currentDate = new Date();

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    dayViewBtn.addEventListener('click', () => changeView('day'));
    weekViewBtn.addEventListener('click', () => changeView('week'));
    monthViewBtn.addEventListener('click', () => changeView('month'));
    prevDateBtn.addEventListener('click', () => navigateDate(-1));
    nextDateBtn.addEventListener('click', () => navigateDate(1));

    // 添加示例点击事件处理
    const exampleLinks = document.querySelectorAll('.example-link');
    exampleLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            userInput.value = link.textContent;
            userInput.focus();
        });
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
            userInput.value = '';
        }
    }

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
                const currentDate = new Date();
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
                                { role: "system", content: `你是一个智能日程助手。请解析用户输入的日程信息，包括���务内容、开始时间、结束时间和重复频率。请以JSON格式回复，包含以下字段：
                                - task（任务内容）
                                - startTime（开始时间，使用ISO 8601格式）
                                - endTime（结束时间，使用ISO 8601格式）
                                - frequency（重复频率，可能的值包括：'once'（一次性）, 'daily'（每天）, 'weekly'（每周）, 'monthly'（每月）, 'yearly'（每年），如果用户没有指定频率，默认为'once'）
                                
                                当前日期是 ${new Date().toISOString().split('T')[0]}。请注意以下几点：
                                1. 理解并正确解析相对时间词，如"今天"、"明天"、"后天"、"下周"等。
                                2. 如果用户没有明确指定日期，默认为今天或最近的未来日期。
                                3. 如果用户没有明确指定结束时间，默认持续1小时。
                                4. 正确解析重复频率，如"每天"、"每周"、"每月1号"等。
                                5. 尽可能理解用户的意图，即使表达不够精确也要尝试解析。` },
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
        
        const startTime = new Date(taskInfo.startTime);
        const endTime = new Date(taskInfo.endTime);
        
        let frequencyText = '';
        switch (taskInfo.frequency) {
            case 'daily':
                frequencyText = '(每天)';
                break;
            case 'weekly':
                frequencyText = '(每周)';
                break;
            case 'monthly':
                frequencyText = '(每月)';
                break;
            case 'yearly':
                frequencyText = '(每年)';
                break;
        }
        
        taskElement.innerHTML = `
            <p><strong>${formatTime(startTime)} - ${formatTime(endTime)} ${frequencyText}</strong></p>
            <p>${taskInfo.task}</p>
        `;
        
        // 根据当前视图将任务添加到正确的位置
        switch (currentView) {
            case 'day':
                if (isSameDay(startTime, currentDate)) {
                    scheduleList.appendChild(taskElement);
                }
                break;
            case 'week':
                if (isInCurrentWeek(startTime)) {
                    const dayColumn = scheduleList.children[startTime.getDay()];
                    if (dayColumn) {
                        dayColumn.appendChild(taskElement);
                    }
                }
                break;
            case 'month':
                if (startTime.getMonth() === currentDate.getMonth()) {
                    const dayElement = Array.from(scheduleList.children).find(el => 
                        el.classList.contains('day') && 
                        !el.classList.contains('other-month') && 
                        el.querySelector('.day-header').textContent === startTime.getDate().toString()
                    );
                    if (dayElement) {
                        dayElement.appendChild(taskElement);
                    }
                }
                break;
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    function updateChat(message) {
        const chatMessage = document.createElement('p');
        chatMessage.textContent = message;
        chatBox.appendChild(chatMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function changeView(view) {
        currentView = view;
        setActiveView(view);
        updateView();
    }

    function navigateDate(direction) {
        switch (currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() + direction);
                break;
            case 'week':
                currentDate.setDate(currentDate.getDate() + direction * 7);
                break;
            case 'month':
                currentDate.setMonth(currentDate.getMonth() + direction);
                break;
        }
        updateView();
    }

    function updateView() {
        scheduleList.innerHTML = '';
        switch (currentView) {
            case 'day':
                renderDayView();
                break;
            case 'week':
                renderWeekView();
                break;
            case 'month':
                renderMonthView();
                break;
        }
        updateCurrentDateDisplay();
    }

    function renderDayView() {
        scheduleList.className = 'schedule-list day-view';
        
        // 添加全天任务区域
        const allDayTasks = document.createElement('div');
        allDayTasks.className = 'all-day-tasks';
        allDayTasks.innerHTML = '<div class="all-day-label">全天</div>';
        scheduleList.appendChild(allDayTasks);

        for (let i = 0; i < 24; i++) {
            const hourDiv = document.createElement('div');
            hourDiv.className = 'hour';
            hourDiv.innerHTML = `<span class="hour-label">${i.toString().padStart(2, '0')}:00</span>`;
            scheduleList.appendChild(hourDiv);
        }
    }

    function renderWeekView() {
        scheduleList.className = 'schedule-list week-view';
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        for (let i = 0; i < 7; i++) {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            dayColumn.innerHTML = `
                <div class="day-header">${dayDate.toLocaleDateString('zh-CN', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>
            `;
            for (let j = 0; j < 24; j++) {
                const hourDiv = document.createElement('div');
                hourDiv.className = 'hour';
                dayColumn.appendChild(hourDiv);
            }
            scheduleList.appendChild(dayColumn);
        }
    }

    function renderMonthView() {
        scheduleList.className = 'schedule-list month-view';
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const today = new Date();

        for (let i = 0; i < 42; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day';
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + i);
            
            if (dayDate.getMonth() !== currentDate.getMonth()) {
                dayDiv.classList.add('other-month');
            }
            
            if (dayDate.toDateString() === today.toDateString()) {
                dayDiv.classList.add('today');
            }
            
            if (dayDate.toDateString() === currentDate.toDateString()) {
                dayDiv.classList.add('current-day');
            }
            
            dayDiv.innerHTML = `
                <div class="day-header">${dayDate.getDate()}</div>
            `;
            scheduleList.appendChild(dayDiv);
        }
    }

    function updateCurrentDateDisplay() {
        let dateString;
        switch (currentView) {
            case 'day':
                dateString = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
                break;
            case 'week':
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                dateString = `${weekStart.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`;
                break;
            case 'month':
                dateString = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
                break;
        }
        currentDateSpan.textContent = dateString;
    }

    // 添加当前视图的激活状态
    function setActiveView(view) {
        dayViewBtn.classList.toggle('active', view === 'day');
        weekViewBtn.classList.toggle('active', view === 'week');
        monthViewBtn.classList.toggle('active', view === 'month');
    }

    // 初始化视图
    setActiveView('day');
    updateView();

    // 添加辅助函数来检查日期是否在当前周
    function isInCurrentWeek(date) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return date >= weekStart && date <= weekEnd;
    }

    // 添加辅助函数来检查两个日期是否是同一天
    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // 在 initApp 函数中添加以下代码
    const jsonInput = document.getElementById('jsonInput');
    const addJsonScheduleBtn = document.getElementById('addJsonSchedule');

    addJsonScheduleBtn.addEventListener('click', handleJsonInput);

    function handleJsonInput() {
        const jsonText = jsonInput.value.trim();
        if (jsonText) {
            try {
                const taskInfo = JSON.parse(jsonText);
                if (isValidTaskInfo(taskInfo)) {
                    showConfirmDialog(taskInfo);
                } else {
                    alert('无效的日程信息。请检查您的输入。');
                }
            } catch (error) {
                alert('无效的 JSON 格式。请检查您的输入。');
            }
            jsonInput.value = '';
        }
    }

    function isValidTaskInfo(taskInfo) {
        return (
            taskInfo.task &&
            taskInfo.startTime &&
            taskInfo.endTime &&
            taskInfo.frequency &&
            ['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(taskInfo.frequency)
        );
    }

    function showConfirmDialog(taskInfo) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        const startTime = new Date(taskInfo.startTime);
        const endTime = new Date(taskInfo.endTime);

        dialog.innerHTML = `
            <h3>确认添加任务</h3>
            <p><strong>任务:</strong> ${taskInfo.task}</p>
            <p><strong>开始时间:</strong> ${formatDateTime(startTime)}</p>
            <p><strong>结束时间:</strong> ${formatDateTime(endTime)}</p>
            <p><strong>重复:</strong> ${getFrequencyText(taskInfo.frequency)}</p>
            <div class="dialog-buttons">
                <button id="confirmTask">确认</button>
                <button id="cancelTask">取消</button>
            </div>
        `;

        document.body.appendChild(dialog);

        document.getElementById('confirmTask').addEventListener('click', () => {
            updateSchedule(taskInfo);
            document.body.removeChild(dialog);
        });

        document.getElementById('cancelTask').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    function formatDateTime(date) {
        return date.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }

    function getFrequencyText(frequency) {
        const frequencyMap = {
            'once': '一次性',
            'daily': '每天',
            'weekly': '每周',
            'monthly': '每月',
            'yearly': '每年'
        };
        return frequencyMap[frequency] || frequency;
    }
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
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

    // 在文件顶部添加一个数组来存储所有的日程
    let allSchedules = [];

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
                                { role: "system", content: `你是一个智能日程助手。请解析用户输入的日程信息，包括任务内容、开始时间、结束时间和重复频率。请直接以JSON格式回复，不要添加任何额外的文本、引号、注释或前缀。你的回复应该可以直接被 JSON.parse() 解析，不需要任何预处理。回复应该包含以下字段：
                                - task（任务内容，字符串类型）
                                - startTime（开始时间，ISO 8601格式的字符串）
                                - endTime（结束时间，ISO 8601格式的字符串）
                                - frequency（重复频率，字符串类型，可能的值包括：'once'（一次性）, 'daily'（每天）, 'weekly'（每周）, 'monthly'（每月）, 'yearly'（每年），如果用户没有指定频率，默认为'once'）
                                
                                当前日期和时间是 ${currentDate.toISOString()}（北京时间 ${currentDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}）。

                                请注意提取以下关键时间信息，并将其转换为结构化的时间数据：

                                1. 时间段表达：
                                   - '早上' -> 6:00 AM - 12:00 PM
                                   - '中午' -> 12:00 PM - 1:00 PM
                                   - '下午' -> 1:00 PM - 6:00 PM
                                   - '晚上' -> 6:00 PM - 12:00 AM
                                   - '凌晨' -> 12:00 AM - 6:00 AM

                                2. 日期相关表达：
                                   - '今天' -> 当前日期
                                   - '明天' -> 当前日期 + 1 天
                                   - '后天' -> 当前日期 + 2 天
                                   - '大后天' -> 当前日期 + 3 天

                                3. 周次相关表达：
                                   - '本周' -> 当前周的日期
                                   - '下周' -> 当前日期 + 7 天
                                   - '下下周' -> 当前日期 + 14 天

                                4. 详细时间表达：
                                   将用户输入的时间点转换为24小时制的具体时间。

                                5. 相对时间表达：
                                   解析'半小时后'，'2小时后'，'5分钟后'，'明天晚上'等相对时间表达，将其转换为具体的时间点。

                                6. 处理模糊时间表达：
                                   识别并处理用户可能输入的模糊时间表达，例如'今天晚上'，'明天下午'等，将其转化为具体的时间段。

                                7. 如果用户未输入时间：
                                   如果用户没有明确指出时间，默认添加到当天，并标记为"全天任务"。

                                请确保所有解析出来的时间信息符合自然语言中的常见表达，并返回统一的格式。

                                其他注意事项：
                                1. 所有时间都应该基于当前的日期和时间进行解析。
                                2. 如果用户没有明确指定结束时间，默认持续1小时。
                                3. 正确解析重复频率，如"每天"、"每周"、"每月1号"等。
                                4. 尽可能理解用户的意图，即使表达不够精确也要尝试解析。
                                5. 确保输出的JSON格式完全正确，不包含任何非JSON内容。
                                6. 不要在JSON外添加任何额外的文本说明或注释。
                                7. 你的回复应该是一个可以直接被JavaScript的JSON.parse()函数解析的字符串。` },
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
            // 尝试直接解析响应
            const parsedData = JSON.parse(response);
            
            // 确保所有必要的字段都存在
            if (!parsedData.task || !parsedData.startTime || !parsedData.endTime || !parsedData.frequency) {
                throw new Error('Missing required fields in the response');
            }
            
            return parsedData;
        } catch (error) {
            console.error('Failed to parse response:', error);
            console.error('Original response:', response);
            
            // 如果直接解析失败，尝试清理响应并重新解析
            try {
                let cleanedResponse = response.replace(/^json/i, '').trim();
                if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
                    cleanedResponse = cleanedResponse.slice(1, -1);
                }
                cleanedResponse = cleanedResponse.replace(/\\"/g, '"');
                
                const parsedData = JSON.parse(cleanedResponse);
                
                if (!parsedData.task || !parsedData.startTime || !parsedData.endTime || !parsedData.frequency) {
                    throw new Error('Missing required fields in the cleaned response');
                }
                
                return parsedData;
            } catch (cleanError) {
                console.error('Failed to parse cleaned response:', cleanError);
                return null;
            }
        }
    }

    function updateSchedule(taskInfo) {
        allSchedules.push(taskInfo); // 将新的日程添加到数组中
        renderSchedules(); // 重新渲染所有日程
    }

    function createScheduleElement(taskInfo) {
        const scheduleElement = document.createElement('div');
        scheduleElement.className = 'schedule-item';
        scheduleElement.style.backgroundColor = getRandomColor();
        
        const startTime = new Date(taskInfo.startTime);
        const endTime = new Date(taskInfo.endTime);
        
        scheduleElement.innerHTML = `
            <div class="schedule-time">${formatTime(startTime)} - ${formatTime(endTime)}</div>
            <div class="schedule-title">${taskInfo.task}</div>
        `;
        
        return scheduleElement;
    }

    function addScheduleToView(scheduleElement, startTime, endTime) {
        switch (currentView) {
            case 'day':
                addScheduleToDay(scheduleElement, startTime, endTime);
                break;
            case 'week':
                addScheduleToWeek(scheduleElement, startTime, endTime);
                break;
            case 'month':
                addScheduleToMonth(scheduleElement, startTime);
                break;
        }
    }

    function addScheduleToDay(scheduleElement, startTime, endTime) {
        if (isSameDay(startTime, currentDate)) {
            const scheduleList = document.querySelector('.schedule-list');
            const dayStart = new Date(currentDate).setHours(0, 0, 0, 0);
            const minutesSinceDayStart = (startTime - dayStart) / (1000 * 60);
            const duration = (endTime - startTime) / (1000 * 60);
            
            scheduleElement.style.top = `${minutesSinceDayStart + 60}px`; // 60px for all-day tasks area
            scheduleElement.style.height = `${duration}px`;
            scheduleElement.style.position = 'absolute';
            scheduleElement.style.left = '60px';
            scheduleElement.style.right = '10px';
            scheduleList.appendChild(scheduleElement);
        }
    }

    function addScheduleToWeek(scheduleElement, startTime, endTime) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        if (startTime >= weekStart && startTime <= weekEnd) {
            const weekView = document.querySelector('.week-view');
            const dayIndex = startTime.getDay();
            const dayColumn = weekView.children[dayIndex];
            
            if (dayColumn) {
                const dayStart = new Date(startTime).setHours(0, 0, 0, 0);
                const minutesSinceDayStart = (startTime - dayStart) / (1000 * 60);
                const duration = (endTime - startTime) / (1000 * 60);
                
                scheduleElement.style.top = `${minutesSinceDayStart + 30}px`; // 30px for day header
                scheduleElement.style.height = `${duration}px`;
                scheduleElement.style.position = 'absolute';
                scheduleElement.style.left = '5px';
                scheduleElement.style.right = '5px';
                dayColumn.appendChild(scheduleElement);
            }
        }
    }

    function addScheduleToMonth(scheduleElement, startTime) {
        if (startTime.getMonth() === currentDate.getMonth() && startTime.getFullYear() === currentDate.getFullYear()) {
            const monthView = document.querySelector('.month-view');
            const dayElement = Array.from(monthView.children).find(el => 
                el.classList.contains('day') && 
                !el.classList.contains('other-month') && 
                parseInt(el.querySelector('.day-header').textContent) === startTime.getDate()
            );
            
            if (dayElement) {
                scheduleElement.style.position = 'relative';
                scheduleElement.style.height = 'auto';
                scheduleElement.style.left = '0';
                scheduleElement.style.right = '0';
                scheduleElement.style.margin = '2px 0';
                dayElement.appendChild(scheduleElement);
            }
        }
    }

    function getRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 80%)`;
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
        renderSchedules(); // 在视图更新后重新渲染所有日程
    }

    function renderDayView() {
        scheduleList.className = 'schedule-list day-view';
        scheduleList.innerHTML = ''; // Clear previous content
        
        // 添加全天任务区域
        const allDayTasks = document.createElement('div');
        allDayTasks.className = 'all-day-tasks';
        allDayTasks.innerHTML = '<div class="all-day-label">全天</div>';
        scheduleList.appendChild(allDayTasks);

        // 添加24小时的时间轴
        for (let i = 0; i < 24; i++) {
            const hourDiv = document.createElement('div');
            hourDiv.className = 'hour';
            hourDiv.innerHTML = `<span class="hour-label">${i.toString().padStart(2, '0')}:00</span>`;
            scheduleList.appendChild(hourDiv);
        }
    }

    function renderWeekView() {
        scheduleList.className = 'schedule-list week-view';
        scheduleList.innerHTML = ''; // Clear previous content

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
            // 添加24小时的时间轴
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

    // 添加新的 renderSchedules 函数
    function renderSchedules() {
        // 清空当前的日程显示
        const scheduleItems = document.querySelectorAll('.schedule-item');
        scheduleItems.forEach(item => item.remove());

        // 重新渲染所有日程
        allSchedules.forEach(taskInfo => {
            const scheduleElement = createScheduleElement(taskInfo);
            addScheduleToView(scheduleElement, new Date(taskInfo.startTime), new Date(taskInfo.endTime));
        });
    }

    // 确保在初始化时调用 renderSchedules
    renderSchedules();
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
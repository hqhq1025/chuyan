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
    }

    function updateChat(message) {
        const chatMessage = document.createElement('p');
        chatMessage.textContent = message;
        chatBox.appendChild(chatMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
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
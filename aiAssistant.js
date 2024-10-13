// 加密的配置信息
const encryptedConfig = {
    APPID: 'N2Y3NGM5ZmQ=',
    APISecret: 'WW1NeE1tWXpNbVEzTnpZek5qYzRaREppTmpBM1pUYzE=',
    APIKey: 'YWU3M2YyM2I5ZWFhMWMxNjRmYTJiNTJkOTIzYzVmYzE='
};

const SPARK_URL = 'wss://spark-api.xf-yun.com/v3.5/chat';

// 解密函数
function decrypt(encrypted) {
    return atob(encrypted);
}

// 获取解密后的配置
function getConfig() {
    return {
        APPID: decrypt(encryptedConfig.APPID),
        APISecret: decrypt(encryptedConfig.APISecret),
        APIKey: decrypt(encryptedConfig.APIKey)
    };
}

// 确保CryptoJS已加载
function ensureCryptoJSLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof CryptoJS !== 'undefined') {
            resolve();
        } else {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        }
    });
}

// 生成鉴权url
async function getWebsocketUrl() {
    await ensureCryptoJSLoaded();
    const config = getConfig();
    const date = new Date().toUTCString();
    const signatureOrigin = `host: spark-api.xf-yun.com\ndate: ${date}\nGET /v3.5/chat HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, config.APISecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${config.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    return `${SPARK_URL}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=spark-api.xf-yun.com`;
}

// 处理用户输入并调用AI
async function processUserInput(userInput) {
    const url = await getWebsocketUrl();
    const currentDate = new Date().toISOString().split('T')[0]; // 获取当前日期
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
            console.log("WebSocket连接已建立");
            const config = getConfig();
            const params = {
                header: {
                    app_id: config.APPID
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
                            { role: "system", content: 
                                `你是一个任务提取助手。当前日期是 ${currentDate}。请从用户输入中提取出以下三个要点：` +
                                "1. 待办事项，" +
                                "2. 开始时间（确保提取出明确的时间信息，如果是模糊的时间，如'今天'、'明天'或'下周'，请将其转换为具体的日期时间格式，格式为 YYYY-MM-DD HH:mm），" +
                                "3. 预计时长（提取时间单位，如小时、分钟，如果用户未提供时长，可以尝试根据上下文推断出合适的时长）。" +
                                "如果你无法提取某个信息，请用'未知'标识。" +
                                "只输出这三个要点，不要有其他内容。" +
                                "示例输出格式：" +
                                "1. 待办事项：开会" +
                                "2. 开始时间：2024-03-15 14:30" +
                                "3. 预计时长：2小时" },
                            { role: "user", content: userInput }
                        ]
                    }
                }
            };
            ws.send(JSON.stringify(params));
        };

        let aiResponse = '';
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("收到消息:", data);
            if (data.header.code !== 0) {
                console.error(`Error: ${data.header.code} - ${data.header.message}`);
                reject(new Error(data.header.message));
                return;
            }
            if (data.payload && data.payload.choices && data.payload.choices.text) {
                aiResponse += data.payload.choices.text[0].content;
            }
            if (data.header.status === 2) {
                console.log("AI响应:", aiResponse);
                resolve(aiResponse);
                ws.close();
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            reject(error);
        };

        ws.onclose = () => {
            console.log("WebSocket连接已关闭");
        };
    });
}

// 确保 processUserInput 函数被暴露给全局作用域
if (typeof window !== 'undefined') {
    window.processUserInput = processUserInput;
}

// 为了调试，添加一个控制台日志
console.log('aiAssistant.js 已加载，processUserInput 函数已定义');

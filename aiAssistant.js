// 配置信息
const APPID = '7f74c9fd';
const APISecret = 'YmMxMmYzMmQ3NzYzNjc4ZDJiNjA3ZTc1';
const APIKey = 'ae73f23b9eaa1c164fa2b52d923c5fc1';
const SPARK_URL = 'wss://spark-api.xf-yun.com/v3.5/chat';

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
    const date = new Date().toUTCString();
    const signatureOrigin = `host: spark-api.xf-yun.com\ndate: ${date}\nGET /v3.5/chat HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, APISecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    return `${SPARK_URL}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=spark-api.xf-yun.com`;
}

// 处理用户输入并调用AI
async function processUserInput(userInput) {
    const url = await getWebsocketUrl();
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
            console.log("WebSocket连接已建立");
            const params = {
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

// 将processUserInput函数暴露给全局作用域
window.processUserInput = processUserInput;

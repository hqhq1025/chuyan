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
    const currentDate = new Date().toISOString().split('T')[0];
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
`你是一个任务提取助手。当前日期是 ${currentDate}。请从用户输入中提取出所有的日程安排和提醒事项，并按以下严格的JSON格式输出：

{
  "日程": [
    {
      "待办事项": "事项描述",
      "开始时间": "YYYY年MM月DD日 HH:mm",
      "预计时长": "X小时Y分钟",
      "重复频率": "不重复/每天/每周/每月/每年",
      "备注": "其他相关信息"
    }
  ],
  "提醒事项": [
    "提醒事项1",
    "提醒事项2"
  ]
}

请遵循以下规则：
1. 始终使用上述JSON格式输出，即使只有一个日程或提醒事项。
2. 日期时间格式必须是"YYYY年MM月DD日 HH:mm"，例如"2024年5月15日 15:30"。请确保使用24小时制表示时间，不要使用"上午"、"下午"等词语。
3. 如果用户没有明确指定年份，请使用当前年份（${new Date().getFullYear()}年），确保理解"今天"、"明天"等词汇时也使用当前年份。
4. 如果用户没有明确指定时间，请默认使用当天的09:00。
5. 对于相对日期（如"明天"、"后天"、"下个月"、"周五"等），请转换为具体的日期。例如：
   - 如果今天是 ${currentDate}，则"今天"应为 "${currentDate}"。
   - "明天"应为 "${new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}"。
   - "后天"应为 "${new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0]}"。
   - "下个月"应转换为下个月的第一天，例如 "${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]}"。
   - 对于"周一"到"周日"，请计算出最近的那个日期。
6. "今天"或"今日"始终指的是 ${currentDate}，时间默认为09:00。例：用户输入"今天开会"，应理解为"${currentDate} 09:00"。
7. 预计时长如果未知，请填写"未知"。
8. 重复频率如果未提及，默认为"不重复"。
9. 备注字段可以包含任何额外信息，如果没有额外信息则填写"无"。
10. 提醒事项应该是一个字符串数组，如果没有提醒事项，则为空数组。

### 示例输入和输出：

1. 输入：今天下午2点开会
   输出：
   {
     "日程": [
       {
         "待办事项": "开会",
         "开始时间": "${currentDate} 14:00",
         "预计时长": "未知",
         "重复频率": "不重复",
         "备注": "无"
       }
     ],
     "提醒事项": []
   }

2. 输入：明天晚上8点参加聚会
   输出：
   {
     "日程": [
       {
         "待办事项": "参加聚会",
         "开始时间": "${new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0].replace(/-/g, '年').replace('年', '年') + '日'} 20:00",
         "预计时长": "未知",
         "重复频率": "不重复",
         "备注": "无"
       }
     ],
     "提醒事项": []
   }

3. 输入：周五晚上9点参加派对
   输出：
   {
     "日程": [
       {
         "待办事项": "参加派对",
         "开始时间": "${getNextDayOfWeek(5).replace(/-/g, '年').replace('年', '年') + '日'} 21:00",
         "预计时长": "未知",
         "重复频率": "不重复",
         "备注": "无"
       }
     ],
     "提醒事项": []
   }

4. 输入：下个月的15号开会，预计2小时
   输出：
   {
     "日程": [
       {
         "待办事项": "开会",
         "开始时间": "${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toISOString().split('T')[0].replace(/-/g, '年').replace('年', '年') + '日'} 09:00",
         "预计时长": "2小时",
         "重复频率": "不重复",
         "备注": "无"
       }
     ],
     "提醒事项": []
   }

5. 输入：每周三健身
   输出：
   {
     "日程": [
       {
         "待办事项": "健身",
         "开始时间": "${getNextDayOfWeek(3).replace(/-/g, '年').replace('年', '年') + '日'} 09:00",
         "预计时长": "未知",
         "重复频率": "每周",
         "备注": "无"
       }
     ],
     "提醒事项": []
   }

6. 输入：提醒我明天带文件
   输出：
   {
     "日程": [],
     "提醒事项": ["带文件"]
   }

请确保始终遵循这个格式，不要添加任何额外的文本或解释。` },
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

// 添加这个辅助函数来计算下一个指定星期几的日期
function getNextDayOfWeek(dayOfWeek) {
    const today = new Date();
    const targetDay = new Date(today);
    targetDay.setDate(today.getDate() + (dayOfWeek + 7 - today.getDay()) % 7);
    return targetDay.toISOString().split('T')[0];
}

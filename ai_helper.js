// ai_helper.js

const APPID = '7f74c9fd';
const APISecret = 'YmMxMmYzMmQ3NzYzNjc4ZDJiNjA3ZTc1';
const APIKey = 'ae73f23b9eaa1c164fa2b52d923c5fc1';

function getWebsocketUrl() {
    const url = 'wss://spark-api.xf-yun.com/v3.1/chat';
    const host = 'spark-api.xf-yun.com';
    const date = new Date().toUTCString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v3.1/chat HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, APISecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);
    const authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    return `${url}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
}

// 确保函数和APPID在全局范围内可用
window.getWebsocketUrl = getWebsocketUrl;
window.APPID = APPID;

// 导出函数和APPID
export { getWebsocketUrl, APPID };
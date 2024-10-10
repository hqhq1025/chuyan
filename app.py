from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from time import mktime
from wsgiref.handlers import format_date_time
import json
import websocket
import _thread as thread
import time
import hmac
import base64
import hashlib
import urllib.parse

app = Flask(__name__)
CORS(app)  # 启用CORS，允许前端页面访问

APPID = "7f74c9fd"
APISecret = "YmMxMmYzMmQ3NzYzNjc4ZDJiNjA3ZTc1"
APIKey = "ae73f23b9eaa1c164fa2b52d923c5fc1"

def generate_url():
    host = "spark-api.xf-yun.com"
    path = "/v3.5/chat"
    url = f"wss://{host}{path}"
    # 生成RFC1123格式的时间戳
    now = datetime.now()
    date = format_date_time(mktime(now.timetuple()))

    # 拼接字符串
    signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"

    # 进行hmac-sha256进行加密
    signature_sha = hmac.new(APISecret.encode('utf-8'), signature_origin.encode('utf-8'),
                             digestmod=hashlib.sha256).digest()

    signature_sha_base64 = base64.b64encode(signature_sha).decode(encoding='utf-8')

    authorization_origin = f'api_key="{APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'

    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')

    # 将请求的鉴权参数组合为字典
    v = {
        "authorization": authorization,
        "date": date,
        "host": host
    }
    # 拼接鉴权参数，生成url
    url = url + '?' + urllib.parse.urlencode(v)
    return url

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json['message']
    
    response = ""
    ws_url = generate_url()

    def on_message(ws, message):
        nonlocal response
        data = json.loads(message)
        code = data['header']['code']
        if code != 0:
            print(f'请求错误: {code}, {data}')
            ws.close()
        else:
            choices = data["payload"]["choices"]
            status = choices["status"]
            content = choices["text"][0]["content"]
            response += content
            if status == 2:
                ws.close()

    def on_error(ws, error):
        print("错误信息:", error)

    def on_close(ws, close_status_code, close_msg):
        print("### 连接关闭 ###")

    def on_open(ws):
        data = {
            "header": {
                "app_id": APPID,
            },
            "parameter": {
                "chat": {
                    "domain": "generalv3.5",
                    "temperature": 0.5,
                    "max_tokens": 1024
                }
            },
            "payload": {
                "message": {
                    "text": [
                        {"role": "user", "content": user_input}
                    ]
                }
            }
        }
        ws.send(json.dumps(data))

    ws = websocket.WebSocketApp(ws_url,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close,
                                on_open=on_open)
    
    ws.run_forever()

    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True)
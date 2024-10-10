document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const scheduleList = document.getElementById('scheduleList');
    const chatBox = document.getElementById('chatBox');

    sendButton.addEventListener('click', addTask);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    function addTask() {
        const taskText = userInput.value.trim();
        if (taskText) {
            const taskInfo = parseTask(taskText);
            if (taskInfo) {
                updateSchedule(taskInfo);
                updateChat(`已添加任务：${taskInfo.task}，时间：${taskInfo.time}`);
            } else {
                updateChat('无法识别任务信息，请使用格式如"今晚8点吃饭"');
            }
            userInput.value = '';
        }
    }

    function parseTask(text) {
        // 这里使用简单的正则表达式来解析任务和时间
        const match = text.match(/(.+)([今明后]天|今晚)(\d+[点时])(.+)/);
        if (match) {
            return {
                task: match[4],
                time: `${match[2]}${match[3]}`
            };
        }
        return null;
    }

    function updateSchedule(taskInfo) {
        const taskElement = document.createElement('div');
        taskElement.innerHTML = `
            <p><strong>${taskInfo.time}</strong>: ${taskInfo.task}</p>
        `;
        scheduleList.appendChild(taskElement);
    }

    function updateChat(message) {
        const chatMessage = document.createElement('p');
        chatMessage.textContent = message;
        chatBox.appendChild(chatMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
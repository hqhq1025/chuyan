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
            const title = prompt('请输入新事件的标题:');
            if (title) {
                calendar.addEvent({
                    title: title,
                    start: info.startStr,
                    end: info.endStr,
                    allDay: info.allDay
                });
            }
            calendar.unselect();
        },
        eventClick: function(info) {
            if (confirm('是否要删除这个事件?')) {
                info.event.remove();
            }
        }
    });
    calendar.render();

    // 保留原有的聊天功能代码
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
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
                calendar.addEvent({
                    title: taskInfo.task,
                    start: taskInfo.time,
                    allDay: false
                });
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
            const now = new Date();
            let taskDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (match[2] === '明天') {
                taskDate.setDate(taskDate.getDate() + 1);
            } else if (match[2] === '后天') {
                taskDate.setDate(taskDate.getDate() + 2);
            }
            taskDate.setHours(parseInt(match[3]), 0, 0);
            return {
                task: match[4],
                time: taskDate.toISOString()
            };
        }
        return null;
    }

    function updateChat(message) {
        const chatMessage = document.createElement('p');
        chatMessage.textContent = message;
        chatBox.appendChild(chatMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
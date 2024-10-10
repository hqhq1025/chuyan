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
            addEventPrompt(info.start, info.end, info.allDay);
        },
        eventClick: function(info) {
            showEventDetails(info.event);
        }
    });
    calendar.render();

    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const chatBox = document.getElementById('chatBox');

    sendButton.addEventListener('click', processInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processInput();
        }
    });

    function processInput() {
        const input = userInput.value.trim();
        if (input) {
            const taskInfo = parseInput(input);
            if (taskInfo) {
                showConfirmDialog(taskInfo);
            } else {
                updateChat('无法识别任务信息，请使用更明确的格式，例如："明天下午3点开会，时长2小时"');
            }
            userInput.value = '';
        }
    }

    function parseInput(input) {
        const dateRegex = /(\d{4}年)?(\d{1,2}月)?(\d{1,2}日)?(\b今天|\b明天|\b后天|\b下周|\b下个月)?/;
        const timeRegex = /(\d{1,2}[:：]\d{2}|\d{1,2}\s?(?:上午|下午|晚上|am|pm))/i;
        const durationRegex = /(?:时长|持续)?\s?(\d+)\s?(小时|分钟)/;

        const dateMatch = input.match(dateRegex);
        const timeMatch = input.match(timeRegex);
        const durationMatch = input.match(durationRegex);

        if (dateMatch || timeMatch) {
            let date = parseDate(dateMatch ? dateMatch[0] : '今天');
            let time = parseTime(timeMatch ? timeMatch[0] : '9:00');
            let duration = durationMatch ? parseDuration(durationMatch[1], durationMatch[2]) : 60; // 默认1小时
            let title = input.replace(dateRegex, '').replace(timeRegex, '').replace(durationRegex, '').trim();

            return {
                title: title,
                start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes()),
                end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes() + duration),
                allDay: false
            };
        }
        return null;
    }

    function parseDate(dateStr) {
        const now = new Date();
        if (dateStr.includes('明天')) {
            now.setDate(now.getDate() + 1);
        } else if (dateStr.includes('后天')) {
            now.setDate(now.getDate() + 2);
        } else if (dateStr.includes('下周')) {
            now.setDate(now.getDate() + 7);
        } else if (dateStr.includes('下个月')) {
            now.setMonth(now.getMonth() + 1);
        } else if (dateStr.includes('年') || dateStr.includes('月') || dateStr.includes('日')) {
            const parts = dateStr.match(/(\d+)/g);
            if (parts && parts.length >= 3) {
                return new Date(parts[0], parts[1] - 1, parts[2]);
            }
        }
        return now;
    }

    function parseTime(timeStr) {
        let [hours, minutes] = timeStr.split(/[:：]/);
        if (timeStr.toLowerCase().includes('pm') || timeStr.includes('下午') || timeStr.includes('晚上')) {
            hours = parseInt(hours) + 12;
        }
        return new Date(0, 0, 0, hours, minutes || 0);
    }

    function parseDuration(amount, unit) {
        return unit === '小时' ? amount * 60 : parseInt(amount);
    }

    function showConfirmDialog(taskInfo) {
        const confirmMessage = `是否添加以下任务到日历？\n标题: ${taskInfo.title}\n开始时间: ${taskInfo.start.toLocaleString()}\n结束时间: ${taskInfo.end.toLocaleString()}`;
        if (confirm(confirmMessage)) {
            calendar.addEvent(taskInfo);
            updateChat(`已添加任务：${taskInfo.title}`);
        } else {
            updateChat('已取消添加任务');
        }
    }

    function updateChat(message) {
        const chatMessage = document.createElement('p');
        chatMessage.textContent = message;
        chatBox.appendChild(chatMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addEventPrompt(start, end, allDay) {
        const title = prompt('请输入新事件的标题:');
        if (title) {
            calendar.addEvent({
                title: title,
                start: start,
                end: end,
                allDay: allDay
            });
        }
        calendar.unselect();
    }

    function showEventDetails(event) {
        const details = `
            标题: ${event.title}
            开始时间: ${event.start.toLocaleString()}
            结束时间: ${event.end ? event.end.toLocaleString() : '未指定'}
        `;
        alert(details);
    }

    // 添加输入样式模板功能
    window.setInput = function(sample) {
        userInput.value = sample;
    }
});
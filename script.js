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
            if (confirm('是否要删除这个事件?')) {
                info.event.remove();
            }
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
        const dateRegex = /(\d{4}-\d{2}-\d{2}|\b(?:今天|明天|后天)\b)/;
        const timeRegex = /(\d{1,2}[:]\d{2}|\d{1,2}\s?(?:上午|下午|晚上|am|pm))/i;
        const durationRegex = /(\d+)\s?(小时|分钟)/;

        const dateMatch = input.match(dateRegex);
        const timeMatch = input.match(timeRegex);
        const durationMatch = input.match(durationRegex);

        if (dateMatch && timeMatch) {
            let date = parseDate(dateMatch[1]);
            let time = parseTime(timeMatch[1]);
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
        if (dateStr === '今天') return new Date();
        if (dateStr === '明天') {
            let tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        }
        if (dateStr === '后天') {
            let dayAfterTomorrow = new Date();
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            return dayAfterTomorrow;
        }
        return new Date(dateStr);
    }

    function parseTime(timeStr) {
        let [hours, minutes] = timeStr.split(':');
        if (timeStr.toLowerCase().includes('pm') && hours < 12) {
            hours = parseInt(hours) + 12;
        } else if (timeStr.includes('下午') || timeStr.includes('晚上')) {
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

    // 添加输入样式模板功能
    window.setInput = function(sample) {
        userInput.value = sample;
    }
});
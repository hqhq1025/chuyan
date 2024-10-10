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
        const dateTimeRegex = /(今天|明天|后天|下周[一二三四五六日]|本周[一二三四五六日]|\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日|\d{1,2}日)?\s*(上午|下午|晚上)?\s*(\d{1,2}[点:：]\d{0,2})?\s*(.*)/;
        const durationRegex = /(?:时长|持续)?\s?(\d+)\s?(小时|分钟)/;

        const match = input.match(dateTimeRegex);
        if (!match) return null;

        const [, dateStr, periodOfDay, timeStr, title] = match;
        const durationMatch = input.match(durationRegex);

        let date = parseDate(dateStr);
        let time = parseTime(timeStr, periodOfDay);
        let duration = durationMatch ? parseDuration(durationMatch[1], durationMatch[2]) : 60; // 默认1小时

        if (!date) {
            if (!confirm('未指定日期，是否使用今天作为默认日期？')) {
                return null;
            }
            date = new Date();
        }

        if (!time) {
            const defaultTime = prompt('未指��时间，请输入时间（如 14:00）：', '09:00');
            if (defaultTime) {
                time = parseTime(defaultTime);
            } else {
                return null;
            }
        }

        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
        const end = new Date(start.getTime() + duration * 60000);

        return {
            title: title.trim(),
            start: start,
            end: end,
            allDay: false
        };
    }

    function parseDate(dateStr) {
        if (!dateStr) return null;

        const now = new Date();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

        if (dateStr === '今天') return now;
        if (dateStr === '明天') return new Date(now.setDate(now.getDate() + 1));
        if (dateStr === '后天') return new Date(now.setDate(now.getDate() + 2));

        if (dateStr.includes('周')) {
            const dayIndex = weekdays.indexOf(dateStr.charAt(dateStr.length - 1));
            const isNextWeek = dateStr.includes('下周');
            const targetDate = new Date(now);
            const currentDay = now.getDay();
            let daysToAdd;

            if (isNextWeek) {
                daysToAdd = (dayIndex + 7 - currentDay) % 7;
                if (daysToAdd === 0) daysToAdd = 7; // 如果计算结果为0，说明是下周的同一天
            } else { // 本周
                daysToAdd = (dayIndex - currentDay + 7) % 7;
            }

            targetDate.setDate(now.getDate() + daysToAdd);
            return targetDate;
        }

        const dateMatch = dateStr.match(/(\d{4}年)?(\d{1,2})月(\d{1,2})日/);
        if (dateMatch) {
            const [, yearStr, month, day] = dateMatch;
            const year = yearStr ? parseInt(yearStr) : now.getFullYear();
            return new Date(year, parseInt(month) - 1, parseInt(day));
        }

        return null;
    }

    function parseTime(timeStr, periodOfDay) {
        if (!timeStr) return null;

        let [hours, minutes] = timeStr.split(/[点:：]/).map(num => parseInt(num));
        minutes = minutes || 0;

        if (periodOfDay === '下午' || periodOfDay === '晚上') {
            hours = hours < 12 ? hours + 12 : hours;
        } else if (periodOfDay === '上午' && hours === 12) {
            hours = 0;
        }

        return new Date(0, 0, 0, hours, minutes);
    }

    function parseDuration(amount, unit) {
        amount = parseInt(amount);
        return unit === '小时' ? amount * 60 : amount;
    }

    function showConfirmDialog(taskInfo) {
        const confirmMessage = `是否添加以下任务到日历？\n标题: ${taskInfo.title}\n开始时间: ${taskInfo.start.toLocaleString()}\n结束时间: ${taskInfo.end.toLocaleString()}`;
        if (confirm(confirmMessage)) {
            calendar.addEvent(taskInfo);
            updateChat(`已添加任务：${taskInfo.title}`);
        } else {
            updateChat('已取消添加任务');
            modal.style.display = 'none';
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };
    }

    function updateChat(message) {
        const chatMessage = document.createElement('p');
        chatMessage.textContent = message;
        chatBox.appendChild(chatMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addEventPrompt(start, end, allDay) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        modalTitle.textContent = '添加新事件';
        modalBody.innerHTML = `
            <input type="text" id="newEventTitle" placeholder="请输入新事件的标题">
        `;

        modal.style.display = 'block';

        confirmBtn.onclick = function() {
            const title = document.getElementById('newEventTitle').value;
            if (title) {
                calendar.addEvent({
                    title: title,
                    start: start,
                    end: end,
                    allDay: allDay
                });
            }
            modal.style.display = 'none';
            calendar.unselect();
        };

        cancelBtn.onclick = function() {
            modal.style.display = 'none';
            calendar.unselect();
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                calendar.unselect();
            }
        };
    }

    function showEventDetails(event) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        modalTitle.textContent = '事件详情';
        modalBody.innerHTML = `
            <p><strong>标题:</strong> ${event.title}</p>
            <p><strong>开始时间:</strong> ${event.start.toLocaleString()}</p>
            <p><strong>结束时间:</strong> ${event.end ? event.end.toLocaleString() : '未指定'}</p>
        `;

        modal.style.display = 'block';

        confirmBtn.style.display = 'none';
        cancelBtn.textContent = '关闭';

        cancelBtn.onclick = function() {
            modal.style.display = 'none';
            confirmBtn.style.display = 'inline-block';
            cancelBtn.textContent = '取消';
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                confirmBtn.style.display = 'inline-block';
                cancelBtn.textContent = '取消';
            }
        };
    }

    // 添加输入样式模板功能
    window.setInput = function(sample) {
        userInput.value = sample;
    }
});
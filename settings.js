document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');
    const backToCalendarBtn = document.getElementById('backToCalendar');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // 这里应该发送登录请求到服务器，现在我们只是模拟一个成功的登录
        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟成功登录
            localStorage.setItem('userLoggedIn', 'true');
            loginMessage.textContent = '登录成功！';
            loginMessage.style.color = 'green';
        } catch (error) {
            loginMessage.textContent = '登录失败，请重试。';
            loginMessage.style.color = 'red';
        }
    });

    backToCalendarBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});

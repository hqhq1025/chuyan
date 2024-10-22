document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');
    const message = document.getElementById('message');
    const backToCalendarBtn = document.getElementById('backToCalendar');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const authForms = document.getElementById('authForms');
    const userInfo = document.getElementById('userInfo');
    const userEmailSpan = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    function showMessage(text, isError = false) {
        message.textContent = text;
        message.style.color = isError ? 'red' : 'green';
    }

    function updateUIForLoggedInUser(email) {
        authForms.style.display = 'none';
        userInfo.style.display = 'block';
        userEmailSpan.textContent = email;
    }

    function updateUIForLoggedOutUser() {
        authForms.style.display = 'block';
        userInfo.style.display = 'none';
    }

    // 检查用户是否已登录
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
        updateUIForLoggedInUser(loggedInUser);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (users[email] && users[email].password === password) {
            localStorage.setItem('loggedInUser', email);
            showMessage('登录成功！');
            updateUIForLoggedInUser(email);
        } else {
            showMessage('邮箱或密码错误', true);
        }
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (password.length < 8) {
            showMessage('密码长度必须至少为8个字符', true);
            return;
        }

        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (users[email]) {
            showMessage('该邮箱已被注册', true);
        } else {
            users[email] = { password };
            localStorage.setItem('users', JSON.stringify(users));
            showMessage('注册成功！请登录');
            document.getElementById('loginEmail').value = email;
            showLoginForm();
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            showMessage('已退出登录');
            updateUIForLoggedOutUser();
        });
    }

    if (backToCalendarBtn) {
        backToCalendarBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterForm();
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }

    function showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }

    function showLoginForm() {
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    }

    // 添加调试信息
    console.log('DOM fully loaded');
    console.log('Login form:', loginForm);
    console.log('Register form:', registerForm);
});

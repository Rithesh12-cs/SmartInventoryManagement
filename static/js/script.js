const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleSelect = document.getElementById('role');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const roleError = document.getElementById('roleError');
const forgotLink = document.getElementById('forgotLink');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
}

function hideError(element) {
    if (!element) return;
    element.textContent = '';
    element.classList.remove('show');
}

function validateEmail(email) {
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
}

function validatePassword(password) {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    return '';
}

function validateRole(role) {
    if (!role) return 'Please select your role';
    return '';
}

if (togglePassword) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        eyeIcon.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

if (emailInput) {
    emailInput.addEventListener('input', function() {
        const error = validateEmail(this.value);
        if (error) showError(emailError, error);
        else hideError(emailError);
    });
}

if (passwordInput) {
    passwordInput.addEventListener('input', function() {
        const error = validatePassword(this.value);
        if (error) showError(passwordError, error);
        else hideError(passwordError);
    });
}

if (roleSelect) {
    roleSelect.addEventListener('change', function() {
        const error = validateRole(this.value);
        if (error) showError(roleError, error);
        else hideError(roleError);
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const role = roleSelect.value;

        const emailErrorMsg = validateEmail(email);
        const passwordErrorMsg = validatePassword(password);
        const roleErrorMsg = validateRole(role);

        let isValid = true;
        if (emailErrorMsg) { showError(emailError, emailErrorMsg); isValid = false; } else { hideError(emailError); }
        if (passwordErrorMsg) { showError(passwordError, passwordErrorMsg); isValid = false; } else { hideError(passwordError); }
        if (roleErrorMsg) { showError(roleError, roleErrorMsg); isValid = false; } else { hideError(roleError); }
        if (!isValid) return;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Signing In...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });
            const result = await response.json();
            if (!response.ok) {
                showError(emailError, result.message || 'Login failed');
                submitBtn.textContent = 'Sign In';
                submitBtn.disabled = false;
                return;
            }

            window.location.href = '/dashboard';
        } catch (error) {
            showError(emailError, 'Unable to reach server');
            submitBtn.textContent = 'Sign In';
            submitBtn.disabled = false;
        }
    });
}

if (forgotLink) {
    forgotLink.addEventListener('click', function(event) {
        event.preventDefault();
        alert('Password reset is not configured in this demo.');
    });
}

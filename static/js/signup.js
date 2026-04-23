const signupForm = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleSelect = document.getElementById('role');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const roleError = document.getElementById('roleError');

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

function validateName(name) {
    if (!name) return 'Name is required';
    return '';
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
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        eyeIcon.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const role = roleSelect.value;

        const nameErrorMsg = validateName(name);
        const emailErrorMsg = validateEmail(email);
        const passwordErrorMsg = validatePassword(password);
        const roleErrorMsg = validateRole(role);

        let isValid = true;
        if (nameErrorMsg) { showError(nameError, nameErrorMsg); isValid = false; } else { hideError(nameError); }
        if (emailErrorMsg) { showError(emailError, emailErrorMsg); isValid = false; } else { hideError(emailError); }
        if (passwordErrorMsg) { showError(passwordError, passwordErrorMsg); isValid = false; } else { hideError(passwordError); }
        if (roleErrorMsg) { showError(roleError, roleErrorMsg); isValid = false; } else { hideError(roleError); }
        if (!isValid) return;

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Signing Up...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });
            const result = await response.json();
            if (!response.ok) {
                showError(emailError, result.message || 'Signup failed');
                submitBtn.textContent = 'Sign Up';
                submitBtn.disabled = false;
                return;
            }
            alert('Signup successful. Please sign in.');
            window.location.href = '/login';
        } catch (error) {
            showError(emailError, 'Unable to reach server');
            submitBtn.textContent = 'Sign Up';
            submitBtn.disabled = false;
        }
    });
}

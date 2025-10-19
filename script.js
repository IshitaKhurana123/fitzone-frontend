
// Use a placeholder for the API URL which will be replaced during deployment
const API_URL = 'http://localhost:5000/api'; 
let currentEditId = null;

// --- STATE ---
let state = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')),
    role: localStorage.getItem('role'),
    members: [],
    trainers: []
};

// --- DOM ---
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const navLinks = document.getElementById('nav-links');
const pageTitle = document.getElementById('page-title');
const welcomeMessage = document.getElementById('welcome-message');

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    if (state.token && state.user && state.role) {
        initializeApp();
    } else {
        showLoginPage();
    }
    setupGlobalEventListeners();
});

function setupGlobalEventListeners() {
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-nav]')) {
            e.preventDefault();
            const page = e.target.getAttribute('data-nav');
            showPage(page);
        }
    });
}

function showLoginPage() {
    loginPage.style.display = 'block';
    appContainer.style.display = 'none';
    // Hide any previous error
    const err = document.getElementById('login-error');
    if (err) err.textContent = '';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) {
        document.getElementById('login-error').textContent = 'Please enter username and password';
        return;
    }
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        // store
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.role);
        state.user = data.user;
        state.role = data.role;
        showAppForRole();
    } catch (err) {
        document.getElementById('login-error').textContent = err.message;
    }
}

function logout() {
    state = { token: null, user: null, role: null, members: [], trainers: [] };
    localStorage.clear();
    location.reload();
}

function initializeApp() {
    loginPage.style.display = 'none';
    appContainer.style.display = 'block';
    welcomeMessage.textContent = `Welcome, ${state.user.username}`;
    renderNavForRole();
    showAppForRole();
}

function renderNavForRole() {
    navLinks.innerHTML = '';
    if (state.role === 'admin') {
        navLinks.innerHTML = `
            <li><a href="#" data-nav="dashboard">Dashboard</a></li>
            <li><a href="#" data-nav="members-page">Members</a></li>
            <li><a href="#" data-nav="trainers-page">Trainers</a></li>
        `;
    } else if (state.role === 'member') {
        navLinks.innerHTML = `
            <li><a href="#" data-nav="dashboard">Dashboard</a></li>
        `;
    } else if (state.role === 'trainer') {
        navLinks.innerHTML = `
            <li><a href="#" data-nav="dashboard">Dashboard</a></li>
        `;
    }
}

async function showAppForRole() {
    // load relevant data
    if (state.role === 'admin') {
        await loadAllData();
    }
    renderDashboard();
}

async function loadAllData() {
    const members = await apiRequest('/members');
    const trainers = await apiRequest('/trainers');
    if (members) state.members = members;
    if (trainers) state.trainers = trainers;
}

async function renderDashboard() {
    pageTitle.textContent = 'Dashboard';
    const main = document.getElementById('main-content');
    let html = '';
    if (state.role === 'admin') {
        html = `
            <h2>Admin Dashboard</h2>
            <p>Total Members: ${state.members.length}</p>
            <p>Total Trainers: ${state.trainers.length}</p>
        `;
    } else {
        // member or trainer
        const user = state.user;
        html = `
            <div class="user-summary">
                <h2>${user.username}'s Dashboard</h2>
                <div id="since-bar"></div>
                <div id="calendar-container"></div>
            </div>
        `;
    }
    main.innerHTML = html;
    if (state.role !== 'admin') {
        renderSinceBar(state.user);
        renderCalendar(state.user);
    }
}

// API helper
async function apiRequest(endpoint, method='GET', body=null) {
    try {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_URL}${endpoint}`, options);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'API error');
        }
        return await res.json();
    } catch (err) {
        console.error('API error', err);
        return null;
    }
}

// --- Attendance calendar and since bar ---
function renderSinceBar(user) {
    const container = document.getElementById('since-bar');
    const join = new Date(user.joinDate);
    const now = new Date();
    // compute difference years months days
    let years = now.getFullYear() - join.getFullYear();
    let months = now.getMonth() - join.getMonth();
    let days = now.getDate() - join.getDate();
    if (days < 0) {
        months -= 1;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }
    container.innerHTML = `<strong>Member since:</strong> ${years} years, ${months} months, ${days} days`;
}

function renderCalendar(user) {
    const container = document.getElementById('calendar-container');
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-index
    const firstDay = new Date(year, month, 1).getDay(); // 0-Sun..6
    const daysInMonth = new Date(year, month+1, 0).getDate();

    const attendance = (user.attendance || []).map(d => d.slice(0,10)); // normalize YYYY-MM-DD

    let html = `<div class="calendar"><div class="cal-header">${today.toLocaleString('default',{month:'long'})} ${year}</div>`;
    html += `<div class="cal-weekdays"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>`;
    html += '<div class="cal-days">';
    // empty slots
    for (let i=0;i<firstDay;i++) html += '<div class="cal-day empty"></div>';
    for (let d=1; d<=daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; // YYYY-MM-DD
        const isPresent = attendance.includes(dateStr);
        const cls = isPresent ? 'present' : 'absent';
        html += `<div class="cal-day ${cls}" title="${dateStr}">${d}</div>`;
    }
    html += '</div></div>';
    container.innerHTML = html;
}

/* Minimal other functions left intact if needed */

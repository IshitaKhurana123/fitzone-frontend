const API_URL = 'https://fitzone-ekkm.onrender.com/api'; // This will be your deployed backend URL
let currentEditId = null;

// --- STATE MANAGEMENT ---
let state = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')),
    role: localStorage.getItem('role'),
    members: [],
    trainers: []
};

// --- DOM ELEMENTS ---
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const roleSelection = document.getElementById('role-selection');
const loginForm = document.getElementById('login-form');
const backToRolesBtn = document.getElementById('back-to-roles');
const logoutBtn = document.getElementById('logout-btn');
const navLinks = document.getElementById('nav-links');
const pageTitle = document.getElementById('page-title');
const welcomeMessage = document.getElementById('welcome-message');

// --- TEMPLATES ---
const navLinkTemplate = (page, icon, text) => `<li><a href="#" class="nav-link" data-page="${page}-page"><i class="${icon}"></i> ${text}</a></li>`;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (state.token && state.user && state.role) {
        initializeApp();
    } else {
        showLoginPage();
    }
    setupGlobalEventListeners();
});

function setupGlobalEventListeners() {
    roleSelection.addEventListener('click', handleRoleSelect);
    loginForm.addEventListener('submit', handleLogin);
    backToRolesBtn.addEventListener('click', showRoleSelection);
    logoutBtn.addEventListener('click', logout);
}

// --- AUTHENTICATION ---
function handleRoleSelect(e) {
    if (e.target.classList.contains('role-btn')) {
        state.role = e.target.dataset.role;
        roleSelection.classList.add('hidden');
        loginForm.classList.remove('hidden');
        document.getElementById('login-form-title').textContent = `${state.role.charAt(0).toUpperCase() + state.role.slice(1)} Login`;
    }
}

function showRoleSelection() {
    roleSelection.classList.remove('hidden');
    loginForm.classList.add('hidden');
    document.getElementById('login-error').textContent = '';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: state.role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Login failed');

        state.token = data.token;
        state.user = data.user;
        state.role = data.role;
        localStorage.setItem('token', state.token);
        localStorage.setItem('user', JSON.stringify(state.user));
        localStorage.setItem('role', state.role);
        
        await initializeApp();

    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    }
}

function logout() {
    state = { token: null, user: null, role: null, members: [], trainers: [] };
    localStorage.clear();
    showLoginPage();
}

// --- APP & UI LOGIC ---
async function initializeApp() {
    loginPage.style.display = 'none';
    appContainer.style.display = 'flex';
    appContainer.classList.add('loaded');
    
    gsap.from(".sidebar", { duration: 1, x: -250, ease: "power2.out" });
    gsap.from(".header", { duration: 1, y: -100, opacity: 0, ease: "power2.out", delay: 0.5 });
    
    welcomeMessage.textContent = `Welcome, ${state.user.name || state.user.username}`;
    renderNav();
    await showPage('dashboard-page');
    setupAppEventListeners();
}

function renderNav() {
    let links = navLinkTemplate('dashboard', 'fas fa-chart-bar', 'Dashboard');
    
    switch (state.role) {
        case 'admin':
            links += navLinkTemplate('members', 'fas fa-users', 'Members');
            links += navLinkTemplate('trainers', 'fas fa-user-tie', 'Trainers');
            break;
        case 'member':
            links += navLinkTemplate('payment', 'fas fa-credit-card', 'Payment');
            break;
        case 'trainer':
            links += navLinkTemplate('salary', 'fas fa-money-bill-wave', 'Salary');
            break;
    }

    links += navLinkTemplate('equipment', 'fas fa-tools', 'Equipment');
    links += navLinkTemplate('plans', 'fas fa-tasks', 'Plans');
    navLinks.innerHTML = links;
}

function setupAppEventListeners() {
    navLinks.addEventListener('click', (e) => {
        e.preventDefault();
        const link = e.target.closest('.nav-link');
        if (link) {
            showPage(link.dataset.page);
        }
    });
    document.querySelector('.menu-toggle').addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("active"));
}

async function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    const newPage = document.getElementById(pageId);
    if (newPage) newPage.classList.add("active");
    
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if(activeLink) {
        activeLink.classList.add("active");
        pageTitle.textContent = activeLink.textContent.trim();
    }

    // Load content for the requested page
    switch(pageId) {
        case 'dashboard-page': await renderDashboard(); break;
        case 'members-page': await renderAdminMembers(); break;
        case 'trainers-page': await renderAdminTrainers(); break;
        case 'payment-page': renderMemberPayment(); break;
        case 'salary-page': renderTrainerSalary(); break;
        case 'equipment-page': renderEquipment(); break;
        case 'plans-page': renderPlans(); break;
    }
}

function showLoginPage() {
    appContainer.style.display = 'none';
    appContainer.classList.remove('loaded');
    loginPage.style.display = 'flex';
    showRoleSelection();
    loginForm.reset();
}

// --- PAGE RENDERERS ---

async function renderDashboard() {
    const dashboardPage = document.getElementById('dashboard-page');
    let content = '';
    switch(state.role) {
        case 'admin':
            await loadAllData();
            const activeMembers = state.members.filter(m => m.status === 'active').length;
            const activeTrainers = state.trainers.filter(t => t.status === 'active').length;
            content = `
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${state.members.length}</h3><p>Total Members</p></div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-check"></i></div><div class="stat-info"><h3>${activeMembers}</h3><p>Active Members</p></div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-tie"></i></div><div class="stat-info"><h3>${state.trainers.length}</h3><p>Total Trainers</p></div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-clock"></i></div><div class="stat-info"><h3>${activeTrainers}</h3><p>Active Trainers</p></div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><h3>₹${calculateRevenue()}</h3><p>Yearly Revenue</p></div></div>
                </div>`;
            break;
        case 'member':
            const paymentReminder = state.user.paymentStatus === 'Unpaid' ? `<p class="error-message">Your payment is due. Please visit the Payment page.</p>` : `<p style="color: #4caf50;">Your membership is active and paid.</p>`;
            const trainerInfo = state.user.assignedTrainer ? `<h3>${state.user.assignedTrainer.name}</h3><p>${state.user.assignedTrainer.specialization} Specialist</p><p>Contact: ${state.user.assignedTrainer.phone}</p>` : `<h3>No Trainer Assigned</h3><p>Please contact admin for assistance.</p>`;
            content = `
                <div class="dashboard-grid">
                    <div class="info-card"><h3>My Attendance</h3><p>${state.user.attendance} Days</p></div>
                    <div class="info-card"><h3>Payment Status</h3>${paymentReminder}</div>
                    <div class="info-card"><h3>Assigned Trainer</h3>${trainerInfo}</div>
                </div>`;
            break;
        case 'trainer':
            const assignedMembersList = state.user.assignedMembers && state.user.assignedMembers.length > 0 ?
                `<div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Plan</th><th>Attendance</th></tr></thead><tbody>` +
                state.user.assignedMembers.map(m => `<tr><td>${m.name}</td><td>${m.plan}</td><td>${m.attendance} days</td></tr>`).join('') +
                `</tbody></table></div>`
                : `<div class="info-card"><p>No members are currently assigned to you.</p></div>`;
            content = `
                <div class="dashboard-grid">
                    <div class="info-card"><h3>My Attendance</h3><p>${state.user.attendance} Days</p></div>
                    <div class="info-card"><h3>Salary Status</h3><p>Your salary is currently <strong>${state.user.salaryStatus}</strong>.</p></div>
                </div>
                <div class="page-header" style="margin-top: 30px;"><h2>Assigned Members</h2></div>
                ${assignedMembersList}`;
            break;
    }
    dashboardPage.innerHTML = content;
    gsap.from(".stat-card, .info-card", { duration: 0.8, y: 50, opacity: 0, stagger: 0.2, ease: "back.out(1.7)" });
}

// --- ADMIN PAGES ---
async function renderAdminMembers() {
    const membersPage = document.getElementById('members-page');
    membersPage.innerHTML = `
        <div class="page-header"><h2>Member Management</h2><button id="add-member-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Add Member</button></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Plan</th><th>Trainer</th><th>Attendance</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody id="members-table-body"></tbody></table></div>`;
    document.getElementById('add-member-btn').addEventListener('click', () => openMemberModal());
    await loadAndDisplayMembers();
}

async function loadAndDisplayMembers() {
    await loadAllData();
    const tableBody = document.getElementById('members-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = state.members.length > 0 ? state.members.map(member => `
        <tr>
            <td>${member.name}</td><td>${member.plan}</td><td>${member.assignedTrainer ? member.assignedTrainer.name : 'N/A'}</td><td>${member.attendance} days</td>
            <td><span class="status status-${member.paymentStatus.toLowerCase()}">${member.paymentStatus}</span></td><td><span class="status status-${member.status.toLowerCase()}">${member.status}</span></td>
            <td><button class="btn btn-warning btn-sm" onclick="openMemberModal('${member._id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteMember('${member._id}')">Delete</button></td>
        </tr>`).join('') : `<tr><td colspan="7">No members found.</td></tr>`;
}

async function renderAdminTrainers() {
    const trainersPage = document.getElementById('trainers-page');
    trainersPage.innerHTML = `
        <div class="page-header"><h2>Trainer Management</h2><button id="add-trainer-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Add Trainer</button></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Specialization</th><th>Members</th><th>Attendance</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody id="trainers-table-body"></tbody></table></div>`;
    document.getElementById('add-trainer-btn').addEventListener('click', () => openTrainerModal());
    await loadAndDisplayTrainers();
}

async function loadAndDisplayTrainers() {
    await loadAllData();
    const tableBody = document.getElementById('trainers-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = state.trainers.length > 0 ? state.trainers.map(trainer => `
        <tr>
            <td>${trainer.name}</td><td>${trainer.specialization}</td><td>${trainer.assignedMembers.length}</td><td>${trainer.attendance} days</td>
            <td><span class="status status-${trainer.salaryStatus.toLowerCase()}">${trainer.salaryStatus}</span></td><td><span class="status status-${trainer.status.toLowerCase()}">${trainer.status}</span></td>
            <td><button class="btn btn-warning btn-sm" onclick="openTrainerModal('${trainer._id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteTrainer('${trainer._id}')">Delete</button></td>
        </tr>`).join('') : `<tr><td colspan="7">No trainers found.</td></tr>`;
}


// --- OTHER ROLE PAGES ---
function renderMemberPayment() {
    const paymentPage = document.getElementById('payment-page');
    const statusMessage = state.user.paymentStatus === 'Paid' ? `Your membership is paid and up to date.` : `Your payment is currently due.`;
    paymentPage.innerHTML = `<div class="info-card"><h3>Payment Status</h3><p>${statusMessage}</p>${state.user.paymentStatus === 'Unpaid' ? `<button class="btn btn-primary" style="margin-top: 20px;" onclick="alert('Payment gateway integration coming soon!')">Pay Now</button>`: ''}</div>`;
}

function renderTrainerSalary() {
    const salaryPage = document.getElementById('salary-page');
    salaryPage.innerHTML = `<div class="info-card"><h3>Salary Status</h3><p>Your salary status is: <strong>${state.user.salaryStatus}</strong></p></div>`;
}

// --- SHARED PAGES ---
function renderEquipment() {
    document.getElementById('equipment-page').innerHTML = `<div class="page-header"><h2>Our Equipment</h2></div>
    <div class="equipment-grid">
        <div class="equipment-item"><img src="images/dumbbells.jpg" alt="Dumbbells"><h3>Dumbbell Rack</h3></div>
        <div class="equipment-item"><img src="images/treadmills.jpg" alt="Treadmills"><h3>Treadmills</h3></div>
        <div class="equipment-item"><img src="images/bench-press.jpg" alt="Bench Press"><h3>Bench Press</h3></div>
        <div class="equipment-item"><img src="images/leg-press.jpg" alt="Leg Press Machine"><h3>Leg Press Machine</h3></div>
        <div class="equipment-item"><img src="images/bikes.jpg" alt="Stationary Bikes"><h3>Stationary Bikes</h3></div>
        <div class="equipment-item"><img src="images/cable-crossover.jpg" alt="Cable Crossover"><h3>Cable Crossover</h3></div>
    </div>`;
}

function renderPlans() {
    document.getElementById('plans-page').innerHTML = `<div class="page-header"><h2>Membership Plans</h2></div>
    <div class="plans-grid">
        <div class="plan-card"><h3>Basic</h3><div class="plan-price">₹10,000 <small>/ year</small></div><ul class="plan-features"><li><i class="fas fa-check"></i> Full Gym Access</li><li><i class="fas fa-times"></i> Group Classes</li></ul></div>
        <div class="plan-card"><h3>Premium</h3><div class="plan-price">₹18,000 <small>/ year</small></div><ul class="plan-features"><li><i class="fas fa-check"></i> Full Gym Access</li><li><i class="fas fa-check"></i> Unlimited Group Classes</li></ul></div>
        <div class="plan-card"><h3>VIP</h3><div class="plan-price">₹25,000 <small>/ year</small></div><ul class="plan-features"><li><i class="fas fa-check"></i> Full Gym Access</li><li><i class="fas fa-check"></i> Unlimited Group Classes</li><li><i class="fas fa-check"></i> Personal Trainer Sessions</li></ul></div>
    </div>`;
}

// --- MODALS & FORM HANDLING ---
function openMemberModal(memberId = null) {
    const isEditing = memberId !== null;
    const member = isEditing ? state.members.find(m => m._id === memberId) : {};
    const modal = document.getElementById('member-modal');
    const trainerOptions = state.trainers.map(t => `<option value="${t._id}" ${member.assignedTrainer?._id === t._id ? 'selected' : ''}>${t.name}</option>`).join('');
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>${isEditing ? 'Edit' : 'Add'} Member</h3><span class="close" onclick="closeModal('member-modal')">&times;</span></div>
    <form id="member-form"><div class="form-group"><label>Full Name</label><input type="text" id="member-name" value="${member.name || ''}" required></div>
    <div class="form-group"><label>Username</label><input type="text" id="member-username" value="${member.username || ''}" ${isEditing ? 'disabled' : ''} required></div>
    ${!isEditing ? `<div class="form-group"><label>Password</label><input type="password" id="member-password" required></div>` : ''}
    <div class="form-group"><label>Membership Plan</label><select id="member-plan" required><option value="basic" ${member.plan === 'basic' ? 'selected' : ''}>Basic</option><option value="premium" ${member.plan === 'premium' ? 'selected' : ''}>Premium</option><option value="vip" ${member.plan === 'vip' ? 'selected' : ''}>VIP</option></select></div>
    <div class="form-group"><label>Assign Trainer</label><select id="member-trainer"><option value="">None</option>${trainerOptions}</select></div>
    <div class="form-group"><label>Attendance (days)</label><input type="number" id="member-attendance" value="${member.attendance || 0}" required></div>
    <div class="form-group"><label>Payment Status</label><select id="member-payment-status" required><option value="Paid" ${member.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option><option value="Unpaid" ${member.paymentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option></select></div>
    <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal('member-modal')">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form></div>`;
    modal.style.display = 'block';
    document.getElementById('member-form').addEventListener('submit', e => handleMemberSubmit(e, memberId));
}

async function handleMemberSubmit(e, memberId) {
    e.preventDefault();
    const isEditing = memberId !== null;
    const memberData = { name: document.getElementById('member-name').value, username: document.getElementById('member-username').value, plan: document.getElementById('member-plan').value, assignedTrainer: document.getElementById('member-trainer').value || null, attendance: document.getElementById('member-attendance').value, paymentStatus: document.getElementById('member-payment-status').value };
    if (!isEditing) memberData.password = document.getElementById('member-password').value;
    const result = await apiRequest(isEditing ? `/members/${memberId}` : '/members', isEditing ? 'PUT' : 'POST', memberData);
    if (result) { closeModal('member-modal'); await loadAndDisplayMembers(); } else alert('Failed to save member.');
}

async function deleteMember(memberId) {
    if (confirm('Delete this member?')) {
        if (await apiRequest(`/members/${memberId}`, 'DELETE')) await loadAndDisplayMembers();
    }
}

function openTrainerModal(trainerId = null) {
    const isEditing = trainerId !== null;
    const trainer = isEditing ? state.trainers.find(t => t._id === trainerId) : {};
    const modal = document.getElementById('trainer-modal');
    modal.innerHTML = `<div class="modal-content"><div class="modal-header"><h3>${isEditing ? 'Edit' : 'Add'} Trainer</h3><span class="close" onclick="closeModal('trainer-modal')">&times;</span></div>
    <form id="trainer-form"><div class="form-group"><label>Full Name</label><input type="text" id="trainer-name" value="${trainer.name || ''}" required></div>
    <div class="form-group"><label>Username</label><input type="text" id="trainer-username" value="${trainer.username || ''}" ${isEditing ? 'disabled' : ''} required></div>
    ${!isEditing ? `<div class="form-group"><label>Password</label><input type="password" id="trainer-password" required></div>` : ''}
    <div class="form-group"><label>Specialization</label><input type="text" id="trainer-specialization" value="${trainer.specialization || ''}" required></div>
    <div class="form-group"><label>Experience (years)</label><input type="number" id="trainer-experience" value="${trainer.experience || 0}" required></div>
    <div class="form-group"><label>Attendance (days)</label><input type="number" id="trainer-attendance" value="${trainer.attendance || 0}" required></div>
    <div class="form-group"><label>Salary Status</label><select id="trainer-salary-status" required><option value="Paid" ${trainer.salaryStatus === 'Paid' ? 'selected' : ''}>Paid</option><option value="Unpaid" ${trainer.salaryStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option></select></div>
    <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal('trainer-modal')">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div></form></div>`;
    modal.style.display = 'block';
    document.getElementById('trainer-form').addEventListener('submit', e => handleTrainerSubmit(e, trainerId));
}

async function handleTrainerSubmit(e, trainerId) {
    e.preventDefault();
    const isEditing = trainerId !== null;
    const trainerData = { name: document.getElementById('trainer-name').value, username: document.getElementById('trainer-username').value, specialization: document.getElementById('trainer-specialization').value, experience: document.getElementById('trainer-experience').value, attendance: document.getElementById('trainer-attendance').value, salaryStatus: document.getElementById('trainer-salary-status').value };
    if (!isEditing) trainerData.password = document.getElementById('trainer-password').value;
    const result = await apiRequest(isEditing ? `/trainers/${trainerId}` : '/trainers', isEditing ? 'PUT' : 'POST', trainerData);
    if (result) { closeModal('trainer-modal'); await loadAndDisplayTrainers(); } else alert('Failed to save trainer.');
}

async function deleteTrainer(trainerId) {
    if (confirm('Delete this trainer?')) {
        if (await apiRequest(`/trainers/${trainerId}`, 'DELETE')) await loadAndDisplayTrainers();
    }
}

function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

// --- DATA HELPERS ---
async function loadAllData() {
    const [members, trainers] = await Promise.all([apiRequest('/members'), apiRequest('/trainers')]);
    state.members = members || [];
    state.trainers = trainers || [];
}

function calculateRevenue() {
    const plansData = { basic: 10000, premium: 18000, vip: 25000 };
    return state.members.filter(m => m.paymentStatus === 'Paid' && plansData[m.plan]).reduce((sum, member) => sum + plansData[member.plan], 0).toLocaleString('en-IN');
}

async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` } };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'API Request Failed'); }
        return method === 'DELETE' ? response.ok : response.json();
    } catch (error) {
        console.error(`API Error: ${method} ${endpoint}`, error);
        if (error.status === 401 || error.status === 403) logout();
        return null;
    }
}


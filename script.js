// Use a placeholder for the API URL which will be replaced during deployment
const API_URL = 'https://fitzone-backend-2elo.onrender.com/api'; 
let currentEditId = null;

// Define plan details here
const plansData = {
    basic: { name: 'Basic', price: 10000 },
    premium: { name: 'Premium', price: 18000 },
    vip: { name: 'VIP', price: 25000 }
};

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
const logoutBtn = document.getElementById('logout-btn');
const navLinks = document.getElementById('nav-links');
const pageTitle = document.getElementById('page-title');
const welcomeMessage = document.getElementById('welcome-message');

// --- TEMPLATES ---
const navLinkTemplate = (pageId, icon, text) => `<li><a href="#" class="nav-link" data-page="${pageId}"><i class="${icon}"></i> ${text}</a></li>`;

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

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('role', data.role);
        
        location.reload();

    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    }
}

function logout() {
    state = { token: null, user: null, role: null, members: [], trainers: [] };
    localStorage.clear();
    location.reload();
}

// --- APP & UI LOGIC ---
async function initializeApp() {
    loginPage.style.display = 'none';
    appContainer.style.display = 'flex';
    appContainer.classList.add('loaded');
    
    gsap.from(".sidebar", { duration: 1, x: -250, ease: "power2.out" });
    gsap.from(".header", { duration: 1, y: -100, opacity: 0, ease: "power2.out", delay: 0.5 });
    
    // **CHANGE 1 IMPLEMENTED HERE**
    if (state.role === 'admin') {
        welcomeMessage.textContent = 'Welcome, Admin/Manager';
    } else {
        welcomeMessage.textContent = `Welcome, ${state.user.name || state.user.username}`;
    }

    renderNav();
    await showPage('dashboard-page');
    setupAppEventListeners();
}

function renderNav() {
    let links = navLinkTemplate('dashboard-page', 'fas fa-chart-bar', 'Dashboard');
    
    switch (state.role) {
        case 'admin':
            links += navLinkTemplate('members-page', 'fas fa-users', 'Members');
            links += navLinkTemplate('trainers-page', 'fas fa-user-tie', 'Trainers');
            links += navLinkTemplate('equipment-page', 'fas fa-tools', 'Equipment');
            links += navLinkTemplate('plans-page', 'fas fa-tasks', 'Plans');
            break;
        case 'member':
            links += navLinkTemplate('payment-page', 'fas fa-credit-card', 'Payment');
            links += navLinkTemplate('equipment-page', 'fas fa-tools', 'Equipment');
            links += navLinkTemplate('plans-page', 'fas fa-tasks', 'Plans');
            break;
        case 'trainer':
            links += navLinkTemplate('equipment-page', 'fas fa-tools', 'Equipment');
            links += navLinkTemplate('plans-page', 'fas fa-tasks', 'Plans');
            break;
    }

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

    switch(pageId) {
        case 'dashboard-page': await renderDashboard(); break;
        case 'members-page': await renderAdminMembers(); break;
        case 'trainers-page': await renderAdminTrainers(); break;
        case 'payment-page': renderMemberPayment(); break;
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
            // **CHANGE 2 IMPLEMENTED HERE**
            content = `
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${state.members.length}</h3><p>Total Members</p></div></div>
                    <div class="stat-card"><div class="stat-icon"><i class="fas fa-user-tie"></i></div><div class="stat-info"><h3>${state.trainers.length}</h3><p>Total Trainers</p></div></div>
                </div>`;
            break;
        case 'member':
            const paymentReminder = state.user.paymentStatus === 'Unpaid' ? `<p class="error-message" style="height: auto;">Your payment is due. Please visit the Payment page.</p>` : `<p style="color: #4caf50;">Your membership is active and paid.</p>`;
            const trainerInfo = state.user.assignedTrainer ? `<h3>${state.user.assignedTrainer.name}</h3><p>${state.user.assignedTrainer.specialization} Specialist</p><p>Contact: ${state.user.assignedTrainer.phone}</p>` : `<h3>No Trainer Assigned</h3><p>Please contact admin for assistance.</p>`;
            content = `
                <div class="dashboard-grid">
                    <div class="info-card"><h3>My Attendance</h3><p class="stat-info-h3">${state.user.attendance} Days</p></div>
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
                    <div class="info-card"><h3>My Attendance</h3><p class="stat-info-h3">${state.user.attendance} Days</p></div>
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
        <div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Plan</th><th>Trainer</th><th>Attendance</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="members-table-body"></tbody></table></div>`;
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
            <td><span class="status status-${member.paymentStatus.toLowerCase()}">${member.paymentStatus}</span></td>
            <td><button class="btn btn-warning btn-sm" onclick="openMemberModal('${member._id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteMember('${member._id}')">Delete</button></td>
        </tr>`).join('') : `<tr><td colspan="6">No members found.</td></tr>`;
}

async function renderAdminTrainers() {
    const trainersPage = document.getElementById('trainers-page');
    trainersPage.innerHTML = `
        <div class="page-header"><h2>Trainer Management</h2><button id="add-trainer-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Add Trainer</button></div>
        <div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Specialization</th><th>Members</th><th>Attendance</th><th>Actions</th></tr></thead><tbody id="trainers-table-body"></tbody></table></div>`;
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
            <td><button class="btn btn-warning btn-sm" onclick="openTrainerModal('${trainer._id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteTrainer('${trainer._id}')">Delete</button></td>
        </tr>`).join('') : `<tr><td colspan="5">No trainers found.</td></tr>`;
}

// --- MEMBER/TRAINER-SPECIFIC PAGES ---
function renderMemberPayment() {
    document.getElementById('payment-page').innerHTML = `<div class="info-card"><h3>My Payment Status</h3><p>Your membership status is currently: <strong>${state.user.paymentStatus}</strong>.</p><p>To pay your fees, please visit the front desk.</p></div>`;
}

function renderEquipment() {
    document.getElementById('equipment-page').innerHTML = `
        <div class="page-header"><h2>Our Equipment</h2></div>
        <div class="equipment-grid">
            <div class="equipment-item"><img src="/images/dumbbells.jpg" alt="Dumbbells"><h3>Dumbbell Rack</h3></div>
            <div class="equipment-item"><img src="/images/treadmills.jpg" alt="Treadmills"><h3>Treadmills</h3></div>
            <div class="equipment-item"><img src="/images/bench-press.jpg" alt="Bench Press"><h3>Bench Press</h3></div>
            <div class="equipment-item"><img src="/images/leg-press.jpg" alt="Leg Press Machine"><h3>Leg Press Machine</h3></div>
            <div class="equipment-item"><img src="/images/bikes.jpg" alt="Stationary Bikes"><h3>Stationary Bikes</h3></div>
            <div class="equipment-item"><img src="/images/cable-crossover.jpg" alt="Cable Crossover"><h3>Cable Crossover</h3></div>
        </div>`;
}

function renderPlans() {
    document.getElementById('plans-page').innerHTML = `
        <div class="page-header"><h2>Membership Plans</h2></div>
        <div class="plans-grid">
            <div class="plan-card"><h3>Basic</h3><div class="plan-price">₹10,000 <small>/ year</small></div><ul class="plan-features"><li><i class="fas fa-check"></i> Full Gym Access</li><li><i class="fas fa-check"></i> Locker Rooms & Showers</li><li><i class="fas fa-times"></i> Group Classes</li><li><i class="fas fa-times"></i> Personal Trainer</li></ul><button class="btn btn-primary" onclick="showPaymentQR('Basic', 10000)">Choose Plan</button></div>
            <div class="plan-card popular"><span class="popular-badge">Most Popular</span><h3>Premium</h3><div class="plan-price">₹18,000 <small>/ year</small></div><ul class="plan-features"><li><i class="fas fa-check"></i> Full Gym Access</li><li><i class="fas fa-check"></i> Locker Rooms & Showers</li><li><i class="fas fa-check"></i> Unlimited Group Classes</li><li><i class="fas fa-times"></i> Personal Trainer</li></ul><button class="btn btn-primary" onclick="showPaymentQR('Premium', 18000)">Choose Plan</button></div>
            <div class="plan-card"><h3>VIP</h3><div class="plan-price">₹25,000 <small>/ year</small></div><ul class="plan-features"><li><i class="fas fa-check"></i> Full Gym Access</li><li><i class="fas fa-check"></i> Locker Rooms & Showers</li><li><i class="fas fa-check"></i> Unlimited Group Classes</li><li><i class="fas fa-check"></i> 2 Personal Trainer Sessions/Month</li></ul><button class="btn btn-primary" onclick="showPaymentQR('VIP', 25000)">Choose Plan</button></div>
        </div>`;
}

// --- DATA HANDLING & API REQUESTS ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
        };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return method === 'DELETE' ? response.ok : response.json();
    } catch (error) {
        console.error(`API request failed: ${method} ${endpoint}`, error);
        alert(`An error occurred: ${error.message}`);
        return null;
    }
}

async function loadAllData() {
    const [members, trainers] = await Promise.all([
        apiRequest('/members'),
        apiRequest('/trainers')
    ]);
    if (members) state.members = members;
    if (trainers) state.trainers = trainers;
}

// --- MODALS & FORMS ---
function showPaymentQR(planName, price) {
    const formattedPrice = `₹${price.toLocaleString('en-IN')}`;
    const upiLink = `upi://pay?pa=your-upi-id@okhdfcbank&pn=FitZone&am=${price}.00&cu=INR&tn=Payment for ${planName} Plan`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

    document.getElementById('qr-plan-name').textContent = planName;
    document.getElementById('qr-amount').textContent = formattedPrice;
    document.getElementById('qr-code-image').src = qrApiUrl;
    
    document.getElementById('qr-modal').style.display = 'block';
}

function closePaymentQR() {
    document.getElementById('qr-modal').style.display = 'none';
}


function openMemberModal(id = null) {
    currentEditId = id;
    const modalTitle = document.getElementById('member-modal-title');
    const form = document.getElementById('member-form');
    form.reset();
    
    const trainerSelect = document.getElementById('member-trainer');
    trainerSelect.innerHTML = '<option value="">None</option>' + state.trainers.map(t => `<option value="${t._id}">${t.name}</option>`).join('');

    const passwordGroup = document.getElementById('member-password-group');

    if (id) {
        modalTitle.textContent = 'Edit Member';
        const member = state.members.find(m => m._id === id);
        if (member) {
            document.getElementById('member-name').value = member.name;
            document.getElementById('member-username').value = member.username;
            document.getElementById('member-email').value = member.email;
            document.getElementById('member-phone').value = member.phone;
            document.getElementById('member-plan').value = member.plan;
            document.getElementById('member-payment').value = member.paymentStatus;
            document.getElementById('member-attendance').value = member.attendance;
            trainerSelect.value = member.assignedTrainer?._id || '';
            passwordGroup.style.display = 'none';
        }
    } else {
        modalTitle.textContent = 'Add Member';
        passwordGroup.style.display = 'block';
    }
    document.getElementById('member-modal').style.display = 'block';
}

function closeMemberModal() { document.getElementById('member-modal').style.display = 'none'; }

async function handleMemberSubmit(e) {
    e.preventDefault();
    const memberData = {
        name: document.getElementById('member-name').value,
        username: document.getElementById('member-username').value,
        email: document.getElementById('member-email').value,
        phone: document.getElementById('member-phone').value,
        plan: document.getElementById('member-plan').value,
        paymentStatus: document.getElementById('member-payment').value,
        attendance: document.getElementById('member-attendance').value,
        assignedTrainer: document.getElementById('member-trainer').value || null,
    };
    if (!currentEditId) {
        memberData.password = document.getElementById('member-password').value;
    }

    const endpoint = currentEditId ? `/members/${currentEditId}` : '/members';
    const method = currentEditId ? 'PUT' : 'POST';
    
    const result = await apiRequest(endpoint, method, memberData);
    if(result) {
        closeMemberModal();
        await showPage('members-page');
        await renderDashboard();
    }
}

async function deleteMember(id) {
    if (confirm("Are you sure you want to delete this member? This cannot be undone.")) {
        const result = await apiRequest(`/members/${id}`, 'DELETE');
        if (result) {
            await showPage('members-page');
            await renderDashboard();
        }
    }
}

function openTrainerModal(id = null) {
    currentEditId = id;
    const modalTitle = document.getElementById('trainer-modal-title');
    const form = document.getElementById('trainer-form');
    form.reset();
    
    const passwordGroup = document.getElementById('trainer-password-group');

    if (id) {
        modalTitle.textContent = 'Edit Trainer';
        const trainer = state.trainers.find(t => t._id === id);
        if (trainer) {
            document.getElementById('trainer-name').value = trainer.name;
            document.getElementById('trainer-username').value = trainer.username;
            document.getElementById('trainer-specialization').value = trainer.specialization;
            document.getElementById('trainer-experience').value = trainer.experience;
            document.getElementById('trainer-phone').value = trainer.phone;
            document.getElementById('trainer-attendance').value = trainer.attendance;
            passwordGroup.style.display = 'none';
        }
    } else {
        modalTitle.textContent = 'Add Trainer';
        passwordGroup.style.display = 'block';
    }
    document.getElementById('trainer-modal').style.display = 'block';
}

function closeTrainerModal() { document.getElementById('trainer-modal').style.display = 'none'; }

async function handleTrainerSubmit(e) {
    e.preventDefault();
    const trainerData = {
        name: document.getElementById('trainer-name').value,
        username: document.getElementById('trainer-username').value,
        specialization: document.getElementById('trainer-specialization').value,
        experience: document.getElementById('trainer-experience').value,
        phone: document.getElementById('trainer-phone').value,
        attendance: document.getElementById('trainer-attendance').value,
    };
    if (!currentEditId) {
        trainerData.password = document.getElementById('trainer-password').value;
    }

    const endpoint = currentEditId ? `/trainers/${currentEditId}` : '/trainers';
    const method = currentEditId ? 'PUT' : 'POST';

    const result = await apiRequest(endpoint, method, trainerData);
    if(result) {
        closeTrainerModal();
        await showPage('trainers-page');
        await renderDashboard();
    }
}

async function deleteTrainer(id) {
    if (confirm("Are you sure you want to delete this trainer? This cannot be undone.")) {
        const result = await apiRequest(`/trainers/${id}`, 'DELETE');
        if (result) {
            await showPage('trainers-page');
            await renderDashboard();
        }
    }
}

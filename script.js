// ❗ IMPORTANT: When you deploy, change this to your Render backend URL
const API_URL = 'https://fitzone-s0xu.onrender.com';
let currentEditId = null;

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await loadMembers();
    await loadTrainers();
    await updateDashboard();

    gsap.from(".sidebar", { duration: 1, x: -250, ease: "power2.out" });
    gsap.from(".header", { duration: 1, y: -100, opacity: 0, ease: "power2.out", delay: 0.5 });
    gsap.from(".stat-card", { duration: 0.8, y: 50, opacity: 0, stagger: 0.2, ease: "back.out(1.7)", delay: 1 });
}

function setupEventListeners() {
    document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", e => {
        e.preventDefault();
        showPage(e.currentTarget.dataset.page);
    }));
    document.getElementById("member-form").addEventListener("submit", handleMemberSubmit);
    document.getElementById("trainer-form").addEventListener("submit", handleTrainerSubmit);
    document.querySelector(".menu-toggle").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("active"));
}

async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return method === 'DELETE' ? response.ok : response.json();
    } catch (error) {
        console.error(`API request failed: ${method} ${endpoint}`, error);
        alert(`An error occurred. Please check the console for details.`);
        return null;
    }
}

// --- Member Management ---
async function loadMembers() {
    const members = await apiRequest('/members');
    if (!members) return;
    const tbody = document.getElementById("members-table");
    tbody.innerHTML = "";
    members.forEach(member => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${member._id.slice(-6)}</td>
            <td>${member.name}</td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td>${member.plan}</td>
            <td><span class="status ${member.status}">${member.status}</span></td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editMember('${member._id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMember('${member._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function handleMemberSubmit(e) {
    e.preventDefault();
    const memberData = {
        name: document.getElementById("member-name").value,
        email: document.getElementById("member-email").value,
        phone: document.getElementById("member-phone").value,
        plan: document.getElementById("member-plan").value,
    };

    if (currentEditId) {
        await apiRequest(`/members/${currentEditId}`, 'PUT', memberData);
    } else {
        await apiRequest('/members', 'POST', memberData);
    }

    closeMemberModal();
    await loadMembers();
    await updateDashboard();
}

async function editMember(id) {
    // We can't just fetch one member yet, so we'll find it from the full list
    const members = await apiRequest('/members');
    if (!members) return;
    const member = members.find(m => m._id === id);
    if (member) {
        currentEditId = id;
        document.getElementById("member-modal-title").textContent = "Edit Member";
        document.getElementById("member-name").value = member.name;
        document.getElementById("member-email").value = member.email;
        document.getElementById("member-phone").value = member.phone;
        document.getElementById("member-plan").value = member.plan;
        openMemberModal();
    }
}

async function deleteMember(id) {
    if (confirm("Are you sure you want to delete this member?")) {
        await apiRequest(`/members/${id}`, 'DELETE');
        await loadMembers();
        await updateDashboard();
    }
}

// --- Trainer Management ---
async function loadTrainers() {
    const trainers = await apiRequest('/trainers');
    if (!trainers) return;
    const tbody = document.getElementById("trainers-table");
    tbody.innerHTML = "";
    trainers.forEach(trainer => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${trainer._id.slice(-6)}</td>
            <td>${trainer.name}</td>
            <td>${trainer.specialization}</td>
            <td>${trainer.experience} years</td>
            <td>${trainer.phone}</td>
            <td><span class="status ${trainer.status}">${trainer.status}</span></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteTrainer('${trainer._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function handleTrainerSubmit(e) {
    e.preventDefault();
    const trainerData = {
        name: document.getElementById("trainer-name").value,
        specialization: document.getElementById("trainer-specialization").value,
        experience: document.getElementById("trainer-experience").value,
        phone: document.getElementById("trainer-phone").value,
    };

    await apiRequest('/trainers', 'POST', trainerData);
    closeTrainerModal();
    await loadTrainers();
    await updateDashboard();
}

async function deleteTrainer(id) {
    if (confirm("Are you sure you want to delete this trainer?")) {
        await apiRequest(`/trainers/${id}`, 'DELETE');
        await loadTrainers();
        await updateDashboard();
    }
}

// --- Dashboard & UI ---
async function updateDashboard() {
    const members = await apiRequest('/members');
    const trainers = await apiRequest('/trainers');
    if (members) document.getElementById("total-members").textContent = members.length;
    if (trainers) document.getElementById("total-trainers").textContent = trainers.filter(t => t.status === 'active').length;
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    const newPage = document.getElementById(pageId);
    if (newPage) newPage.classList.add("active");
    
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`[data-page="${pageId}"]`);
    if(activeLink) {
        activeLink.classList.add("active");
        document.getElementById("page-title").textContent = activeLink.textContent.trim();
    }
}

function openMemberModal() {
    currentEditId = null;
    document.getElementById("member-form").reset();
    document.getElementById("member-modal-title").textContent = "Add Member";
    document.getElementById('member-modal').style.display = 'block';
}

function closeMemberModal() { document.getElementById('member-modal').style.display = 'none'; }
function openTrainerModal() { 
    document.getElementById("trainer-form").reset();
    document.getElementById('trainer-modal').style.display = 'block'; 
}

function closeTrainerModal() { document.getElementById('trainer-modal').style.display = 'none'; }

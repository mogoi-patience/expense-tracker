/* ── State ─────────────────────────────────────────────────────────────────── */
const state = {
  expenses: [],
  summary:  null,
  month:    todayMonth(),
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function todayMonth() {
  return new Date().toISOString().slice(0, 7);
}
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
function fmt(amount) {
  return "KSh " + Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function daysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/* ── API ───────────────────────────────────────────────────────────────────── */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

async function loadExpenses() {
  const cat  = document.getElementById("filterCategory").value;
  const sort = document.getElementById("filterSort").value;
  const params = new URLSearchParams({ month: state.month });
  if (cat)  params.set("category", cat);
  if (sort) params.set("sort", sort);
  state.expenses = await api(`/api/expenses?${params}`);
  renderExpenseTable();
}

async function loadSummary() {
  state.summary = await api(`/api/summary?month=${state.month}`);
  renderDashboard();
}

async function loadAll() {
  await Promise.all([loadExpenses(), loadSummary()]);
}

/* ── Dashboard rendering ───────────────────────────────────────────────────── */
function renderDashboard() {
  const s = state.summary;
  if (!s) return;

  document.getElementById("statTotal").textContent = fmt(s.total);
  document.getElementById("statCount").textContent = state.expenses.length;

  const days = daysInMonth(state.month);
  document.getElementById("statAvg").textContent = fmt(s.total / days);

  const top = s.by_category[0];
  document.getElementById("statTop").textContent = top ? top.category.split(" ")[0] : "—";

  // Category bar chart
  const chart = document.getElementById("categoryChart");
  if (s.by_category.length === 0) {
    chart.innerHTML = `<div class="empty-chart">No data yet for this month.</div>`;
  } else {
    const max = s.by_category[0].total;
    chart.innerHTML = s.by_category.map(c => `
      <div class="bar-row">
        <div class="bar-meta">
          <span>${c.category}</span>
          <span>${fmt(c.total)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(c.total / max * 100).toFixed(1)}%"></div>
        </div>
      </div>
    `).join("");
  }

  // Recent list (up to 6)
  const recent = [...state.expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const rl = document.getElementById("recentList");
  if (recent.length === 0) {
    rl.innerHTML = `<li class="empty-chart">No expenses this month.</li>`;
  } else {
    rl.innerHTML = recent.map(e => `
      <li class="recent-item">
        <div class="ri-left">
          <span class="ri-title">${esc(e.title)}</span>
          <span class="ri-meta">${e.date} · ${esc(e.category)}</span>
        </div>
        <span class="ri-amount">${fmt(e.amount)}</span>
      </li>
    `).join("");
  }
}

/* ── Expense table rendering ───────────────────────────────────────────────── */
function renderExpenseTable() {
  const tbody = document.getElementById("expenseTableBody");
  const empty = document.getElementById("emptyState");

  if (state.expenses.length === 0) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  tbody.innerHTML = state.expenses.map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${esc(e.title)}</td>
      <td><span class="tag">${esc(e.category)}</span></td>
      <td class="td-note">${esc(e.note || "—")}</td>
      <td class="td-amount">${fmt(e.amount)}</td>
      <td class="td-actions">
        <button class="action-btn" onclick="openEdit(${e.id})">Edit</button>
        <button class="action-btn del" onclick="openDelete(${e.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

/* ── Category filter options ───────────────────────────────────────────────── */
function populateCategoryFilter() {
  const cats = [
    "Food & Dining","Transport","Housing","Health",
    "Entertainment","Shopping","Education","Utilities","Other"
  ];
  const sel = document.getElementById("filterCategory");
  cats.forEach(c => {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
}

/* ── Modal helpers ─────────────────────────────────────────────────────────── */
function openModal() {
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  clearForm();
}
function clearForm() {
  document.getElementById("editId").value   = "";
  document.getElementById("fTitle").value   = "";
  document.getElementById("fAmount").value  = "";
  document.getElementById("fDate").value    = todayDate();
  document.getElementById("fCategory").value = "";
  document.getElementById("fNote").value    = "";
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("modalTitle").textContent = "Add Expense";
  document.getElementById("saveExpense").textContent = "Save";
}

function openAdd() {
  clearForm();
  openModal();
}

function openEdit(id) {
  const e = state.expenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById("editId").value    = e.id;
  document.getElementById("fTitle").value    = e.title;
  document.getElementById("fAmount").value   = e.amount;
  document.getElementById("fDate").value     = e.date;
  document.getElementById("fCategory").value = e.category;
  document.getElementById("fNote").value     = e.note || "";
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("modalTitle").textContent  = "Edit Expense";
  document.getElementById("saveExpense").textContent = "Update";
  openModal();
}

/* ── Save expense ──────────────────────────────────────────────────────────── */
async function saveExpense() {
  const id       = document.getElementById("editId").value;
  const title    = document.getElementById("fTitle").value.trim();
  const amount   = document.getElementById("fAmount").value;
  const date     = document.getElementById("fDate").value;
  const category = document.getElementById("fCategory").value;
  const note     = document.getElementById("fNote").value.trim();
  const errEl    = document.getElementById("formError");

  if (!title || !amount || !category || !date) {
    errEl.textContent = "Please fill in all required fields.";
    errEl.classList.remove("hidden");
    return;
  }

  const body = { title, amount: parseFloat(amount), category, date, note };
  const method = id ? "PUT" : "POST";
  const url    = id ? `/api/expenses/${id}` : "/api/expenses";

  const res = await api(url, { method, body: JSON.stringify(body) });
  if (res.error) {
    errEl.textContent = res.error;
    errEl.classList.remove("hidden");
    return;
  }

  closeModal();
  showToast(id ? "Expense updated." : "Expense added.");
  await loadAll();
}

/* ── Delete expense ────────────────────────────────────────────────────────── */
let pendingDeleteId = null;

function openDelete(id) {
  pendingDeleteId = id;
  document.getElementById("confirmModal").classList.remove("hidden");
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  await api(`/api/expenses/${pendingDeleteId}`, { method: "DELETE" });
  document.getElementById("confirmModal").classList.add("hidden");
  pendingDeleteId = null;
  showToast("Expense deleted.");
  await loadAll();
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.classList.add("hidden"), 200);
  }, 2400);
}

/* ── Nav / view switching ──────────────────────────────────────────────────── */
function switchView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${name}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.view === name);
  });
}

/* ── Escape HTML ───────────────────────────────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Init ──────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Set month picker
  const gm = document.getElementById("globalMonth");
  gm.value = state.month;
  gm.addEventListener("change", async () => {
    state.month = gm.value;
    await loadAll();
  });

  // Nav
  document.querySelectorAll(".nav-item").forEach(n =>
    n.addEventListener("click", e => { e.preventDefault(); switchView(n.dataset.view); })
  );

  // Add buttons
  document.getElementById("openAddModal").addEventListener("click", openAdd);
  document.getElementById("openAddModal2").addEventListener("click", openAdd);

  // Modal close
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", e => {
    if (e.target === document.getElementById("modal")) closeModal();
  });

  // Save
  document.getElementById("saveExpense").addEventListener("click", saveExpense);

  // Delete confirm
  document.getElementById("confirmDelete").addEventListener("click", confirmDelete);
  document.getElementById("cancelDelete").addEventListener("click", () => {
    document.getElementById("confirmModal").classList.add("hidden");
    pendingDeleteId = null;
  });

  // Filters
  document.getElementById("filterCategory").addEventListener("change", loadExpenses);
  document.getElementById("filterSort").addEventListener("change", loadExpenses);

  // Defaults
  document.getElementById("fDate").value = todayDate();

  populateCategoryFilter();
  loadAll();
});

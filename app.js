const SUPABASE_URL = "https://ryeidiawdqejwpvzxhnp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_44bO8u3pthKzdzXLy1298Q_7Xg8pYwg";

const ACCESS_PIN = "1988";
const PIN_SESSION_KEY = "attendance-tracker-pin-ok";
const CLOUD_KEY = "attendance-tracker-main";

const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const defaultData = () => ({
  settings: {
    orgName: "",
    filterFrom: "",
    filterTo: "",
  },
  pointRules: [
    { id: "rule-present", label: "Present", code: "P", points: 2, color: "#0f9f93" },
    { id: "rule-late", label: "Late", code: "L", points: 0, color: "#f6b73c" },
    { id: "rule-absent", label: "Absent", code: "A", points: -2, color: "#de5f3a" },
    { id: "rule-excused", label: "Excused", code: "E", points: 0, color: "#4f7cac" },
  ],
  people: [
    {
      id: "person-1",
      name: "Alex Rivera",
      role: "Team Lead",
      email: "alex@example.com",
      phone: "",
      status: "Active",
      startDate: "",
      tags: "",
      notes: "",
      adjustment: 0,
      attendance: [
        {
          id: "entry-1",
          date: new Date().toISOString().slice(0, 10),
          ruleId: "rule-present",
          pointsOverride: null,
          notes: "",
        },
      ],
    },
  ],
});

const state = {
  data: defaultData(),
  currentPersonId: null,
  ready: false,
};

let saveTimer = null;

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRuleById(ruleId) {
  return state.data.pointRules.find((rule) => rule.id === ruleId) || null;
}

function entryPoints(entry) {
  if (entry.pointsOverride !== null && entry.pointsOverride !== "") {
    const parsed = Number(entry.pointsOverride);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const rule = getRuleById(entry.ruleId);
  return rule ? Number(rule.points) : 0;
}

function personTotalPoints(person) {
  const attendancePoints = person.attendance.reduce((sum, entry) => sum + entryPoints(entry), 0);
  return attendancePoints + Number(person.adjustment || 0);
}

function getFilteredEntries() {
  const from = state.data.settings.filterFrom;
  const to = state.data.settings.filterTo;
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const entries = [];
  state.data.people.forEach((person) => {
    person.attendance.forEach((entry) => {
      const entryDate = entry.date ? new Date(entry.date) : null;
      if (fromDate && entryDate && entryDate < fromDate) return;
      if (toDate && entryDate && entryDate > toDate) return;
      entries.push({
        personId: person.id,
        personName: person.name,
        entry,
      });
    });
  });
  return entries;
}

function switchTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function renderDashboard() {
  const peopleCount = state.data.people.length;
  const entries = getFilteredEntries();
  const totalEntries = entries.length;
  const totalPoints = state.data.people.reduce((sum, person) => sum + personTotalPoints(person), 0);
  const avgPoints = peopleCount ? (totalPoints / peopleCount).toFixed(1) : "0";

  document.getElementById("stat-people").textContent = peopleCount;
  document.getElementById("stat-entries").textContent = totalEntries;
  document.getElementById("stat-average").textContent = avgPoints;

  const pointsPreview = document.getElementById("points-preview");
  pointsPreview.innerHTML = "";
  state.data.pointRules.forEach((rule) => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = `${rule.label}: ${rule.points}`;
    tag.style.background = `${rule.color}22`;
    tag.style.color = rule.color;
    pointsPreview.appendChild(tag);
  });

  const recentActivity = document.getElementById("recent-activity");
  recentActivity.innerHTML = "";
  const sorted = entries
    .slice()
    .sort((a, b) => new Date(b.entry.date || 0) - new Date(a.entry.date || 0))
    .slice(0, 6);

  if (sorted.length === 0) {
    recentActivity.innerHTML = '<p class="muted">No activity yet. Add attendance entries to see them here.</p>';
    return;
  }

  sorted.forEach((item) => {
    const rule = getRuleById(item.entry.ruleId);
    const card = document.createElement("div");
    card.className = "activity-item";
    card.innerHTML = `
      <div>
        <strong>${item.personName}</strong>
        <div class="muted">${item.entry.date || "No date"} · ${rule ? rule.label : "Unknown"}</div>
      </div>
      <div><strong>${entryPoints(item.entry)}</strong> pts</div>
    `;
    recentActivity.appendChild(card);
  });
}

function renderPersonSelect() {
  const select = document.getElementById("person-select");
  select.innerHTML = "";

  if (state.data.people.length === 0) {
    const option = document.createElement("option");
    option.textContent = "No people available";
    option.value = "";
    select.appendChild(option);
    return;
  }

  state.data.people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = person.name;
    select.appendChild(option);
  });

  if (!state.currentPersonId || !state.data.people.some((p) => p.id === state.currentPersonId)) {
    state.currentPersonId = state.data.people[0].id;
  }
  select.value = state.currentPersonId;
}

function renderPersonDetails() {
  const container = document.getElementById("person-details");
  const person = state.data.people.find((p) => p.id === state.currentPersonId);

  if (!person) {
    container.innerHTML = '<p class="muted">Select a person to view details.</p>';
    return;
  }

  container.innerHTML = `
    <div class="row between">
      <h2>${person.name}</h2>
      <div class="row">
        <button id="remove-person" class="ghost">Remove Person</button>
      </div>
    </div>
    <div class="stats">
      <div>
        <p class="stat-label">Total Points</p>
        <p class="stat-value">${personTotalPoints(person)}</p>
      </div>
      <div>
        <p class="stat-label">Entries</p>
        <p class="stat-value">${person.attendance.length}</p>
      </div>
      <div>
        <p class="stat-label">Status</p>
        <p class="stat-value">${person.status || "-"}</p>
      </div>
    </div>
    <div class="divider"></div>
    <div class="stack">
      <div class="row">
        <div>
          <label for="person-name">Name</label>
          <input id="person-name" type="text" value="${escapeHtml(person.name)}" />
        </div>
        <div>
          <label for="person-role">Role</label>
          <input id="person-role" type="text" value="${escapeHtml(person.role || "")}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="person-email">Email</label>
          <input id="person-email" type="email" value="${escapeHtml(person.email || "")}" />
        </div>
        <div>
          <label for="person-phone">Phone</label>
          <input id="person-phone" type="text" value="${escapeHtml(person.phone || "")}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="person-status">Status</label>
          <input id="person-status" type="text" value="${escapeHtml(person.status || "")}" />
        </div>
        <div>
          <label for="person-start">Start Date</label>
          <input id="person-start" type="date" value="${escapeHtml(person.startDate || "")}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="person-tags">Tags</label>
          <input id="person-tags" type="text" value="${escapeHtml(person.tags || "")}" />
        </div>
        <div>
          <label for="person-adjust">Manual Adjustment</label>
          <input id="person-adjust" type="number" value="${person.adjustment || 0}" />
        </div>
      </div>
      <div>
        <label for="person-notes">Notes</label>
        <textarea id="person-notes" rows="4">${escapeHtml(person.notes || "")}</textarea>
      </div>
    </div>
  `;

  container.querySelector("#remove-person").addEventListener("click", () => {
    if (!confirm(`Remove ${person.name}? This cannot be undone.`)) return;
    state.data.people = state.data.people.filter((p) => p.id !== person.id);
    state.currentPersonId = state.data.people.length ? state.data.people[0].id : null;
    saveData();
    renderAll();
  });

  bindInput("person-name", (value) => (person.name = value));
  bindInput("person-role", (value) => (person.role = value));
  bindInput("person-email", (value) => (person.email = value));
  bindInput("person-phone", (value) => (person.phone = value));
  bindInput("person-status", (value) => (person.status = value));
  bindInput("person-start", (value) => (person.startDate = value));
  bindInput("person-tags", (value) => (person.tags = value));
  bindInput("person-adjust", (value) => (person.adjustment = Number(value) || 0));
  bindTextarea("person-notes", (value) => (person.notes = value));
}

function renderPersonAttendance() {
  const container = document.getElementById("person-attendance");
  const person = state.data.people.find((p) => p.id === state.currentPersonId);

  if (!person) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="row between">
      <h2>Attendance & Points</h2>
      <div class="muted">Auto-calculates from the point system.</div>
    </div>
    <form id="add-entry-form" class="stack">
      <div class="row">
        <div>
          <label for="entry-date">Date</label>
          <input id="entry-date" type="date" required />
        </div>
        <div>
          <label for="entry-rule">Status</label>
          <select id="entry-rule"></select>
        </div>
        <div>
          <label for="entry-points">Points Override</label>
          <input id="entry-points" type="number" placeholder="Auto" />
        </div>
      </div>
      <div>
        <label for="entry-notes">Notes</label>
        <input id="entry-notes" type="text" placeholder="Optional" />
      </div>
      <button class="secondary" type="submit">Add Entry</button>
    </form>
    <div class="divider"></div>
    <div id="attendance-list"></div>
  `;

  const ruleSelect = container.querySelector("#entry-rule");
  state.data.pointRules.forEach((rule) => {
    const option = document.createElement("option");
    option.value = rule.id;
    option.textContent = `${rule.label} (${rule.points})`;
    ruleSelect.appendChild(option);
  });

  const form = container.querySelector("#add-entry-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const date = container.querySelector("#entry-date").value;
    const ruleId = ruleSelect.value;
    const pointsOverrideRaw = container.querySelector("#entry-points").value;
    const notes = container.querySelector("#entry-notes").value;

    person.attendance.unshift({
      id: uid("entry"),
      date,
      ruleId,
      pointsOverride: pointsOverrideRaw === "" ? null : Number(pointsOverrideRaw),
      notes,
    });
    saveData();
    renderAll();
  });

  const list = container.querySelector("#attendance-list");
  if (person.attendance.length === 0) {
    list.innerHTML = '<p class="muted">No attendance entries yet.</p>';
    return;
  }

  person.attendance.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div>
        <label>Date</label>
        <input type="date" value="${escapeHtml(entry.date || "")}" data-field="date" />
      </div>
      <div>
        <label>Status</label>
        <select data-field="rule"></select>
      </div>
      <div>
        <label>Points</label>
        <input type="number" value="${entry.pointsOverride ?? ""}" placeholder="Auto" data-field="points" />
      </div>
      <div>
        <label>Notes</label>
        <input type="text" value="${escapeHtml(entry.notes || "")}" data-field="notes" />
      </div>
      <div class="actions">
        <button class="ghost" data-action="remove">Remove</button>
      </div>
    `;

    const select = row.querySelector("select");
    state.data.pointRules.forEach((rule) => {
      const option = document.createElement("option");
      option.value = rule.id;
      option.textContent = rule.label;
      if (rule.id === entry.ruleId) option.selected = true;
      select.appendChild(option);
    });

    row.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("change", (event) => {
        const field = event.target.dataset.field;
        if (field === "date") entry.date = event.target.value;
        if (field === "rule") entry.ruleId = event.target.value;
        if (field === "points") {
          const value = event.target.value;
          entry.pointsOverride = value === "" ? null : Number(value);
        }
        if (field === "notes") entry.notes = event.target.value;
        saveData();
        renderAll();
      });
    });

    row.querySelector("[data-action='remove']").addEventListener("click", () => {
      person.attendance = person.attendance.filter((item) => item.id !== entry.id);
      saveData();
      renderAll();
    });

    list.appendChild(row);
  });
}

function renderPointsTable() {
  const container = document.getElementById("points-table");
  container.innerHTML = "";

  state.data.pointRules.forEach((rule) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div>
        <label>Label</label>
        <input type="text" value="${escapeHtml(rule.label)}" data-field="label" />
      </div>
      <div>
        <label>Code</label>
        <input type="text" value="${escapeHtml(rule.code)}" data-field="code" />
      </div>
      <div>
        <label>Points</label>
        <input type="number" value="${rule.points}" data-field="points" />
      </div>
      <div>
        <label>Color</label>
        <input type="color" value="${rule.color}" data-field="color" />
      </div>
      <div class="actions">
        <button class="ghost" data-action="remove">Remove</button>
      </div>
    `;

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", (event) => {
        const field = event.target.dataset.field;
        if (field === "label") rule.label = event.target.value;
        if (field === "code") rule.code = event.target.value;
        if (field === "points") rule.points = Number(event.target.value);
        if (field === "color") rule.color = event.target.value;
        saveData();
        renderAll();
      });
    });

    row.querySelector("[data-action='remove']").addEventListener("click", () => {
      if (state.data.pointRules.length <= 1) {
        alert("At least one point rule is required.");
        return;
      }
      if (!confirm(`Remove point rule "${rule.label}"?`)) return;
      const remaining = state.data.pointRules.filter((r) => r.id !== rule.id);
      const fallback = remaining[0];
      state.data.people.forEach((person) => {
        person.attendance.forEach((entry) => {
          if (entry.ruleId === rule.id && fallback) entry.ruleId = fallback.id;
        });
      });
      state.data.pointRules = remaining;
      saveData();
      renderAll();
    });

    container.appendChild(row);
  });
}

function renderPeopleTable() {
  const container = document.getElementById("people-table");
  container.innerHTML = "";

  if (state.data.people.length === 0) {
    container.innerHTML = '<p class="muted">No people yet. Use the form above to add someone.</p>';
    return;
  }

  state.data.people.forEach((person) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div>
        <label>Name</label>
        <input type="text" value="${escapeHtml(person.name)}" data-field="name" />
      </div>
      <div>
        <label>Role</label>
        <input type="text" value="${escapeHtml(person.role || "")}" data-field="role" />
      </div>
      <div>
        <label>Email</label>
        <input type="email" value="${escapeHtml(person.email || "")}" data-field="email" />
      </div>
      <div>
        <label>Phone</label>
        <input type="text" value="${escapeHtml(person.phone || "")}" data-field="phone" />
      </div>
      <div>
        <label>Points</label>
        <input type="number" value="${personTotalPoints(person)}" disabled />
      </div>
      <div class="actions">
        <button class="ghost" data-action="open">Open</button>
        <button class="ghost" data-action="remove">Remove</button>
      </div>
    `;

    row.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", (event) => {
        const field = event.target.dataset.field;
        if (!field) return;
        person[field] = event.target.value;
        saveData();
        renderAll();
      });
    });

    row.querySelector("[data-action='open']").addEventListener("click", () => {
      state.currentPersonId = person.id;
      saveData();
      renderAll();
      switchTab("person-hub");
    });

    row.querySelector("[data-action='remove']").addEventListener("click", () => {
      if (!confirm(`Remove ${person.name}?`)) return;
      state.data.people = state.data.people.filter((p) => p.id !== person.id);
      if (state.currentPersonId === person.id) {
        state.currentPersonId = state.data.people[0]?.id || null;
      }
      saveData();
      renderAll();
    });

    container.appendChild(row);
  });
}

function bindInput(id, handler) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("change", (event) => {
    handler(event.target.value);
    saveData();
    renderAll();
  });
}

function bindTextarea(id, handler) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("change", (event) => {
    handler(event.target.value);
    saveData();
    renderAll();
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAll() {
  document.getElementById("org-name").value = state.data.settings.orgName || "";
  document.getElementById("filter-from").value = state.data.settings.filterFrom || "";
  document.getElementById("filter-to").value = state.data.settings.filterTo || "";

  renderDashboard();
  renderPersonSelect();
  renderPersonDetails();
  renderPersonAttendance();
  renderPointsTable();
  renderPeopleTable();
}

function setPinError(message) {
  const target = document.getElementById("pin-error");
  if (target) target.textContent = message || "";
}

function setLockState(isLocked) {
  const pinScreen = document.getElementById("pin-screen");
  const app = document.getElementById("app");
  if (isLocked) {
    pinScreen.style.display = "grid";
    app.hidden = true;
  } else {
    pinScreen.style.display = "none";
    app.hidden = false;
  }
}

async function loadRemoteData() {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("key", CLOUD_KEY)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  if (!data) {
    const payload = defaultData();
    await supabase.from("app_state").upsert({
      key: CLOUD_KEY,
      data: payload,
      updated_at: new Date().toISOString(),
    });
    return payload;
  }

  return data.data || defaultData();
}

function saveData() {
  if (!state.ready) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistData, 500);
}

async function persistData() {
  if (!state.ready) return;
  const payload = {
    key: CLOUD_KEY,
    data: state.data,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("app_state").upsert(payload);
  if (error) console.error(error);
}

async function unlockWithPin(pinInput) {
  if (pinInput !== ACCESS_PIN) {
    setPinError("Incorrect PIN.");
    return false;
  }
  if (!supabase) {
    setPinError("Supabase client failed to initialize.");
    return false;
  }

  setPinError("");
  sessionStorage.setItem(PIN_SESSION_KEY, "true");

  const remoteData = await loadRemoteData();
  state.data = remoteData || defaultData();
  state.ready = true;
  setLockState(false);
  renderAll();
  return true;
}

function init() {
  const pinInput = document.getElementById("pin-input");
  const pinSubmit = document.getElementById("pin-submit");

  const attemptUnlock = async () => {
    pinSubmit.disabled = true;
    const value = pinInput.value.trim();
    pinInput.value = "";
    const ok = await unlockWithPin(value);
    if (!ok) pinInput.focus();
    pinSubmit.disabled = false;
  };

  pinSubmit.addEventListener("click", attemptUnlock);
  pinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      attemptUnlock();
    }
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  document.getElementById("org-name").addEventListener("change", (event) => {
    state.data.settings.orgName = event.target.value;
    saveData();
  });

  document.getElementById("person-select").addEventListener("change", (event) => {
    state.currentPersonId = event.target.value;
    renderAll();
  });

  document.getElementById("add-rule").addEventListener("click", () => {
    state.data.pointRules.push({
      id: uid("rule"),
      label: "New Rule",
      code: "N",
      points: 0,
      color: "#0f9f93",
    });
    saveData();
    renderAll();
  });

  document.getElementById("add-person-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const nameInput = document.getElementById("new-name");
    const roleInput = document.getElementById("new-role");
    const emailInput = document.getElementById("new-email");
    const phoneInput = document.getElementById("new-phone");
    const notesInput = document.getElementById("new-notes");

    const person = {
      id: uid("person"),
      name: nameInput.value.trim(),
      role: roleInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      status: "Active",
      startDate: "",
      tags: "",
      notes: notesInput.value.trim(),
      adjustment: 0,
      attendance: [],
    };

    if (!person.name) return;
    state.data.people.push(person);
    state.currentPersonId = person.id;

    nameInput.value = "";
    roleInput.value = "";
    emailInput.value = "";
    phoneInput.value = "";
    notesInput.value = "";

    saveData();
    renderAll();
  });

  document.getElementById("export-data").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-data").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.people || !parsed.pointRules) throw new Error("Invalid format");
        state.data = parsed;
        saveData();
        renderAll();
      } catch (error) {
        alert("Import failed. Please choose a valid JSON export.");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("reset-data").addEventListener("click", () => {
    if (!confirm("Reset all data to defaults?")) return;
    state.data = defaultData();
    saveData();
    renderAll();
  });

  document.getElementById("apply-filter").addEventListener("click", () => {
    state.data.settings.filterFrom = document.getElementById("filter-from").value;
    state.data.settings.filterTo = document.getElementById("filter-to").value;
    saveData();
    renderAll();
  });

  document.getElementById("clear-filter").addEventListener("click", () => {
    state.data.settings.filterFrom = "";
    state.data.settings.filterTo = "";
    saveData();
    renderAll();
  });

  const unlocked = sessionStorage.getItem(PIN_SESSION_KEY) === "true";
  if (unlocked) {
    unlockWithPin(ACCESS_PIN);
  } else {
    setLockState(true);
    pinInput.focus();
  }
}

init();

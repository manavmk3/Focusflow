// Global application state object
const state = {
    todos: [],
    goals: [],
    schedule: {},
    notes: [],
    flashcards: [],
    fcIndex: 0,
    timer: {
        running: false,
        mode: 'focus',
        seconds: 25 * 60,
        session: 1,
        interval: null
    },
    focusToday: 0,
    sessionsToday: 0,
    totalFocus: 0,
    streak: 0,
};

// Collection of daily motivational quotes
const QUOTES = [{
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain"
}, {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson"
}, {
    text: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier"
}, {
    text: "The expert in anything was once a beginner.",
    author: "Helen Hayes"
}, {
    text: "Study hard, for the well is deep and our brains are shallow.",
    author: "Richard Baxter"
}, {
    text: "Learning is not attained by chance; it must be sought with ardor and diligence.",
    author: "Abigail Adams"
}, ];

// Initialize application, load data, and set up everything on page load
function init() {
    loadState();
    setGreeting();
    setQuote();
    renderAll();
    buildHeatmap();
    renderScheduleView();
    renderFlashcard();
    renderDots();
    updateTimerSettings();
    updateBadge();
}

// Load saved data from localStorage to persist user info between sessions
function loadState() {
    try {
        const s = localStorage.getItem('focusflow');
        if (s) Object.assign(state, JSON.parse(s));
        state.timer = {
            running: false,
            mode: 'focus',
            seconds: (state.focusDur || 25) * 60,
            session: 1,
            interval: null
        };
    } catch (e) {}
}

// Save current progress back to localStorage
function saveState() {
    const toSave = {
        todos: state.todos,
        goals: state.goals,
        schedule: state.schedule,
        notes: state.notes,
        flashcards: state.flashcards,
        focusToday: state.focusToday,
        sessionsToday: state.sessionsToday,
        totalFocus: state.totalFocus,
        streak: state.streak,
        focusDur: parseInt(document.getElementById('focus-dur').value) || 25
    };
    localStorage.setItem('focusflow', JSON.stringify(toSave));
}

function setGreeting() {
    const h = new Date().getHours();
    const el = document.getElementById('greeting-time');
    if (h < 12) el.textContent = 'morning';
    else if (h < 17) el.textContent = 'afternoon';
    else el.textContent = 'evening';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date();
    document.getElementById('today-date').textContent =
        `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function setQuote() {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    document.getElementById('daily-quote').textContent = `"${q.text}"`;
    document.getElementById('daily-author').textContent = `— ${q.author}`;
}

// Handles tab switching and page navigation within the single page app
function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('nav-' + page).classList.add('active');
    if (page === 'dashboard') refreshDashboard();
    if (page === 'progress') refreshProgress();
}

// --- TO-DO LIST LOGIC ---

function addTodo() {
    const text = document.getElementById('todo-input').value.trim();
    if (!text) return;
    state.todos.unshift({
        id: Date.now(),
        text,
        priority: document.getElementById('todo-priority').value,
        subject: document.getElementById('todo-subject').value,
        due: document.getElementById('todo-due').value,
        done: false,
        created: new Date().toISOString()
    });
    document.getElementById('todo-input').value = '';
    document.getElementById('todo-due').value = '';
    renderTodos();
    saveState();
    updateBadge();
    updateStats();
    showToast('Task added!');
}

function toggleTodo(id) {
    const t = state.todos.find(t => t.id === id);
    if (t) {
        t.done = !t.done;
        if (t.done) state.focusToday;
    }
    renderTodos();
    saveState();
    updateBadge();
    refreshDashboard();
    updateStats();

    if (t && t.done) checkAllDone();
}

function deleteTodo(id) {
    state.todos = state.todos.filter(t => t.id !== id);
    renderTodos();
    saveState();
    updateBadge();
    updateStats();
}

let todoFilter = 'all';

function filterTodos(f, el) {
    todoFilter = f;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderTodos();
}

function renderTodos() {
    const list = document.getElementById('todo-list');
    let todos = [...state.todos];
    if (todoFilter === 'pending') todos = todos.filter(t => !t.done);
    if (todoFilter === 'done') todos = todos.filter(t => t.done);

    if (!todos.length) {
        list.innerHTML = `<div class="empty-state"><div class="icon">🎉</div><p>${todoFilter==='done'?'No completed tasks yet':'All clear! Add some tasks.'}</p></div>`;
        return;
    }
    list.innerHTML = todos.map(t => `
    <div class="todo-item card-based ${t.done?'done':''} priority-${t.priority}" id="todo-${t.id}">
      <div class="todo-check ${t.done?'checked':''}" onclick="toggleTodo(${t.id})">
        ${t.done ? '<span class="tick-icon">✓</span>' : ''}
      </div>
      <div style="flex:1;">
        <div class="todo-text">${escHtml(t.text)}</div>
        <div class="todo-meta-row" style="display:flex;gap:8px;align-items:center;margin-top:8px;">
          <span class="tag tag-${t.priority}">
            ${t.priority === 'high' ? '🔴 High' : t.priority === 'med' ? '🟡 Med' : '🟢 Low'}
          </span>
          <span class="todo-meta">🏷️ ${t.subject}</span>
          ${t.due ? `<span class="todo-meta">📅 ${t.due}</span>` : ''}
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteTodo(${t.id})">✕</button>
    </div>`).join('');
}

function updateBadge() {
    const pending = state.todos.filter(t => !t.done).length;
    document.getElementById('todo-badge').textContent = pending;
    document.getElementById('todo-badge').style.display = pending ? '' : 'none';
}

function updateStats() {
    const total = state.todos.length;
    const done = state.todos.filter(t => t.done).length;
    const pending = total - done;

    const statDoneEl = document.getElementById('stat-done');
    if (statDoneEl) statDoneEl.textContent = done;

    const elTotal = document.getElementById('ts-total');
    const elPending = document.getElementById('ts-pending');
    const elDone = document.getElementById('ts-done');

    if (elTotal) {
        elTotal.textContent = total;
        elPending.textContent = pending;
        elDone.textContent = done;
    }
}

function checkAllDone() {
    const total = state.todos.length;
    const done = state.todos.filter(t => t.done).length;
    if (total > 0 && total === done) shootConfetti();
}

function shootConfetti() {
    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
        confetti.style.backgroundColor = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)];
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
    }
}

// --- STUDY GOALS LOGIC ---

function addGoal() {
    const name = document.getElementById('goal-name').value.trim();
    const target = parseInt(document.getElementById('goal-target').value);
    if (!name || !target) return showToast('Fill in all fields!', '⚠️');
    state.goals.unshift({
        id: Date.now(),
        name,
        target,
        progress: 0,
        subject: document.getElementById('goal-subject').value,
        deadline: document.getElementById('goal-deadline').value,
        created: new Date().toISOString()
    });
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    renderGoals();
    saveState();
    document.getElementById('stat-goals').textContent = state.goals.filter(g => g.progress < g.target).length;
    showToast('Goal set! 🎯');
}

function updateGoalProgress(id, delta) {
    const g = state.goals.find(g => g.id === id);
    if (!g) return;
    g.progress = Math.min(g.target, Math.max(0, g.progress + delta));
    renderGoals();
    saveState();
}

function deleteGoal(id) {
    state.goals = state.goals.filter(g => g.id !== id);
    renderGoals();
    saveState();
}

function renderGoals() {
    const list = document.getElementById('goals-list');
    if (!state.goals.length) {
        list.innerHTML = `<div class="empty-state"><div class="icon">🎯</div><p>No goals yet. Set your first one!</p></div>`;
        return;
    }
    list.innerHTML = state.goals.map(g => {
        const pct = Math.round((g.progress / g.target) * 100);
        return `<div class="goal-card">
      <div class="goal-header">
        <div>
          <div class="goal-name">${escHtml(g.name)}</div>
          <div style="color:var(--accent);font-size:12px;margin-top:2px;">${g.subject}</div>
        </div>
        <div style="text-align:right;">
          ${g.deadline ? `<div class="goal-deadline">📅 ${g.deadline}</div>` : ''}
          <button class="btn btn-danger btn-sm" style="margin-top:6px;" onclick="deleteGoal(${g.id})">✕</button>
        </div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="progress-label">
        <span>${g.progress} / ${g.target}</span>
        <span>${pct}%</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-ghost btn-sm" onclick="updateGoalProgress(${g.id},-1)">− 1</button>
        <button class="btn btn-ghost btn-sm" onclick="updateGoalProgress(${g.id},1)">+ 1</button>
        <button class="btn btn-ghost btn-sm" onclick="updateGoalProgress(${g.id},5)">+ 5</button>
        <button class="btn btn-ghost btn-sm" onclick="updateGoalProgress(${g.id},10)">+ 10</button>
        ${pct >= 100 ? '<span style="color:var(--accent);font-weight:700;font-size:13px;margin-left:auto;">🎉 Complete!</span>' : ''}
      </div>
    </div>`;
    }).join('');
}

// --- WEEKLY SCHEDULE LOGIC ---

function addSchedule() {
    const day = document.getElementById('sched-day').value;
    const time = document.getElementById('sched-time').value;
    const name = document.getElementById('sched-name').value.trim();
    const type = document.getElementById('sched-type').value;
    if (!name) return showToast('Enter a name!', '⚠️');
    if (!state.schedule[day]) state.schedule[day] = [];
    state.schedule[day].push({
        time,
        name,
        type,
        id: Date.now()
    });
    state.schedule[day].sort((a, b) => a.time.localeCompare(b.time));
    document.getElementById('sched-name').value = '';
    renderScheduleView();
    saveState();
    showToast('Added to schedule!');
}

function renderScheduleView() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const view = document.getElementById('schedule-view');
    view.innerHTML = days.map(day => {
        const items = state.schedule[day] || [];
        return `<div class="day-row">
      <div class="day-name">${day}</div>
      <div class="day-tasks">
        ${items.length ? items.map(item => `
          <div class="schedule-tag ${item.type}" style="display:flex;align-items:center;gap:6px;">
            ${item.time ? `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text3);">${item.time}</span>` : ''}
            <span>${escHtml(item.name)}</span>
            <span onclick="removeSchedule('${day}',${item.id})" style="cursor:pointer;color:var(--text3);font-size:11px;margin-left:4px;">✕</span>
          </div>`).join('') : `<span style="color:var(--text3);font-size:13px;">Free day</span>`}
      </div>
    </div>`;
    }).join('');
}

function removeSchedule(day, id) {
    state.schedule[day] = state.schedule[day].filter(s => s.id !== id);
    renderScheduleView();
    saveState();
}

// --- POMODORO TIMER LOGIC ---

let timerSeconds, timerInterval, timerMode = 'focus',
    timerSession = 1;
let focusDur = 25,
    breakDur = 5,
    longBreakDur = 15;

function updateTimerSettings() {
    focusDur = parseInt(document.getElementById('focus-dur').value) || 25;
    breakDur = parseInt(document.getElementById('break-dur').value) || 5;
    longBreakDur = parseInt(document.getElementById('long-break-dur').value) || 15;
    if (!timerInterval) {
        timerSeconds = focusDur * 60;
        updateTimerDisplay();
    }
}

function toggleTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        document.getElementById('timer-btn').textContent = '▶ Resume';
        document.getElementById('timer-display').classList.remove('running', 'break');
    } else {
        if (timerSeconds === undefined) timerSeconds = focusDur * 60;
        document.getElementById('timer-btn').textContent = '⏸ Pause';
        timerInterval = setInterval(tickTimer, 1000);
        updateTimerDisplay();
    }
}

function tickTimer() {
    if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        handleTimerEnd();
        return;
    }
    timerSeconds--;
    updateTimerDisplay();
}

function handleTimerEnd() {
    if (timerMode === 'focus') {
        state.focusToday += focusDur;
        state.totalFocus += focusDur;
        state.sessionsToday++;
        document.getElementById('today-focus-min').textContent = state.focusToday + ' min';
        document.getElementById('today-sessions').textContent = state.sessionsToday;
        document.getElementById('stat-focus').textContent = state.focusToday;
        markDot(timerSession - 1);

        if (timerSession % 4 === 0) {
            timerMode = 'longbreak';
            timerSeconds = longBreakDur * 60;
            document.getElementById('timer-mode-label').textContent = 'LONG BREAK ☕';
        } else {
            timerMode = 'break';
            timerSeconds = breakDur * 60;
            document.getElementById('timer-mode-label').textContent = 'SHORT BREAK 🌿';
        }
        timerSession++;
        document.getElementById('timer-session-count').textContent = `Session ${timerSession} of ${Math.ceil(timerSession/4)*4}`;
    } else {
        timerMode = 'focus';
        timerSeconds = focusDur * 60;
        document.getElementById('timer-mode-label').textContent = 'FOCUS SESSION';
    }
    document.getElementById('timer-btn').textContent = '▶ Start';
    updateTimerDisplay();
    saveState();
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerMode = 'focus';
    timerSession = 1;
    timerSeconds = focusDur * 60;
    document.getElementById('timer-btn').textContent = '▶ Start';
    document.getElementById('timer-mode-label').textContent = 'FOCUS SESSION';
    document.getElementById('timer-session-count').textContent = 'Session 1 of 4';
    document.getElementById('timer-display').classList.remove('running', 'break');
    updateTimerDisplay();
    renderDots();
}

function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
    const el = document.getElementById('timer-display');
    el.classList.remove('running', 'break');
    if (timerInterval) el.classList.add(timerMode === 'focus' ? 'running' : 'break');
}

function renderDots() {
    const dots = document.getElementById('pom-dots');
    dots.innerHTML = Array.from({
        length: 4
    }, (_, i) => `<div class="pom-dot" id="dot-${i}"></div>`).join('');
}

function markDot(i) {
    const d = document.getElementById(`dot-${i}`);
    if (d) d.classList.add('done');
}

// --- QUICK NOTES LOGIC ---

function addNote() {
    const title = document.getElementById('note-title').value.trim();
    const content = document.getElementById('note-content').value.trim();
    if (!title || !content) return showToast('Fill title and content!', '⚠️');
    state.notes.unshift({
        id: Date.now(),
        title,
        content,
        subject: document.getElementById('note-subject').value,
        date: new Date().toLocaleDateString()
    });
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    renderNotes();
    saveState();
    showToast('Note saved! 📝');
}

function deleteNote(id) {
    state.notes = state.notes.filter(n => n.id !== id);
    renderNotes();
    saveState();
}

function renderNotes() {
    const list = document.getElementById('notes-list');
    if (!state.notes.length) {
        list.innerHTML = `<div class="empty-state"><div class="icon">📝</div><p>No notes yet.</p></div>`;
        return;
    }
    list.innerHTML = state.notes.map(n => `
    <div class="note-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <div class="note-subject">${n.subject}</div>
          <div class="note-title">${escHtml(n.title)}</div>
          <div class="note-preview">${escHtml(n.content)}</div>
          <div class="note-date">${n.date}</div>
        </div>
        <button class="btn btn-danger btn-sm" style="margin-left:10px;" onclick="deleteNote(${n.id})">✕</button>
      </div>
    </div>`).join('');
}

// --- FLASHCARDS LOGIC ---

function addFlashcard() {
    const front = document.getElementById('fc-front').value.trim();
    const back = document.getElementById('fc-back').value.trim();
    if (!front || !back) return showToast('Fill both sides!', '⚠️');
    state.flashcards.push({
        id: Date.now(),
        front,
        back,
        subject: document.getElementById('fc-subject').value,
        score: 0
    });
    document.getElementById('fc-front').value = '';
    document.getElementById('fc-back').value = '';
    renderFlashcard();
    saveState();
    document.getElementById('fc-count').textContent = state.flashcards.length;
    showToast('Flashcard added!');
}

function renderFlashcard() {
    const fc = state.flashcards;
    document.getElementById('fc-count').textContent = fc.length;
    if (!fc.length) {
        document.getElementById('fc-display-front').textContent = 'Add cards to start studying!';
        document.getElementById('fc-display-back').textContent = '—';
        document.getElementById('fc-nav-label').textContent = '— / —';
        return;
    }
    const i = Math.min(state.fcIndex, fc.length - 1);
    state.fcIndex = i;
    document.getElementById('fc-display-front').textContent = fc[i].front;
    document.getElementById('fc-display-back').textContent = fc[i].back;
    document.getElementById('fc-nav-label').textContent = `${i+1} / ${fc.length}`;
    document.getElementById('flashcard').classList.remove('flipped');
}

function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

function nextCard() {
    if (state.flashcards.length) {
        state.fcIndex = (state.fcIndex + 1) % state.flashcards.length;
        renderFlashcard();
    }
}

function prevCard() {
    if (state.flashcards.length) {
        state.fcIndex = (state.fcIndex - 1 + state.flashcards.length) % state.flashcards.length;
        renderFlashcard();
    }
}

function markFc(rating) {
    if (!state.flashcards.length) return;
    const fc = state.flashcards[state.fcIndex];
    fc.score = rating === 'easy' ? (fc.score || 0) + 1 : Math.max(0, (fc.score || 0) - 1);
    showToast(rating === 'easy' ? 'Great! Moving on.' : 'Noted. Review again.');
    nextCard();
    saveState();
}

// --- PROGRESS & HEATMAP LOGIC ---

// Builds a visual activity heatmap similar to GitHub contribution graph
function buildHeatmap() {
    const hm = document.getElementById('heatmap');
    const levels = ['', 'l1', 'l2', 'l3', 'l4'];
    hm.innerHTML = Array.from({
        length: 14
    }, () => {
        const l = levels[Math.floor(Math.random() * levels.length)];
        return `<div class="heat-cell ${l}" title="Activity"></div>`;
    }).join('');
}

function refreshProgress() {
    document.getElementById('prog-total-done').textContent = state.todos.filter(t => t.done).length;
    document.getElementById('prog-total-focus').textContent = Math.round((state.totalFocus || 0) / 60 * 10) / 10 + 'h';
    document.getElementById('prog-notes').textContent = state.notes.length;

    const subjects = ['Math', 'Science', 'English', 'History', 'CS', 'Other'];
    const counts = {};
    subjects.forEach(s => counts[s] = 0);
    state.todos.forEach(t => {
        if (counts[t.subject] !== undefined) counts[t.subject]++;
    });
    const max = Math.max(1, ...Object.values(counts));
    document.getElementById('subject-bars').innerHTML = subjects.map(s => `
    <div class="subject-row">
      <div class="subject-name">${s}</div>
      <div style="flex:1;height:10px;background:var(--surface3);border-radius:99px;overflow:hidden;">
        <div style="height:100%;width:${(counts[s]/max)*100}%;background:linear-gradient(90deg,var(--accent2),var(--accent));border-radius:99px;transition:width 0.5s;"></div>
      </div>
      <div style="width:24px;text-align:right;font-size:12px;color:var(--text2);font-family:'JetBrains Mono',monospace;">${counts[s]}</div>
    </div>`).join('');
}

function refreshDashboard() {
    updateStats();
    const recent = state.todos.filter(t => !t.done).slice(0, 4);
    document.getElementById('dashboard-tasks').innerHTML = recent.length ?
        recent.map(t => `<div class="todo-item" style="margin-bottom:6px;">
        <div class="todo-check ${t.done?'checked':''}" onclick="toggleTodo(${t.id})">${t.done?'✓':''}</div>
        <div class="todo-text" style="font-size:13px;">${escHtml(t.text)}</div>
        <span class="tag tag-${t.priority}">${t.priority.toUpperCase()}</span>
      </div>`).join('') :
        `<div class="empty-state"><div class="icon">🎉</div><p>All tasks done!</p></div>`;

    const goals = state.goals.filter(g => g.progress < g.target).slice(0, 3);
    document.getElementById('dashboard-goals').innerHTML = goals.length ?
        goals.map(g => {
            const pct = Math.round((g.progress / g.target) * 100);
            return `<div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
            <span>${escHtml(g.name)}</span><span style="color:var(--accent);font-family:'JetBrains Mono',monospace;">${pct}%</span>
          </div>
          <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
        </div>`;
        }).join('') :
        `<div class="empty-state"><div class="icon">🎯</div><p>Set your first goal!</p></div>`;

    document.getElementById('stat-goals').textContent = state.goals.filter(g => g.progress < g.target).length;
    document.getElementById('stat-focus').textContent = state.focusToday || 0;
    document.getElementById('streak-count').textContent = '🔥 ' + (state.streak || 0);
}

function renderAll() {
    renderTodos();
    renderGoals();
    renderNotes();
    renderFlashcard();
    renderScheduleView();
    refreshDashboard();
    document.getElementById('today-focus-min').textContent = (state.focusToday || 0) + ' min';
    document.getElementById('today-sessions').textContent = state.sessionsToday || 0;
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg, icon = '✅') {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    document.querySelector('.toast-icon').textContent = icon + ' ';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
}

// Keyboard shortcuts: hit Enter in the input field to quickly add a to-do
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'todo-input') addTodo();
});

init();
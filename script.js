/* ===================================================
   Kisah — script.js
   Vanilla JS, no frameworks.
   Sections:
     1. Constants & State
     2. Storage helpers
     3. Seed data
     4. Stats
     5. Render helpers (badges, stars, cover icons)
     6. Render items
     7. Filter, Sort & Search
     8. Modal (add / edit)
     9. Confirm dialog (delete)
    10. Event wiring
   =================================================== */

'use strict';

// ─────────────────────────────────────────────────────────
// 1. CONSTANTS & STATE
// ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'kisah_items';
const SEEDED_KEY  = 'kisah_seeded';

/**
 * Item shape:
 * {
 *   id: string,
 *   title: string,
 *   type: 'Book' | 'Movie',
 *   status: 'Up Next' | 'In Progress' | 'Done',
 *   rating: number (0–5),
 *   note: string,
 *   genre: string,          ← NEW: genre tag (optional)
 *   favorite: boolean,       ← NEW: quick-favorite flag
 *   progress: number,        ← NEW: 0–100 %, only shown when In Progress
 *   progressLabel: string,   ← NEW: human label e.g. "Chapter 7"
 *   addedAt: number,         ← NEW: timestamp for Date Added sort
 * }
 */
let items = [];

const state = {
  filterStatus:    'All',
  filterType:      'All',
  filterFavorites: false,   // ← NEW: show favorites only
  sortBy:          'default', // ← NEW: 'default' | 'title' | 'rating' | 'date'
  search:          '',
};

// ─────────────────────────────────────────────────────────
// 2. STORAGE HELPERS
// ─────────────────────────────────────────────────────────
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
    // Migrate older items that pre-date new fields
    items = items.map(item => ({
      genre: '',
      favorite: false,
      progress: 0,
      progressLabel: '',
      addedAt: Date.now(),
      ...item,                 // existing fields overwrite defaults
    }));
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateId() {
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─────────────────────────────────────────────────────────
// 3. SEED DATA  (runs once on first visit)
// ─────────────────────────────────────────────────────────
const NOW = Date.now();
const SEED = [
  {
    title: 'Dune', type: 'Book', status: 'Done', rating: 5,
    note: 'Epic world-building. A must-read.',
    genre: 'Sci-Fi', favorite: true, progress: 0, progressLabel: '',
    addedAt: NOW - 6 * 86400000,
  },
  {
    title: 'Interstellar', type: 'Movie', status: 'Done', rating: 4,
    note: 'Visually stunning, emotionally heavy.',
    genre: 'Sci-Fi', favorite: false, progress: 0, progressLabel: '',
    addedAt: NOW - 5 * 86400000,
  },
  {
    title: 'Atomic Habits', type: 'Book', status: 'In Progress', rating: 0,
    note: 'Taking notes on each chapter.',
    genre: 'Self-Help', favorite: true, progress: 45, progressLabel: 'Chapter 9',
    addedAt: NOW - 4 * 86400000,
  },
  {
    title: 'Past Lives', type: 'Movie', status: 'Up Next', rating: 0,
    note: 'Heard it\'s beautifully melancholic.',
    genre: 'Romance', favorite: false, progress: 0, progressLabel: '',
    addedAt: NOW - 3 * 86400000,
  },
  {
    title: 'The Alchemist', type: 'Book', status: 'Up Next', rating: 0,
    note: '',
    genre: 'Classic', favorite: false, progress: 0, progressLabel: '',
    addedAt: NOW - 2 * 86400000,
  },
  {
    title: 'Everything Everywhere All at Once', type: 'Movie', status: 'Done', rating: 5,
    note: 'Absolutely mind-blowing.',
    genre: 'Drama', favorite: true, progress: 0, progressLabel: '',
    addedAt: NOW - 1 * 86400000,
  },
];

function maybeSeed() {
  if (!localStorage.getItem(SEEDED_KEY)) {
    items = SEED.map(s => ({ ...s, id: generateId() }));
    saveItems();
    localStorage.setItem(SEEDED_KEY, '1');
  }
}

// ─────────────────────────────────────────────────────────
// 4. STATS
// ─────────────────────────────────────────────────────────
function computeStats() {
  const total      = items.length;
  const upNext     = items.filter(i => i.status === 'Up Next').length;
  const inProgress = items.filter(i => i.status === 'In Progress').length;
  const done       = items.filter(i => i.status === 'Done').length;
  const rated      = items.filter(i => i.status === 'Done' && i.rating > 0);
  const avgRating  = rated.length
    ? (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(1)
    : '—';
  return { total, upNext, inProgress, done, avgRating };
}

function renderStats() {
  const { total, upNext, inProgress, done, avgRating } = computeStats();
  const container = document.getElementById('stats-row');

  const cards = [
    {
      label: 'Total',
      value: total,
      iconBg: '#E0F2FE',
      iconColor: '#0EA5E9',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      label: 'Up Next',
      value: upNext,
      iconBg: '#BAE6FD',
      iconColor: '#0369A1',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    },
    {
      label: 'In Progress',
      value: inProgress,
      iconBg: '#E0E7FF',
      iconColor: '#4338CA',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    },
    {
      label: 'Done',
      value: done,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    },
    {
      label: 'Avg Rating',
      value: avgRating,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#D97706" stroke="#D97706" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    },
  ];

  container.innerHTML = cards.map(c => `
    <div class="stat-card" role="status" aria-label="${c.label}: ${c.value}">
      <div class="stat-icon" style="background:${c.iconBg};color:${c.iconColor}">${c.icon}</div>
      <div>
        <div class="text-xl font-extrabold text-slate-800 leading-tight">${c.value}</div>
        <div class="text-xs text-slate-500 font-medium">${c.label}</div>
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────────────
// 5. RENDER HELPERS
// ─────────────────────────────────────────────────────────

/** Returns the CSS class key for a given status string */
function statusClass(status) {
  if (status === 'Up Next')     return 'upnext';
  if (status === 'In Progress') return 'inprogress';
  return 'done';
}

/** Inline SVG: open book icon */
const BOOK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="1.6"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>`;

/** Inline SVG: film icon */
const MOVIE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="1.6"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
    <line x1="7" y1="2" x2="7" y2="22"/>
    <line x1="17" y1="2" x2="17" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="2" y1="7" x2="7" y2="7"/>
    <line x1="2" y1="17" x2="7" y2="17"/>
    <line x1="17" y1="17" x2="22" y2="17"/>
    <line x1="17" y1="7" x2="22" y2="7"/>
  </svg>`;

/** Renders 1–5 star widget; interactive only when status === 'Done' */
function renderStars(item) {
  const disabled = item.status !== 'Done';
  return `
    <div class="star-rating" role="group" aria-label="Rating: ${item.rating} out of 5 stars">
      ${[1,2,3,4,5].map(n => `
        <button
          type="button"
          class="star-btn ${n <= item.rating ? 'filled' : ''}"
          data-id="${item.id}"
          data-star="${n}"
          aria-label="${n} star${n > 1 ? 's' : ''}"
          aria-pressed="${n <= item.rating}"
          ${disabled ? 'disabled' : ''}
          title="${disabled ? 'Available after status is set to Done' : `Rate ${n} star${n > 1 ? 's' : ''}`}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
               fill="${n <= item.rating ? 'currentColor' : 'none'}"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>`).join('')}
    </div>`;
}

/**
 * Renders the progress bar section — only shown when status === 'In Progress'
 * and progress > 0.
 */
function renderProgressBar(item) {
  if (item.status !== 'In Progress' || item.progress <= 0) return '';
  const pct = Math.min(100, Math.max(0, item.progress));
  const label = item.progressLabel ? escapeHtml(item.progressLabel) : `${pct}%`;
  return `
    <div class="progress-bar-wrapper" role="progressbar"
         aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
         aria-label="Progress: ${pct}%">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="progress-bar-label">${label} · ${pct}%</span>
    </div>`;
}

/** Renders an item card HTML string */
function renderCard(item) {
  const cls       = statusClass(item.status);
  const coverType = item.type === 'Book' ? 'book' : 'movie';
  const coverIcon = item.type === 'Book' ? BOOK_ICON : MOVIE_ICON;

  // Favorite button — filled heart when favorited
  const favFill  = item.favorite ? 'currentColor' : 'none';
  const favClass = item.favorite ? 'fav-btn active' : 'fav-btn';
  const favTitle = item.favorite ? 'Remove from favorites' : 'Add to favorites';

  return `
    <article class="item-card" aria-label="${escapeHtml(item.title)}" data-id="${item.id}">
      <!-- Cover block -->
      <div class="cover-block ${coverType}" aria-hidden="true">${coverIcon}</div>

      <!-- Main content -->
      <div class="flex flex-col flex-1 p-4 gap-1.5 min-w-0">
        <!-- Title row + actions -->
        <div class="flex items-start justify-between gap-2">
          <h2 class="text-sm font-bold text-slate-800 leading-snug flex-1 truncate">${escapeHtml(item.title)}</h2>
          <!-- Action buttons -->
          <div class="flex gap-0.5 flex-shrink-0">
            <!-- Favorite toggle -->
            <button
              class="${favClass}"
              data-action="favorite" data-id="${item.id}"
              aria-label="${favTitle} — ${escapeHtml(item.title)}"
              aria-pressed="${item.favorite}"
              title="${favTitle}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                   fill="${favFill}" stroke="currentColor" stroke-width="2.2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <!-- Edit -->
            <button
              class="p-1.5 rounded-lg text-slate-300 hover:text-primary hover:bg-sky-soft transition"
              data-action="edit" data-id="${item.id}"
              aria-label="Edit ${escapeHtml(item.title)}"
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <!-- Delete -->
            <button
              class="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
              data-action="delete" data-id="${item.id}"
              aria-label="Delete ${escapeHtml(item.title)}"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>

        <!-- Type badge + Genre badge + Status select -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <!-- Pastel type badge: lavender for Book, mint for Movie -->
          <span class="${item.type === 'Book' ? 'type-badge-book' : 'type-badge-movie'}">${item.type}</span>
          <!-- Genre tag — only shown if set -->
          ${item.genre ? `<span class="genre-badge">${escapeHtml(item.genre)}</span>` : ''}
          <!-- Inline status changer -->
          <select
            class="status-select ${cls}"
            data-action="status" data-id="${item.id}"
            aria-label="Status for ${escapeHtml(item.title)}"
          >
            <option value="Up Next"     ${item.status === 'Up Next'     ? 'selected' : ''}>Up Next</option>
            <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Done"        ${item.status === 'Done'        ? 'selected' : ''}>Done</option>
          </select>
        </div>

        <!-- Progress bar (In Progress only) -->
        ${renderProgressBar(item)}

        <!-- Stars -->
        <div class="mt-0.5">
          ${renderStars(item)}
        </div>

        <!-- Note -->
        ${item.note ? `<p class="text-xs text-slate-400 leading-snug mt-0.5 line-clamp-2">${escapeHtml(item.note)}</p>` : ''}
      </div>
    </article>`;
}

/** Escape HTML special chars to prevent XSS */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ─────────────────────────────────────────────────────────
// 6. RENDER ITEMS  (filtered + sorted list)
// ─────────────────────────────────────────────────────────

/** Returns items filtered by all active state filters */
function getFilteredItems() {
  const q = state.search.trim().toLowerCase();
  return items.filter(item => {
    const matchStatus    = state.filterStatus === 'All' || item.status === state.filterStatus;
    const matchType      = state.filterType   === 'All' || item.type   === state.filterType;
    const matchSearch    = !q || item.title.toLowerCase().includes(q);
    const matchFavorites = !state.filterFavorites || item.favorite === true;
    return matchStatus && matchType && matchSearch && matchFavorites;
  });
}

/** Returns the filtered list sorted according to state.sortBy */
function getSortedFilteredItems() {
  const filtered = getFilteredItems();
  switch (state.sortBy) {
    case 'title':
      // A–Z, case-insensitive
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    case 'rating':
      // Highest first; items with no rating (0) go last
      return [...filtered].sort((a, b) => b.rating - a.rating);
    case 'date':
      // Newest (highest addedAt) first
      return [...filtered].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    default:
      // Insertion order (most recently added first — items are unshifted on add)
      return filtered;
  }
}

function renderItems() {
  const grid    = document.getElementById('items-grid');
  const countEl = document.getElementById('items-count');
  const sorted  = getSortedFilteredItems();

  // Update the item count label next to the view toggle
  if (countEl) {
    countEl.textContent = sorted.length
      ? `${sorted.length} item${sorted.length !== 1 ? 's' : ''}`
      : '';
  }

  if (!sorted.length) {
    const isListEmpty = items.length === 0;
    grid.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
          ${isListEmpty
            ? '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
            : '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'}
        </svg>
        <p class="text-base font-semibold text-slate-400">
          ${isListEmpty ? 'Your list is empty' : 'No results found'}
        </p>
        <p class="text-sm text-slate-300 mt-1">
          ${isListEmpty
            ? 'Press "Add Item" to start tracking your stories.'
            : 'Try adjusting your filters or search term.'}
        </p>
      </div>`;
    return;
  }

  grid.innerHTML = sorted.map(renderCard).join('');
}

// ─────────────────────────────────────────────────────────
// 7. FILTER BUTTONS, SORT & SEARCH
// ─────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['All', 'Up Next', 'In Progress', 'Done'];
const TYPE_OPTIONS   = ['All', 'Book', 'Movie'];

function renderFilterButtons() {
  const statusContainer = document.getElementById('filter-status');
  const typeContainer   = document.getElementById('filter-type');

  statusContainer.innerHTML = STATUS_OPTIONS.map(s => `
    <button
      type="button"
      class="filter-pill ${state.filterStatus === s ? 'active' : ''}"
      data-filter-status="${s}"
      aria-pressed="${state.filterStatus === s}"
    >${s}</button>`).join('');

  typeContainer.innerHTML = TYPE_OPTIONS.map(t => `
    <button
      type="button"
      class="filter-pill ${state.filterType === t ? 'active' : ''}"
      data-filter-type="${t}"
      aria-pressed="${state.filterType === t}"
    >${t === 'Book' ? '📚 Book' : t === 'Movie' ? '🎬 Movie' : t}</button>`).join('');

  // Update favorites pill active state
  const favBtn = document.getElementById('btn-favorites');
  if (favBtn) {
    favBtn.classList.toggle('active', state.filterFavorites);
    favBtn.setAttribute('aria-pressed', state.filterFavorites);
    // Fill the heart icon when active
    const heartPath = favBtn.querySelector('svg path');
    if (heartPath) {
      heartPath.setAttribute('fill', state.filterFavorites ? 'currentColor' : 'none');
    }
  }

  // Keep sort select in sync with state
  const sortSel = document.getElementById('sort-select');
  if (sortSel) sortSel.value = state.sortBy;
}

function applyFilters() {
  renderFilterButtons();
  renderItems();
  renderStats();
}

// ─────────────────────────────────────────────────────────
// 8. MODAL — Add / Edit
// ─────────────────────────────────────────────────────────
const modal              = document.getElementById('modal');
const modalTitle         = document.getElementById('modal-title');
const form               = document.getElementById('item-form');
const editIdInput        = document.getElementById('edit-id');
const titleInput         = document.getElementById('form-title');
const typeInput          = document.getElementById('form-type');
const statusInput        = document.getElementById('form-status');
const noteInput          = document.getElementById('form-note');
const titleErr           = document.getElementById('form-title-err');
const formSubmit         = document.getElementById('form-submit');
const genreInput         = document.getElementById('form-genre');         // NEW
const progressLabelInput = document.getElementById('form-progress-label'); // NEW
const progressValueInput = document.getElementById('form-progress-value'); // NEW
const progressGroup      = document.getElementById('form-progress-group'); // NEW

/** Show/hide the progress fields based on selected status */
function syncProgressGroupVisibility() {
  if (!progressGroup) return;
  if (statusInput.value === 'In Progress') {
    progressGroup.classList.remove('hidden');
  } else {
    progressGroup.classList.add('hidden');
  }
}

function openModal(item = null) {
  form.reset();
  titleErr.classList.add('hidden');

  if (item) {
    modalTitle.textContent        = 'Edit Item';
    formSubmit.textContent        = 'Save Changes';
    editIdInput.value             = item.id;
    titleInput.value              = item.title;
    typeInput.value               = item.type;
    statusInput.value             = item.status;
    noteInput.value               = item.note;
    if (genreInput)         genreInput.value         = item.genre         || '';
    if (progressLabelInput) progressLabelInput.value = item.progressLabel || '';
    if (progressValueInput) progressValueInput.value = item.progress > 0 ? item.progress : '';
  } else {
    modalTitle.textContent  = 'Add Item';
    formSubmit.textContent  = 'Save Item';
    editIdInput.value       = '';
  }

  syncProgressGroupVisibility();
  modal.classList.remove('hidden');
  titleInput.focus();
}

function closeModal() {
  modal.classList.add('hidden');
}

function handleFormSubmit(e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  if (!title) {
    titleErr.classList.remove('hidden');
    titleInput.focus();
    return;
  }
  titleErr.classList.add('hidden');

  const id     = editIdInput.value;
  const type   = typeInput.value;
  const status = statusInput.value;
  const note   = noteInput.value.trim();
  const genre  = genreInput ? genreInput.value.trim() : '';

  // Progress — only relevant for In Progress items
  let progress      = 0;
  let progressLabel = '';
  if (status === 'In Progress' && progressValueInput) {
    const rawPct = parseInt(progressValueInput.value, 10);
    progress      = isNaN(rawPct) ? 0 : Math.min(100, Math.max(0, rawPct));
    progressLabel = progressLabelInput ? progressLabelInput.value.trim() : '';
  }

  if (id) {
    // Edit existing
    const idx = items.findIndex(i => i.id === id);
    if (idx > -1) {
      // Clear rating if moving away from Done
      const isNowNotDone = status !== 'Done';
      const wasNotDone   = items[idx].status !== 'Done';
      const rating = (wasNotDone || isNowNotDone) ? 0 : items[idx].rating;
      items[idx] = {
        ...items[idx],
        title, type, status, note, genre, rating,
        progress, progressLabel,
      };
    }
  } else {
    // Add new — prepend so it appears first
    items.unshift({
      id: generateId(),
      title, type, status, note, genre,
      rating: 0,
      favorite: false,
      progress,
      progressLabel,
      addedAt: Date.now(),
    });
  }

  saveItems();
  closeModal();
  applyFilters();
}

// ─────────────────────────────────────────────────────────
// 9. CONFIRM DELETE DIALOG
// ─────────────────────────────────────────────────────────
const confirmDialog  = document.getElementById('confirm-dialog');
const confirmDelete  = document.getElementById('confirm-delete');
const confirmCancel  = document.getElementById('confirm-cancel');
let pendingDeleteId  = null;

function openConfirm(id) {
  pendingDeleteId = id;
  confirmDialog.classList.remove('hidden');
  confirmCancel.focus();
}

function closeConfirm() {
  pendingDeleteId = null;
  confirmDialog.classList.add('hidden');
}

function handleConfirmDelete() {
  if (pendingDeleteId) {
    items = items.filter(i => i.id !== pendingDeleteId);
    saveItems();
    applyFilters();
  }
  closeConfirm();
}

// ─────────────────────────────────────────────────────────
// 10. EVENT WIRING
// ─────────────────────────────────────────────────────────

/** Add button */
document.getElementById('btn-add').addEventListener('click', () => openModal());

/** Modal close / backdrop click */
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', closeModal);

/** Form submit */
form.addEventListener('submit', handleFormSubmit);

/** Show/hide progress group when status changes in the form */
if (statusInput) {
  statusInput.addEventListener('change', syncProgressGroupVisibility);
}

/** Reset Filters (now also resets sort and favorites) */
document.getElementById('btn-reset').addEventListener('click', () => {
  state.filterStatus    = 'All';
  state.filterType      = 'All';
  state.filterFavorites = false;
  state.sortBy          = 'default';
  state.search          = '';
  document.getElementById('search-input').value = '';
  const sortSel = document.getElementById('sort-select');
  if (sortSel) sortSel.value = 'default';
  applyFilters();
});

/** Search input (real-time) */
document.getElementById('search-input').addEventListener('input', e => {
  state.search = e.target.value;
  renderItems();
});

/** Sort selector */
const sortSelectEl = document.getElementById('sort-select');
if (sortSelectEl) {
  sortSelectEl.addEventListener('change', e => {
    state.sortBy = e.target.value;
    renderItems();
  });
}

/** Filter pills — Status */
document.getElementById('filter-status').addEventListener('click', e => {
  const btn = e.target.closest('[data-filter-status]');
  if (!btn) return;
  state.filterStatus = btn.dataset.filterStatus;
  applyFilters();
});

/** Filter pills — Type */
document.getElementById('filter-type').addEventListener('click', e => {
  const btn = e.target.closest('[data-filter-type]');
  if (!btn) return;
  state.filterType = btn.dataset.filterType;
  applyFilters();
});

/** Favorites filter pill */
const favFilterBtn = document.getElementById('btn-favorites');
if (favFilterBtn) {
  favFilterBtn.addEventListener('click', () => {
    state.filterFavorites = !state.filterFavorites;
    applyFilters();
  });
}

/** Item grid — edit, delete, inline status, star rating, favorite toggle (event delegation) */
document.getElementById('items-grid').addEventListener('click', e => {
  // Favorite toggle
  const favBtn = e.target.closest('[data-action="favorite"]');
  if (favBtn) {
    const item = items.find(i => i.id === favBtn.dataset.id);
    if (item) {
      item.favorite = !item.favorite;
      saveItems();
      applyFilters();
    }
    return;
  }

  // Edit button
  const editBtn = e.target.closest('[data-action="edit"]');
  if (editBtn) {
    const item = items.find(i => i.id === editBtn.dataset.id);
    if (item) openModal(item);
    return;
  }

  // Delete button
  const deleteBtn = e.target.closest('[data-action="delete"]');
  if (deleteBtn) {
    openConfirm(deleteBtn.dataset.id);
    return;
  }

  // Star rating button
  const starBtn = e.target.closest('[data-star]');
  if (starBtn && !starBtn.disabled) {
    const id   = starBtn.dataset.id;
    const star = parseInt(starBtn.dataset.star, 10);
    const item = items.find(i => i.id === id);
    if (item && item.status === 'Done') {
      // Clicking the same star again clears the rating
      item.rating = item.rating === star ? 0 : star;
      saveItems();
      applyFilters();
    }
    return;
  }
});

/** Inline status change on card (event delegation via 'change') */
document.getElementById('items-grid').addEventListener('change', e => {
  const sel = e.target.closest('[data-action="status"]');
  if (!sel) return;
  const item = items.find(i => i.id === sel.dataset.id);
  if (!item) return;
  const newStatus = sel.value;
  // Clear rating if moving away from Done
  if (item.status === 'Done' && newStatus !== 'Done') {
    item.rating = 0;
  }
  // Clear progress if moving away from In Progress
  if (item.status === 'In Progress' && newStatus !== 'In Progress') {
    item.progress      = 0;
    item.progressLabel = '';
  }
  item.status = newStatus;
  saveItems();
  applyFilters();
});

/** Confirm dialog buttons */
confirmDelete.addEventListener('click', handleConfirmDelete);
confirmCancel.addEventListener('click', closeConfirm);
document.getElementById('confirm-dialog').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeConfirm();
});

/** Keyboard: Escape closes any open overlay */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!modal.classList.contains('hidden'))          closeModal();
  if (!confirmDialog.classList.contains('hidden'))  closeConfirm();
});

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
(function init() {
  loadItems();     // load existing data (empty array on first visit)
  maybeSeed();     // writes seed to localStorage AND sets items[] if first visit
  renderFilterButtons();
  renderStats();
  renderItems();
})();

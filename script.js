/****************************************************
 * Frosty Formal — Front-End Script
 * - Snowflakes
 * - Invitee helpers + RSVP
 * - Polls (drinks)
 * - Song & Superlative suggestions
 * - "Who’s Coming" list
 * - Meet the Team shuffle
 ****************************************************/

/* ========= CONFIG: URLs & PRICE ========= */

const RSVP_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwILdtiAkM0VQsWEQp58Lb-gnt4EnKbvXlXHg2hDUEPc9nkPQSdrzHUL1xWb1-2s-kc/exec';

const POLL_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbzSD5BFroBXQONN0cZ6CspmIOQ-Md6DvISSbEvo0QryX3FcNkZsbzN3SiEdsCRSKh2J/exec';

// Polls + Suggestions share the same Apps Script
const SUGGESTIONS_WEBAPP_URL   = POLL_WEBAPP_URL;

// Ticket price (normal, after sale)
const TICKET_PRICE = 45;


/* ========= SMALL HELPER(S) ========= */

// tiny HTML-escape helper (used by suggestion + attendee lists)
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ========= SNOWFLAKES ========= */

function createSnowflakes() {
  const snowLayer = document.getElementById('snow-layer');
  if (!snowLayer) return;

  const flakes = 60;
  for (let i = 0; i < flakes; i++) {
    const dot = document.createElement('div');
    const size = 1 + Math.random() * 3;

    dot.style.position = 'fixed';
    dot.style.top = (-10 - Math.random() * 40) + 'vh';
    dot.style.left = Math.random() * 100 + '%';
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.background = 'rgba(255,255,255,0.9)';
    dot.style.borderRadius = '50%';
    dot.style.pointerEvents = 'none';
    dot.style.zIndex = 1;
    dot.style.opacity = 0.7 + Math.random() * 0.3;

    const duration = 7 + Math.random() * 8;
    const delay = Math.random() * duration;

    dot.style.animation = `fall ${duration}s linear infinite`;
    dot.style.animationDelay = `-${delay}s`;

    snowLayer.appendChild(dot);
  }
}

// Inject keyframes for fall animation once
(() => {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes fall {
      0%   { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(120vh); opacity: 0.85; }
    }
  `;
  document.head.appendChild(styleEl);
})();


/* ========= INVITEE / PLUS-ONE HELPERS ========= */

function normalizeName(str) {
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findInviteeByName(fullName) {
  const norm = normalizeName(fullName);
  if (!norm) return null;

  const list = (typeof INVITEES !== 'undefined' && Array.isArray(INVITEES))
    ? INVITEES
    : [];

  return (
    list.find(p => normalizeName(p.first + ' ' + p.last) === norm) || null
  );
}

function getGroupMembers(invitee) {
  if (!invitee || !invitee.group) return [];

  const list = (typeof INVITEES !== 'undefined' && Array.isArray(INVITEES))
    ? INVITEES
    : [];

  return list.filter(p =>
    p.group === invitee.group &&
    normalizeName(p.first + ' ' + p.last) !== normalizeName(invitee.first + ' ' + invitee.last)
  );
}

function populateInviteeDatalist() {
  const dataList = document.getElementById('inviteeNames');
  if (!dataList) return;

  const list = (typeof INVITEES !== 'undefined' && Array.isArray(INVITEES))
    ? INVITEES
    : [];

  dataList.innerHTML = '';
  list.forEach(p => {
    const option = document.createElement('option');
    option.value = `${p.first} ${p.last}`;
    dataList.appendChild(option);
  });
}

function syncGuestCountWithPlusOne() {
  const plusOneInput = document.getElementById('plusOneName');
  const guestCountEl = document.getElementById('guestCount');
  const attendingEl = document.getElementById('attending');
  if (!plusOneInput || !guestCountEl) return;

  const hasPlusOne = plusOneInput.value.trim().length > 0;

  if (hasPlusOne && (!attendingEl || attendingEl.value !== 'no')) {
    guestCountEl.value = '2';
  } else if (!hasPlusOne) {
    guestCountEl.value = '1';
  }

  updateVenmoAmount();
}

function setupPlusOneSuggestion() {
  const nameInput = document.getElementById('inviteeName');
  const plusOneInput = document.getElementById('plusOneName');
  if (!nameInput || !plusOneInput) return;

  function autoFillPlusOne(existingInvitee) {
    const me = existingInvitee || findInviteeByName(nameInput.value);
    if (!me) return;

    const others = getGroupMembers(me);
    if (others.length === 1 && !plusOneInput.value.trim()) {
      const partner = others[0];
      plusOneInput.value = `${partner.first} ${partner.last}`;
      syncGuestCountWithPlusOne();
    }
  }

  nameInput.addEventListener('blur', () => {
    autoFillPlusOne();
  });

  nameInput.addEventListener('change', () => {
    autoFillPlusOne();
  });

  nameInput.addEventListener('input', () => {
    const me = findInviteeByName(nameInput.value);
    if (me) autoFillPlusOne(me);
  });

  plusOneInput.addEventListener('input', () => {
    syncGuestCountWithPlusOne();
  });
}


/* ========= VENMO AMOUNT ========= */

function updateVenmoAmount() {
  const attendingEl  = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');
  const amountEl     = document.getElementById('venmo-amount');
  if (!attendingEl || !guestCountEl || !amountEl) return;

  const attending = attendingEl.value;
  const count = parseInt(guestCountEl.value || '1', 10) || 1;

  // Default is $0
  let amount = 0;

  // Only charge if they are attending
  if (attending === 'yes') {
    amount = TICKET_PRICE * count;
  }

  amountEl.textContent = `$${amount}`;
}


/* ========= RSVP + BANNER ========= */

let rsvpBannerTimer = null;

function getOrCreateRsvpBanner() {
  let banner = document.getElementById('rsvp-banner');
  if (banner) return banner;

  const card = document.querySelector('.rsvp-card');
  if (!card) return null;

  banner = document.createElement('div');
  banner.id = 'rsvp-banner';
  banner.className = 'rsvp-banner';
  banner.textContent = '';
  card.appendChild(banner);
  return banner;
}

function showRsvpBanner(message, isError) {
  const banner = getOrCreateRsvpBanner();
  if (!banner) return;

  banner.textContent = message || (isError
    ? 'Something went wrong. Please try again.'
    : 'RSVP received!');

  banner.classList.remove('rsvp-banner--error', 'rsvp-banner--success');
  banner.classList.add(isError ? 'rsvp-banner--error' : 'rsvp-banner--success');
  banner.classList.add('rsvp-banner--show');

  if (rsvpBannerTimer) {
    clearTimeout(rsvpBannerTimer);
  }
  rsvpBannerTimer = setTimeout(() => {
    banner.classList.remove('rsvp-banner--show');
  }, 20000); // ~20 seconds
}

function setupRSVP() {
  const form = document.getElementById('rsvp-form');
  const msg = document.getElementById('rsvp-message');

  const nameEl = document.getElementById('inviteeName');
  const plusOneEl = document.getElementById('plusOneName');
  const emailEl =
    document.getElementById('email') ||
    document.getElementById('inviteeEmail') ||
    document.getElementById('rsvp-email') ||
    document.querySelector('input[type="email"]');
  const attendingEl = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');
  const notesEl = document.getElementById('notes');

  if (!form || !msg) return;

  if (attendingEl) attendingEl.addEventListener('change', updateVenmoAmount);
  if (guestCountEl) guestCountEl.addEventListener('change', updateVenmoAmount);
  updateVenmoAmount();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameEl ? nameEl.value.trim() : '';
    const plusOne = plusOneEl ? plusOneEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const attending = attendingEl ? attendingEl.value : 'yes';
    const guestCount = guestCountEl ? Number(guestCountEl.value || 1) : 1;
    const notes = notesEl ? notesEl.value.trim() : '';

    msg.textContent = '';
    msg.classList.remove('error');

    if (!name || !email) {
      msg.classList.add('error');
      msg.textContent = 'Please enter your name and email before submitting.';
      showRsvpBanner(
        'Please enter your name and email before submitting.',
        true
      );
      return;
    }

        // OPTIONAL: still try to look them up if they're on the list
    // (so your plus-one auto-fill + any future logic can use it),
    // but DO NOT block people who aren't on the INVITEES list anymore.
    const inviteeRecord = findInviteeByName(name);
    msg.classList.remove('error');


    const amount = attending === 'no' ? 0 : TICKET_PRICE * guestCount;

    const payload = {
      name,
      plusOne,
      email,
      attending,
      guestCount,
      amount,
      notes
    };

    console.log('[RSVP] payload going to Apps Script:', payload);

    const params = new URLSearchParams({
      data: JSON.stringify(payload)
    });

    // Fire-and-forget; response is not readable in no-cors
    fetch(`${RSVP_APPS_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error('[RSVP] fetch error:', err);
    });

    const namesLabel = plusOne ? `${name} + ${plusOne}` : name;

    if (attending === 'no') {
      showRsvpBanner(
        'RSVP received! We will miss you this time, but hope to see you next time 💙',
        false
      );
      msg.innerHTML =
        '<strong>RSVP received!</strong> We will miss you this time.';
    } else {
      showRsvpBanner(
        `YAY! RSVP received for ${namesLabel}. We’re so excited you’re coming!`,
        false
      );
      msg.innerHTML =
        `<strong>YAY! RSVP received for ${namesLabel}.</strong> We’re so excited you’re coming!`;
    }

    form.reset();
    if (guestCountEl) guestCountEl.value = '1';
    if (attendingEl) attendingEl.value = 'yes';
    updateVenmoAmount();

    // Refresh the "Who’s Coming" list shortly after
    setTimeout(refreshAttendeeList, 2000);
  });
}


/* ========= WHO'S COMING LIST (from RSVP SHEET) ========= */

async function refreshAttendeeList() {
  const ul = document.getElementById('attending-list');
  if (!ul) return;

  ul.innerHTML = '<li style="opacity:0.7;">Loading RSVPs…</li>';

  try {
    const params = new URLSearchParams({ mode: 'listAttendees' });
    const res = await fetch(`${RSVP_APPS_SCRIPT_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Network error: ' + res.status);
    }

    const data = await res.json();
    if (!data || !data.ok || !Array.isArray(data.attendees)) {
      throw new Error('Bad data format');
    }

    const attendees = data.attendees;
    if (!attendees.length) {
      ul.innerHTML =
        '<li style="opacity:0.7;">No RSVPs yet — you could be the first!</li>';
      return;
    }

    ul.innerHTML = attendees
      .map(name => `<li>${escapeHtml(name)}</li>`)
      .join('');
  } catch (err) {
    console.error('[ATTENDEES] Error loading list:', err);
    ul.innerHTML =
      '<li style="opacity:0.7;">Unable to load RSVPs right now.</li>';
  }
}


/* ========= MEET THE TEAM ========= */

const TEAM_MEMBERS = [
  { name: 'Gabby Sunseri', photo: 'gabby.jpeg', alt: 'Gabby Sunseri' },
  { name: 'Jon Lamb', photo: 'jon.jpeg', alt: 'Jon Lamb' },
  { name: 'Gio Ramirez', photo: 'gio.jpeg', alt: 'Gio Ramirez' },
  {
    name: 'Caity and Cole',
    photo: 'caitycole.jpeg',
    alt: 'Caity and Cole',
    linkLabel: 'Shake It Up NC',
    linkHref: 'https://shakeitupnc.com/'
  },
  { name: 'Kyle Warzecha', photo: 'kyle.jpeg', alt: 'Kyle Warzecha' }
];

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderTeamGrid() {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  const shuffled = shuffleArray(TEAM_MEMBERS);
  grid.innerHTML = shuffled.map(m => `
    <div class="team-member">
      <img class="team-photo" src="${m.photo}" alt="${m.alt}">
      <div class="team-name">${m.name}</div>
      ${
        m.linkHref
          ? `<a class="team-link" href="${m.linkHref}" target="_blank" rel="noopener">
               ${m.linkLabel || 'Visit website'}
             </a>`
          : ''
      }
    </div>
  `).join('');
}

function setupTeamToggle() {
  const btn = document.getElementById('team-toggle');
  const section = document.getElementById('team-collapsible');
  if (!btn || !section) return;

  btn.addEventListener('click', () => {
    section.classList.toggle('open');
  });
}


/* ========= SONG & SUPERLATIVE SUGGESTIONS ========= */

function renderSuggestionList(listId, items) {
  const ul = document.getElementById(listId);
  if (!ul) return;

  if (!items || !items.length) {
    ul.innerHTML =
      '<li style="opacity:0.7;">No submissions yet — be the first!</li>';
    return;
  }

  ul.innerHTML = items
    .map(text => `<li>${escapeHtml(text)}</li>`)
    .join('');
}

function refreshSuggestions() {
  const params = new URLSearchParams({ type: 'getSuggestions' });

  fetch(`${SUGGESTIONS_WEBAPP_URL}?${params.toString()}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.ok || !data.suggestions) return;
      const { songs = [], superlatives = [] } = data.suggestions;

      // newest first (assuming sheet appends at bottom)
      renderSuggestionList(
        'song-list',
        songs.slice().reverse()
      );
      renderSuggestionList(
        'superlative-list',
        superlatives.slice().reverse()
      );
    })
    .catch(err => {
      console.error('Error fetching suggestions:', err);
    });
}

function setupSuggestionForms() {
  attachSuggestionForm(
    'song-form',
    'song-input',
    'song',
    'song-list'
  );
  attachSuggestionForm(
    'superlative-form',
    'superlative-input',
    'superlative',
    'superlative-list'
  );
}

function attachSuggestionForm(formId, inputId, category, listId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!form || !input) return;

  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;

    // optimistic: show immediately at the top of the list
    if (list) {
      const li = document.createElement('li');
      li.textContent = text;
      list.insertBefore(li, list.firstChild || null);
    }

    input.value = '';
    input.disabled = true;
    if (button) button.disabled = true;

    const params = new URLSearchParams({
      type: 'addSuggestion',
      category,
      text
    });

    fetch(`${SUGGESTIONS_WEBAPP_URL}?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (!data || !data.ok) {
          console.error('Suggestion not saved:', data);
          return;
        }
        // sync with sheet after a short delay
        setTimeout(refreshSuggestions, 2000);
      })
      .catch(err => {
        console.error('Error adding suggestion:', err);
      })
      .finally(() => {
        input.disabled = false;
        if (button) button.disabled = false;
      });
  });
}
function setupSuperlativeVoting() {
  const form = document.getElementById('supervote-form');
  if (!form) return;

  const statusEl = document.getElementById('supervote-status');

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();

    // reset status
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.style.color = '#6b7aa8';
    }

    // Read values from the form (these rely on the "name" attributes)
    const voterName        = (form.voterName?.value || '').trim();
    const mostHonest       = (form.mostHonest?.value || '').trim();
    const aceKingQueen     = (form.aceKingQueen?.value || '').trim();
    const sneakiestCutShot = (form.sneakiestCutShot?.value || '').trim();
    const bestHypeMachine  = (form.bestHypeMachine?.value || '').trim();
    const alwaysPrepared   = (form.alwaysPrepared?.value || '').trim();

    // Require a name
    if (!voterName) {
      if (statusEl) {
        statusEl.textContent =
          'Please enter your name so we can count your ballot.';
        statusEl.style.color = '#b81f2f';
      }
      return;
    }

    // Require at least one vote
    const anyChoice =
      mostHonest ||
      aceKingQueen ||
      sneakiestCutShot ||
      bestHypeMachine ||
      alwaysPrepared;

    if (!anyChoice) {
      if (statusEl) {
        statusEl.textContent =
          'Please vote for at least one category (you can leave others blank).';
        statusEl.style.color = '#b81f2f';
      }
      return;
    }

    try {
      // Send as GET query params to the same web app as the polls
      const params = new URLSearchParams({
        mode: 'superVote',
        voterName,
        mostHonest,
        aceKingQueen,
        sneakiestCutShot,
        bestHypeMachine,
        alwaysPrepared
      });

      const res = await fetch(`${POLL_WEBAPP_URL}?${params.toString()}`);
      const json = await res.json();

      if (json && json.ok) {
        form.reset();
        if (statusEl) {
          statusEl.textContent =
            'Thank you! Your votes have been recorded. ❤️';
          statusEl.style.color = '#143047';
        }
      } else {
        throw new Error(json && json.error ? json.error : 'Unknown error');
      }
    } catch (err) {
      console.error('Superlative voting error:', err);
      if (statusEl) {
        statusEl.textContent =
          'Sorry — something went wrong saving your votes. Please try again later.';
        statusEl.style.color = '#b81f2f';
      }
    }
  });
}


/* ========= POLLS (DRINKS) ========= */

function sendPollVoteToServer(pollId, option, previousOption) {
  if (!POLL_WEBAPP_URL) return;

  try {
    const params = new URLSearchParams({
      mode: 'vote',
      pollId,
      option,
      previousOption: previousOption || ''
    });

    fetch(`${POLL_WEBAPP_URL}?${params.toString()}`)
      .catch(err => console.error('[POLL] vote fetch error:', err));
  } catch (err) {
    console.error('[POLL] building vote request error:', err);
  }
}

function refreshPollResultsFromServer() {
  if (!POLL_WEBAPP_URL) return;

  const params = new URLSearchParams({ mode: 'results' });

  fetch(`${POLL_WEBAPP_URL}?${params.toString()}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.ok || !data.counts) return;

      const counts = data.counts; // { beer: { "Blue Moon": 3, ... }, ... }

      Object.keys(counts).forEach(pollId => {
        const pollEl = document.querySelector(`.poll[data-poll-id="${pollId}"]`);
        if (!pollEl) return;

        const pollMap = counts[pollId] || {};
        pollEl.querySelectorAll('.poll-option').forEach(btn => {
          const opt = btn.getAttribute('data-option');
          if (!opt) return;
          const span = btn.querySelector('[data-option-count]');
          if (!span) return;
          const value = pollMap[opt] || 0;
          span.textContent = String(value);
        });
      });
    })
    .catch(err => {
      console.error('[POLL] results fetch error:', err);
    });
}

function initPolls() {
  const STORAGE_KEY = 'frostyPollSelections';

  function loadSelections() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveSelections(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  const selections = loadSelections();
  document.querySelectorAll('.poll').forEach(pollEl => {
    const pollId = pollEl.getAttribute('data-poll-id');
    const savedOption = selections[pollId];
    if (!savedOption) return;

    pollEl.querySelectorAll('.poll-option').forEach(btn => {
      const opt = btn.getAttribute('data-option');
      btn.classList.toggle('selected', opt === savedOption);
    });
  });

  document.querySelectorAll('.poll-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const pollEl = btn.closest('.poll');
      if (!pollEl) return;

      const pollId = pollEl.getAttribute('data-poll-id');
      const option = btn.getAttribute('data-option');
      if (!pollId || !option) return;

      const selectionsNow = loadSelections();
      const previousOption = selectionsNow[pollId] || null;

      if (previousOption === option) {
        return; // already voted for this
      }

      const allButtons = Array.from(
        pollEl.querySelectorAll('.poll-option')
      );

      function findButtonFor(opt) {
        return allButtons.find(
          b => b.getAttribute('data-option') === opt
        );
      }

      function adjustCount(button, delta) {
        if (!button) return;
        const span = button.querySelector('[data-option-count]');
        if (!span) return;
        const current = parseInt(span.textContent || '0', 10) || 0;
        let next = current + delta;
        if (next < 0) next = 0;
        span.textContent = String(next);
      }

      if (previousOption) {
        const prevBtn = findButtonFor(previousOption);
        adjustCount(prevBtn, -1);
      }

      adjustCount(btn, 1);

      allButtons.forEach(b => {
        b.classList.toggle('selected', b === btn);
      });

      selectionsNow[pollId] = option;
      saveSelections(selectionsNow);
      sendPollVoteToServer(pollId, option, previousOption);

      setTimeout(() => {
        refreshPollResultsFromServer();
      }, 800);
    });
  });

  refreshPollResultsFromServer();
  setInterval(refreshPollResultsFromServer, 15000);
}


/* ========= DOM READY ========= */

document.addEventListener('DOMContentLoaded', () => {
  createSnowflakes();
  populateInviteeDatalist();
  setupPlusOneSuggestion();
  setupRSVP();
  renderTeamGrid();
  setupTeamToggle();

  // polls
  initPolls();

  // suggestions
  refreshSuggestions();
  setupSuggestionForms();

    // superlative voting
  setupSuperlativeVoting(); 
  
  // "who's coming"
  refreshAttendeeList();
  setInterval(refreshAttendeeList, 30000); // refresh every 30s
});

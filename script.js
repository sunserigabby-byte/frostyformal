// ============ Snowflakes (small background snow) ============
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

// === Global URLs ===
const RSVP_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwILdtiAkM0VQsWEQp58Lb-gnt4EnKbvXlXHg2hDUEPc9nkPQSdrzHUL1xWb1-2s-kc/exec';

const POLL_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbzSD5BFroBXQONN0cZ6CspmIOQ-Md6DvISSbEvo0QryX3FcNkZsbzN3SiEdsCRSKh2J/exec';

const SUGGESTIONS_WEBAPP_URL = POLL_WEBAPP_URL;

// ============ Build datalist for invitee suggestions ============
function populateInviteeDatalist() {
  const dataList = document.getElementById('inviteeNames');
  if (!dataList) return;

  const list = (typeof INVITEES !== "undefined" && Array.isArray(INVITEES))
    ? INVITEES
    : [];

  dataList.innerHTML = "";
  list.forEach(p => {
    const option = document.createElement('option');
    option.value = `${p.first} ${p.last}`;
    dataList.appendChild(option);
  });
}

// ============ Helper functions for invitees ============
function normalizeName(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findInviteeByName(fullName) {
  const norm = normalizeName(fullName);
  if (!norm) return null;

  const list = (typeof INVITEES !== "undefined" && Array.isArray(INVITEES))
    ? INVITEES
    : [];

  return list.find(p =>
    normalizeName(p.first + " " + p.last) === norm
  ) || null;
}

function getGroupMembers(invitee) {
  if (!invitee || !invitee.group) return [];

  const list = (typeof INVITEES !== "undefined" && Array.isArray(INVITEES))
    ? INVITEES
    : [];

  return list.filter(p =>
    p.group === invitee.group &&
    normalizeName(p.first + " " + p.last) !== normalizeName(invitee.first + " " + invitee.last)
  );
}

// ---- Ticket price: Black Friday sale vs normal ----
function getCurrentTicketPrice() {
  // Black Friday sale window in Eastern Time
  // Start: 12:00am Nov 28, 2025   End: 11:59pm (midnight to the 29th)
  const saleStart = new Date('2025-11-28T00:00:00-05:00');
  const saleEnd   = new Date('2025-11-29T00:00:00-05:00');

  const now = new Date();

  if (now >= saleStart && now < saleEnd) {
    return 35;   // 🎉 Black Friday price
  }
  return 45;     // normal price
}

function updateSaleBanner() {
  const banner = document.getElementById('sale-banner');
  if (!banner) return;

  const price = getCurrentTicketPrice();
  if (price === 35) {
    banner.textContent = 'Black Friday Special: Tickets are $35 today only (normally $45)!';
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}


function updateVenmoAmount() {
  const attendingEl   = document.getElementById('attending');
  const guestCountEl  = document.getElementById('guestCount');
  const amountEl      = document.getElementById('venmo-amount');

  // These two are optional dynamic labels in the HTML (step 3)
  const perPersonHint = document.getElementById('per-person-hint');
  const priceLabel    = document.getElementById('ticket-price-label');

  if (!attendingEl || !guestCountEl || !amountEl) return;

  const attending = attendingEl.value;
  const count     = parseInt(guestCountEl.value || '1', 10) || 1;

  const price = getCurrentTicketPrice();  // 👈 35 today, 45 otherwise

  // Update any visible text labels to show the current price
  if (priceLabel) {
    priceLabel.textContent = `$${price}`;
  }
  if (perPersonHint) {
    perPersonHint.textContent = `$${price} per person — suggested total shows below.`;
  }

  // Update the Venmo total
  if (attending === 'no') {
    amountEl.textContent = '$0';
  } else {
    amountEl.textContent = `$${price * count}`;
  }
}


// ============ Sync guest count with plus one ============
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

// ============ Plus-one auto-suggestion using group IDs ============
function setupPlusOneSuggestion() {
  const nameInput = document.getElementById('inviteeName');
  const plusOneInput = document.getElementById('plusOneName');
  if (!nameInput || !plusOneInput) return;

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
}

// ============ RSVP form behavior (invite-only + Sheet logging) ============
function setupRSVP() {
  const form = document.getElementById('rsvp-form');
  const msg  = document.getElementById('rsvp-message');

  if (!form || !msg) return;

  // Inputs
  const nameEl      = document.getElementById('inviteeName');
  const plusOneEl   = document.getElementById('plusOneName');
  const emailEl     =
    document.getElementById('email') ||
    document.getElementById('inviteeEmail') ||
    document.getElementById('rsvp-email') ||
    document.querySelector('input[type="email"]');
  const attendingEl  = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');
  const notesEl      = document.getElementById('notes');

  // Keep Venmo amount in sync
  if (attendingEl) attendingEl.addEventListener('change', updateVenmoAmount);
  if (guestCountEl) guestCountEl.addEventListener('change', updateVenmoAmount);
  updateVenmoAmount();

  // --- helper: show floating banner for ~20 seconds ---
  function showRsvpBanner(messageHtml, isError) {
    if (!msg) return;

    msg.innerHTML = messageHtml || '';
    msg.classList.toggle('error', !!isError);
    msg.classList.add('rsvp-visible');

    // clear any previous timer
    if (msg._hideTimer) {
      clearTimeout(msg._hideTimer);
    }

    msg._hideTimer = setTimeout(() => {
      msg.classList.remove('rsvp-visible');
      msg.classList.remove('error');
      msg.innerHTML = '';
    }, 20000); // 20 seconds
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name       = nameEl      ? nameEl.value.trim()      : '';
    const plusOne    = plusOneEl   ? plusOneEl.value.trim()   : '';
    const email      = emailEl     ? emailEl.value.trim()     : '';
    const attending  = attendingEl ? attendingEl.value        : 'yes';
    const guestCount = guestCountEl ? Number(guestCountEl.value || 1) : 1;
    const notes      = notesEl     ? notesEl.value.trim()     : '';

    // Basic required fields
    if (!name || !email) {
      showRsvpBanner(
        'Please enter your name and email before submitting.',
        true
      );
      return;
    }

    // Invite-only guard: must be on INVITEES list
    const inviteeRecord = findInviteeByName(name);
    if (!inviteeRecord) {
      showRsvpBanner(
        'We sadly do not have you on our list. ' +
        'If you believe there has been a mistake (or maybe we spelled your name wrong 🙁), email us at ' +
        '<strong>kickoff2christmas25@gmail.com</strong>.',
        true
      );
      return;
    }

    // Calculate amount (0 if not attending)
    const amount = (attending === 'no') ? 0 : 45 * guestCount;

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

    // Send RSVP to Google Apps Script (no-cors)
    fetch(`${RSVP_APPS_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error('[RSVP] fetch error:', err);
    });

    // --- Front-end confirmation message ---

    const namesLabel = plusOne ? `${name} + ${plusOne}` : name;

    if (attending === 'no') {
      showRsvpBanner(
        '<strong>RSVP received!</strong><br>' +
        'Thanks for letting us know – we will miss you. ' +
        'Hopefully see you next time!<br>' +
        'Check your email for a survey to help us for next time.',
        false
      );
    } else {
      showRsvpBanner(
        `<strong>YAY! RSVP received for ${namesLabel}.</strong><br>` +
        `We&apos;re so excited you&apos;re coming! ` +
        'Check your email for a message from us 🙂',
        false
      );
    }

    // Reset form & amount back to default
    form.reset();
    if (guestCountEl) guestCountEl.value = '1';
    if (attendingEl) attendingEl.value = 'yes';
    updateVenmoAmount();
  });
}



// ============ Meet the Team ============
const TEAM_MEMBERS = [
  { name: 'Gabby Sunseri', photo: 'gabby.jpeg', alt: 'Gabby Sunseri' },
  { name: 'Jon Lamb', photo: 'jon.jpeg', alt: 'Jon Lamb' },
  { name: 'Gio Ramirez', photo: 'gio.jpeg', alt: 'Gio Ramirez' },
  {
    name: "Caity and Cole",
    photo: "caitycole.jpeg",
    alt: "Caity and Cole",
    linkLabel: "Shake It Up NC",
    linkHref: "https://shakeitupnc.com/"
  },
  { name: 'Kyle Warzecha', photo: 'kyle.jpeg', alt: 'Kyle Warzecha' },
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
  const grid = document.getElementById("team-grid");
  if (!grid) return;

  const shuffled = shuffleArray(TEAM_MEMBERS);
  grid.innerHTML = shuffled.map(m => `
    <div class="team-member">
      <img class="team-photo" src="${m.photo}" alt="${m.alt}">
      <div class="team-name">${m.name}</div>
      ${
        m.linkHref
          ? `<a class="team-link" href="${m.linkHref}" target="_blank" rel="noopener">
               ${m.linkLabel || "Visit website"}
             </a>`
          : ""
      }
    </div>
  `).join("");
}

function setupTeamToggle() {
  const btn = document.getElementById("team-toggle");
  const section = document.getElementById("team-collapsible");
  if (!btn || !section) return;

  btn.addEventListener("click", () => {
    section.classList.toggle("open");
  });
}

/************ SONG & SUPERLATIVE SUGGESTIONS ************/

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSuggestionList(listId, items) {
  const ul = document.getElementById(listId);
  if (!ul) return;

  if (!items || !items.length) {
    ul.innerHTML = '<li data-placeholder="1" style="opacity:0.7;">No submissions yet — be the first!</li>';
    return;
  }

  ul.innerHTML = items
    .map(text => `<li>${escapeHtml(text)}</li>`)
    .join('');
}
// Add a new suggestion immediately to the list in the UI
function addSuggestionLocally(kind, text) {
  const listId = kind === 'song' ? 'song-list' : 'superlative-list';
  const ul = document.getElementById(listId);
  if (!ul) return;

  // Remove "no submissions yet" placeholder if present
  const first = ul.firstElementChild;
  if (first && first.dataset && first.dataset.placeholder === '1') {
    ul.removeChild(first);
  }

  const li = document.createElement('li');
  li.textContent = text;          // safe; no HTML injection
  ul.insertBefore(li, ul.firstChild);             // or insertBefore(li, ul.firstChild) to show newest on top
}

// GET existing suggestions from Apps Script
function refreshSuggestions() {
  const params = new URLSearchParams({ type: "getSuggestions" });

  fetch(`${SUGGESTIONS_WEBAPP_URL}?${params.toString()}`)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.ok || !data.suggestions) return;

      const { songs = [], superlatives = [] } = data.suggestions;

      // Newest items (bottom of the sheet) should show at the TOP of the list
      const songsNewestFirst        = songs.slice().reverse();
      const superlativesNewestFirst = superlatives.slice().reverse();

      renderSuggestionList("song-list", songsNewestFirst);
      renderSuggestionList("superlative-list", superlativesNewestFirst);
    })
    .catch(err => {
      console.error("Error fetching suggestions:", err);
    });
}


function wireSuggestionForms() {
  const songForm = document.getElementById("song-form");
  const songInput = document.getElementById("song-input");
  const superForm = document.getElementById("superlative-form");
  const superInput = document.getElementById("superlative-input");

  function attach(form, input, category) {
    if (!form || !input) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = (input.value || "").trim();
      if (!text) return;

      // 1) Instant UI update (no waiting on Apps Script)
      addSuggestionLocally(category, text);
      input.value = "";

      // 2) Fire-and-forget request to Apps Script in the background
      const params = new URLSearchParams({
        type: "addSuggestion",
        category,  // "song" or "superlative"
        text
      });

      fetch(`${SUGGESTIONS_WEBAPP_URL}?${params.toString()}`)
        .then(res => {
          // If we get a valid JSON response, we can sync with the sheet
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data && data.ok) {
            // Optional: sync from sheet (not required for the "fast" feel)
            refreshSuggestions();
          }
        })
        .catch(err => {
          console.error("Error adding suggestion:", err);
          // UI already shows their entry, so we don’t block them
        });
    });
  }

  attach(songForm, songInput, "song");
  attach(superForm, superInput, "superlative");
}


/************ POLLS ************/

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

      const counts = data.counts; // { beer: { 'Blue Moon': 3, ... }, mule: {...}, ... }

      Object.keys(counts).forEach(pollId => {
        const pollEl = document.querySelector(`.poll[data-poll-id="${pollId}"]`);
        if (!pollEl) return;

        const pollMap = counts[pollId];

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
        return;
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

// ============ DOM READY ============
document.addEventListener("DOMContentLoaded", () => {
  createSnowflakes();
  populateInviteeDatalist();
  setupPlusOneSuggestion();
  setupRSVP();
  updateSaleBanner();
  updateVenmoAmount(); 
  renderTeamGrid();
  setupTeamToggle();

  initPolls();

  refreshSuggestions();
  wireSuggestionForms();
});

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

// Polls backend URL – from your Apps Script deployment
const POLL_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzSD5BFroBXQONN0cZ6CspmIOQ-Md6DvISSbEvo0QryX3FcNkZsbzN3SiEdsCRSKh2J/exec'; //

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

// ============ Venmo amount logic ============
function updateVenmoAmount() {
  const attendingEl = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');
  const amountEl = document.getElementById('venmo-amount');
  if (!attendingEl || !guestCountEl || !amountEl) return;

  const attending = attendingEl.value;
  const count = parseInt(guestCountEl.value || '1', 10) || 1;

  if (attending === 'no') {
    amountEl.textContent = '$0';
  } else {
    amountEl.textContent = `$${45 * count}`;
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

  // When they finish choosing their name (blur)
  nameInput.addEventListener('blur', () => {
    autoFillPlusOne();
  });

  // Also when they select from datalist / change value
  nameInput.addEventListener('change', () => {
    autoFillPlusOne();
  });

  // As they type, if it matches exactly one invitee
  nameInput.addEventListener('input', () => {
    const me = findInviteeByName(nameInput.value);
    if (me) autoFillPlusOne(me);
  });

  // If they manually edit plus one, sync guest count
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

  // Inputs
  const nameEl      = document.getElementById('inviteeName');   // name field
  const plusOneEl   = document.getElementById('plusOneName');   // plus-one field
  const emailEl     =
    document.getElementById('email') ||
    document.getElementById('inviteeEmail') ||
    document.getElementById('rsvp-email') ||
    document.querySelector('input[type="email"]');              // fallback
  const attendingEl  = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');
  const notesEl      = document.getElementById('notes');        // optional; ok if null

  if (!form || !msg) return;

  // Keep Venmo amount in sync
  if (attendingEl) attendingEl.addEventListener('change', updateVenmoAmount);
  if (guestCountEl) guestCountEl.addEventListener('change', updateVenmoAmount);
  updateVenmoAmount();

  form.addEventListener('submit', (e) => {
    e.preventDefault(); // stop page refresh

    const name       = nameEl      ? nameEl.value.trim()      : '';
    const plusOne    = plusOneEl   ? plusOneEl.value.trim()   : '';
    const email      = emailEl     ? emailEl.value.trim()     : '';
    const attending  = attendingEl ? attendingEl.value        : 'yes';
    const guestCount = guestCountEl ? Number(guestCountEl.value || 1) : 1;
    const notes      = notesEl     ? notesEl.value.trim()     : '';

    // Basic required fields
    if (!name || !email) {
      msg.classList.add('error');
      msg.textContent = 'Please enter your name and email before submitting.';
      return;
    }

    // Invite-only guard: must be on INVITEES list
    const inviteeRecord = findInviteeByName(name);
    if (!inviteeRecord) {
      msg.classList.add('error');
      msg.textContent =
        'We sadly do not have you on our list. If you believe there has been a mistake, email us at kickoff2christmas@gmail.com';
      return;
    }
    msg.classList.remove('error');

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

    // === Send to Google Apps Script (GET + no-cors) ===
    const APPS_SCRIPT_URL =
      'https://script.google.com/macros/s/AKfycbwILdtiAkM0VQsWEQp58Lb-gnt4EnKbvXlXHg2hDUEPc9nkPQSdrzHUL1xWb1-2s-kc/exec'; // keep your current URL if different

    const params = new URLSearchParams({
      data: JSON.stringify(payload)
    });

    fetch(`${APPS_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error('[RSVP] fetch error:', err);
    });

    // --- Front-end confirmation message ---
    const namesLabel = plusOne ? `${name} + ${plusOne}` : name;

    if (attending === 'no') {
      // ❌ RSVP = NO message
      msg.innerHTML = `
        <strong>RSVP received!</strong><br>
        Thanks for letting us know – we will miss you. Hopefully see you next time!<br>
        Check your email for a survey to help us for next time.
      `;
    } else {
      // ✅ RSVP = YES message
      msg.innerHTML = `
        <strong>YAY! RSVP received for ${namesLabel}.</strong><br>
        We're so excited you're coming! Check your email for a message from us :)
      `;
    }

    // Reset form & amount back to default
    form.reset();
    if (guestCountEl) guestCountEl.value = '1';
    if (attendingEl) attendingEl.value = 'yes';
    updateVenmoAmount();
  });
}

// ============ Meet the Team (randomized grid + toggle) ============

// Add your real people + photo paths here when ready:
const TEAM_MEMBERS = [
  // Example:
  // { name: 'Gabby Sunseri', photo: 'images/gabby.jpg' },
  // { name: 'Kyle Warzecha', photo: 'images/kyle.jpg' },
  { name: 'Gabby Sunseri', photo: 'gabby.jpeg' },
  { name: 'Jon Lamb', photo: 'jon.jpeg' },
  { name: 'Gio Ramirez', photo: 'gio.jpeg' },
   {
    name: "Caity and Cole",
    photo: "caitycole.jpeg",
    alt: "Caity and Cole",
    linkLabel: "Shake It Up NC",
    linkHref: "https://shakeitupnc.com/"
  },
  { name: 'Kyle Warzecha', photo: 'kyle.jpeg' },
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

/************ POLLS ************/

function initPolls() {
  if (!POLL_WEBAPP_URL) return;

  const polls = document.querySelectorAll('.poll[data-poll-id]');
  if (!polls.length) return;

  polls.forEach(pollEl => {
    const pollId = pollEl.dataset.pollId;
    const buttons = pollEl.querySelectorAll('.poll-option');

    // Attach click handlers
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const option = btn.dataset.option;
        submitVote(pollId, option, pollEl);
      });
    });

    // Load current results
    fetchPollResults(pollId, pollEl);

    // Restore "selected" state from localStorage if present
    const stored = localStorage.getItem('frosty_poll_' + pollId);
    if (stored) {
      const match = pollEl.querySelector(
        `.poll-option[data-option="${CSS.escape(stored)}"]`
      );
      if (match) match.classList.add('selected');
    }
  });
}

function submitVote(pollId, option, pollEl) {
  const payload = { pollId, option };

  fetch(
    `${POLL_WEBAPP_URL}?mode=vote&data=${encodeURIComponent(
      JSON.stringify(payload)
    )}`
  )
    .then(r => r.json())
    .then(data => {
      if (!data || data.result !== 'success') return;
      renderPollTotals(pollEl, data.totals);

      // Highlight selected + remember in localStorage
      pollEl.querySelectorAll('.poll-option').forEach(btn =>
        btn.classList.toggle('selected', btn.dataset.option === option)
      );
      localStorage.setItem('frosty_poll_' + pollId, option);
    })
    .catch(err => {
      console.error('Poll vote error', err);
    });
}

function fetchPollResults(pollId, pollEl) {
  const payload = { pollId };

  fetch(
    `${POLL_WEBAPP_URL}?mode=results&data=${encodeURIComponent(
      JSON.stringify(payload)
    )}`
  )
    .then(r => r.json())
    .then(data => {
      if (!data || data.result !== 'success') return;
      renderPollTotals(pollEl, data.totals);
    })
    .catch(err => {
      console.error('Poll results error', err);
    });
}

function renderPollTotals(pollEl, totals) {
  const countSpans = pollEl.querySelectorAll('[data-option-count]');

  countSpans.forEach(span => {
    const option = span.closest('.poll-option').dataset.option;
    const value = totals && Object.prototype.hasOwnProperty.call(totals, option)
      ? totals[option]
      : 0;
    span.textContent = value;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  createSnowflakes();
  populateInviteeDatalist();
  setupPlusOneSuggestion();
  setupRSVP();

  renderTeamGrid();
  setupTeamToggle();
  initPolls();
});

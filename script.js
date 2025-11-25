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

  if (!form || !msg) return;

  // Keep Venmo amount in sync
  if (attendingEl) attendingEl.addEventListener('change', updateVenmoAmount);
  if (guestCountEl) guestCountEl.addEventListener('change', updateVenmoAmount);
  updateVenmoAmount();

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
      msg.innerHTML = `
        <strong>RSVP received!</strong><br>
        Thanks for letting us know – we will miss you. Hopefully see you next time!<br>
        Check your email for a survey to help us for next time.
      `;
    } else {
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

/************ POLLS ************/

function sendPollVoteToServer(pollId, option, previousOption) {
  if (!POLL_WEBAPP_URL) return;

  try {
    const payload = { pollId, option, previousOption };
    const params = new URLSearchParams({
      data: JSON.stringify(payload)
    });

    fetch(`${POLL_WEBAPP_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error('[POLL] fetch error:', err);
    });
  } catch (err) {
    console.error('[POLL] building request error:', err);
  }
}

// One vote per poll per device, instant UI update
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

  // Apply saved selections on load
  const selections = loadSelections();
  document.querySelectorAll('.poll').forEach(pollEl => {
    const pollId = pollEl.getAttribute('data-poll-id');
    const savedOption = selections[pollId];
    if (!savedOption) return;

    pollEl.querySelectorAll('.poll-option').forEach(btn => {
      const opt = btn.getAttribute('data-option');
      if (opt === savedOption) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  });

  // Click handler: enforce one vote per poll, update counts immediately
  document.querySelectorAll('.poll-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const pollEl = btn.closest('.poll');
      if (!pollEl) return;

      const pollId = pollEl.getAttribute('data-poll-id');
      const option = btn.getAttribute('data-option');
      if (!pollId || !option) return;

      const selectionsNow = loadSelections();
      const previousOption = selectionsNow[pollId] || null;

      // If they click the same option again, do nothing
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

      // Decrement the previous choice (if any)
      if (previousOption) {
        const prevBtn = findButtonFor(previousOption);
        adjustCount(prevBtn, -1);
      }

      // Increment the new choice
      adjustCount(btn, 1);

      // Visually mark the selected option
      allButtons.forEach(b => {
        b.classList.toggle('selected', b === btn);
      });

      // Save and send to server
      selectionsNow[pollId] = option;
      saveSelections(selectionsNow);
      sendPollVoteToServer(pollId, option, previousOption);
    });
  });
}

// ============ DOM READY ============
document.addEventListener("DOMContentLoaded", () => {
  createSnowflakes();
  populateInviteeDatalist();
  setupPlusOneSuggestion();
  setupRSVP();

  renderTeamGrid();
  setupTeamToggle();
  initPolls();
});

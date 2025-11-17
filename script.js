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
  const msg = document.getElementById('rsvp-message');

  // Inputs
  const nameEl     = document.getElementById('inviteeName');   // name field
  const plusOneEl  = document.getElementById('plusOneName');   // plus-one field
  const emailEl    =
    document.getElementById('email') ||
    document.getElementById('inviteeEmail') ||
    document.getElementById('rsvp-email') ||
    document.querySelector('input[type="email"]');             // fallback
  const attendingEl  = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');
  const notesEl      = document.getElementById('notes');       // optional; ok if null

  if (!form || !msg) return;

  // Keep Venmo amount in sync
  if (attendingEl) attendingEl.addEventListener('change', updateVenmoAmount);
  if (guestCountEl) guestCountEl.addEventListener('change', updateVenmoAmount);
  updateVenmoAmount();

  form.addEventListener('submit', (e) => {
    e.preventDefault(); // stop page refresh

    const name      = nameEl    ? nameEl.value.trim()    : '';
    const plusOne   = plusOneEl ? plusOneEl.value.trim() : '';
    const email     = emailEl   ? emailEl.value.trim()   : '';
    const attending = attendingEl ? attendingEl.value : 'yes';
    const guestCount = guestCountEl ? Number(guestCountEl.value || 1) : 1;
    const notes     = notesEl   ? notesEl.value.trim()   : '';

    // Basic required fields
    if (!name || !email) {
      msg.textContent = 'Please enter your name and email before submitting.';
      msg.classList.add('error');
      return;
    }

    // ✅ INVITE-ONLY CHECK: make sure name is on the invite list
    const me = findInviteeByName(name);
    if (!me) {
      msg.textContent =
        "We couldn't find your name on the invite list. This event is invite-only. " +
        "If you believe this is a mistake, please email us: kickoff2christmas@gmail.com.";
      msg.classList.add('error');
      return;
    }

    // Passed validation – clear error state
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
      'https://script.google.com/macros/s/AKfycbwILdtiAkM0VQsWEQp58Lb-gnt4EnKbvXlXHg2hDUEPc9nkPQSdrzHUL1xWb1-2s-kc/exec'; // your web app URL

    const params = new URLSearchParams({
      data: JSON.stringify(payload)
    });

    console.log('[RSVP] sending to Apps Script via GET', APPS_SCRIPT_URL);

    fetch(`${APPS_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors'
    }).catch(err => {
      console.error('[RSVP] fetch error:', err);
    });

    // --- Front-end confirmation ---
    let text = `YAY! RSVP received for ${name}`;
    if (plusOne) text += ` + ${plusOne}`;
    if (attending === 'no') {
      text += `. Thanks for letting us know — we’ll miss you! Hopefully we will see you next time!`;
    } else {
      text += `. If you change your mind, you can RSVP again through out website and Venmo $${amount} to @Kyle-Warzecha to confirm your spot.`;
      text += ` We would love your thoughts on our event / why you may not be attending! We know this may not be everyone's idea of fun, but we hope to make it better next time! If you have a moment, please fill our this anonymous survey: https://forms.gle/MTLCKoYo5FW9drS27 `;
    }
    msg.textContent = text;

    // Reset form
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

document.addEventListener("DOMContentLoaded", () => {
  createSnowflakes();
  populateInviteeDatalist();
  setupPlusOneSuggestion();
  setupRSVP();

  renderTeamGrid();
  setupTeamToggle();
});

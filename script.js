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

  nameInput.addEventListener('blur', () => {
    const me = findInviteeByName(nameInput.value);
    if (!me) return;

    const others = getGroupMembers(me);
    if (others.length === 1 && !plusOneInput.value.trim()) {
      const partner = others[0];
      plusOneInput.value = `${partner.first} ${partner.last}`;
      syncGuestCountWithPlusOne();
    }
  });

  plusOneInput.addEventListener('input', () => {
    syncGuestCountWithPlusOne();
  });
}

// ============ RSVP form behavior (invite-only) ============

function setupRSVP() {
  const form = document.getElementById('rsvp-form');
  const msg = document.getElementById('rsvp-message');
  const attendingEl = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');

  if (!form || !msg) return;

  if (attendingEl) attendingEl.addEventListener('change', updateVenmoAmount);
  if (guestCountEl) guestCountEl.addEventListener('change', updateVenmoAmount);
  updateVenmoAmount();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.classList.remove('error');
    msg.textContent = '';

    const name = (document.getElementById('inviteeName').value || '').trim();
    const plusOne = (document.getElementById('plusOneName').value || '').trim();
    const email = (document.getElementById('email')?.value || '').trim();
    const attending = attendingEl ? attendingEl.value : 'yes';
    const guestCount = parseInt(guestCountEl?.value || '1', 10) || 1;
    const notes = (document.getElementById('notes')?.value || '').trim();

    if (!name) {
      msg.textContent = 'Please enter your name.';
      msg.classList.add('error');
      return;
    }

    const invitee = findInviteeByName(name);
    if (!invitee) {
      msg.textContent = 'This RSVP form is for invited guests only. If you believe this is an error, please contact us.';
      msg.classList.add('error');
      return;
    }

    if (plusOne) {
      const plusInvitee = findInviteeByName(plusOne);
      if (plusInvitee && invitee.group && plusInvitee.group && plusInvitee.group !== invitee.group) {
        msg.textContent = 'Note: the plus one you entered is not in the same group on our list. We will review this manually.';
      }
    }

    if (attending === 'no') {
      msg.textContent = `Sorry you can't make it, ${name}. Your response has been recorded.`;
      form.reset();
      if (guestCountEl) guestCountEl.value = '1';
      if (attendingEl) attendingEl.value = 'yes';
      updateVenmoAmount();
      return;
    }

    const amount = 45 * guestCount;

    const payload = {
      name,
      plusOne,
      email,
      attending,
      guestCount,
      amount,
      notes
    };

    // Hook for Google Sheets / backend can go here

    let text = `RSVP received for ${name}`;
    if (plusOne) text += ` + ${plusOne}`;
    text += `. Please Venmo $${amount} to @kyle-Warzecha or use the Venmo button above to confirm your spot.`;
    msg.textContent = text;

    form.reset();
    if (guestCountEl) guestCountEl.value = '1';
    if (attendingEl) attendingEl.value = 'yes';
    updateVenmoAmount();
  });
}

fetch('https://script.google.com/macros/s/AKfycbzLdMHKFiNTnoATzof_59O4zhYOuTVdkyK0Be4DaqNeyy_IWCbd_ZDdJSFQ0JfdK4k/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(res => res.json())
  .then(() => {
    console.log('RSVP saved to Google Sheet!');
  })
  .catch(err => console.error('Error:', err));

// ============ Init ============

document.addEventListener('DOMContentLoaded', () => {
  createSnowflakes();
  populateInviteeDatalist();
  setupPlusOneSuggestion();
  setupRSVP();
});

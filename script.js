/***********************
 *  FROSTY FORMAL JS   *
 ***********************/

/* =============================
   1) Small background snow
   ============================= */
function createSnowflakes() {
  const snowLayer = document.getElementById('snow-layer');
  if (!snowLayer) return;

  const flakes = 60; // adjust density
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

    const duration = 7 + Math.random() * 8; // 7–15s
    const delay = Math.random() * duration;

    dot.style.animation = `fall ${duration}s linear infinite`;
    dot.style.animationDelay = `-${delay}s`;

    snowLayer.appendChild(dot);
  }
}

// Inject keyframes for snowflake fall
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

/* ======================================
   2) Invitee datalist (expects INVITEES)
   ====================================== */
function populateInviteeDatalist() {
  const dataList = document.getElementById('inviteeNames');
  if (!dataList) return;

  const list = (typeof INVITEES !== 'undefined' && Array.isArray(INVITEES)) ? INVITEES : [];

  dataList.innerHTML = '';
  list.forEach(p => {
    const option = document.createElement('option');
    option.value = `${p.first} ${p.last}`;
    dataList.appendChild(option);
  });
}

/* ==========================
   3) Invitee helper methods
   ========================== */
function normalizeName(str) {
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findInviteeByName(fullName) {
  const norm = normalizeName(fullName);
  if (!norm) return null;

  const list = (typeof INVITEES !== 'undefined' && Array.isArray(INVITEES)) ? INVITEES : [];
  return list.find(p => normalizeName(p.first + ' ' + p.last) === norm) || null;
}

function getGroupMembers(invitee) {
  if (!invitee || !invitee.group) return [];
  const list = (typeof INVITEES !== 'undefined' && Array.isArray(INVITEES)) ? INVITEES : [];
  return list.filter(p =>
    p.group === invitee.group &&
    normalizeName(p.first + ' ' + p.last) !== normalizeName(invitee.first + ' ' + invitee.last)
  );
}

/* ==========================
   4) Amount / Venmo display
   ========================== */
function updateVenmoAmount() {
  const attendingEl = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');
  const amountEl = document.getElementById('venmo-amount');
  if (!attendingEl || !guestCountEl || !amountEl) return;

  const attending = attendingEl.value;
  const count = parseInt(guestCountEl.value || '1', 10) || 1;

  amountEl.textContent = (attending === 'no') ? '$0' : `$${45 * count}`;
}

/* ==========================================
   5) Keep guest count in sync with plus one
   ========================================== */
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

/* ==========================================
   6) Auto-fill plus one using group matches
   ========================================== */
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

  nameInput.addEventListener('blur', () => autoFillPlusOne());
  nameInput.addEventListener('change', () => autoFillPlusOne());
  nameInput.addEventListener('input', () => {
    const me = findInviteeByName(nameInput.value);
    if (me) autoFillPlusOne(me);
  });

  plusOneInput.addEventListener('input', () => {
    syncGuestCountWithPlusOne();
  });
}

/* =======================================
   7) Calendar helpers (Google + .ics dl)
   ======================================= */
function toUTCStampZ(dateLocal) {
  // Convert a local Date (ET) to a UTC "YYYYMMDDTHHMMSSZ" string
  const u = new Date(dateLocal.getTime() - dateLocal.getTimezoneOffset() * 60000);
  const Y = u.getUTCFullYear();
  const M = String(u.getUTCMonth() + 1).padStart(2, '0');
  const D = String(u.getUTCDate()).padStart(2, '0');
  const h = String(u.getUTCHours()).padStart(2, '0');
  const m = String(u.getUTCMinutes()).padStart(2, '0');
  const s = String(u.getUTCSeconds()).padStart(2, '0');
  return `${Y}${M}${D}T${h}${m}${s}Z`;
}

function buildGoogleCalLink() {
  // Jan 24, 2026 7:00–11:00 PM ET == Jan 25, 2026 00:00–04:00 UTC
  const startUTC = '20260125T000000Z';
  const endUTC   = '20260125T040000Z';

  const dates = `${startUTC}/${endUTC}`;
  const text = encodeURIComponent('Frosty Formal');
  const details = encodeURIComponent(
    'Open Bar (Shake It Up NC), DJ V1RAL, Photographer Justin Jenkins.\n' +
    'Venue: Garland Hall (East Durham) — https://www.garlandhalldurham.com/\n' +
    'Dress: Formal (suits & floor-length gowns)\n' +
    'Confirm via Venmo: @Kyle-Warzecha (https://account.venmo.com/u/Kyle-Warzecha)'
  );
  const location = encodeURIComponent('Garland Hall (East Durham)');

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&sf=true&output=xml`;
}


function downloadICSClient() {
  // Fixed UTC window for 7–11 PM ET
  const startUTC = '20260125T000000Z';
  const endUTC   = '20260125T040000Z';
  const dtstamp  = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');

  const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Frosty Formal//RSVP//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${(crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)}
DTSTAMP:${dtstamp}
DTSTART:${startUTC}
DTEND:${endUTC}
SUMMARY:Frosty Formal
LOCATION:Garland Hall (East Durham)
DESCRIPTION:Open Bar (Shake It Up NC), DJ V1RAL, Photographer Justin Jenkins.\\nVenue: https://www.garlandhalldurham.com/\\nDress: Formal\\nConfirm via Venmo: @Kyle-Warzecha
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FrostyFormal.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}



/* =====================================
   8) RSVP (invite-only + Google Sheets)
   ===================================== */
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

  const name = document.getElementById('inviteeName').value.trim();
  const plusOne = document.getElementById('plusOneName').value.trim();
  const email = document.getElementById('email').value.trim();
  const attending = document.getElementById('attending').value;
  const guestCount = parseInt(document.getElementById('guestCount').value) || 1;
  const notes = document.getElementById('notes').value.trim();
  const amount = 45 * guestCount;

  const payload = { name, plusOne, email, attending, guestCount, amount, notes };

  // === Apps Script call ===
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLdMHKFiNTnoATzof_59O4zhYOuTVdkyK0Be4DaqNeyy_IWCbd_ZDdJSFQ0JfdK4k/exec';
  const qs = 'data=' + encodeURIComponent(JSON.stringify(payload));
  const getUrl = APPS_SCRIPT_URL + '?' + qs;

  console.log('[RSVP] sending to Apps Script:', getUrl);

  fetch(getUrl)
    .then(r => r.text())
    .then(txt => {
      console.log('[RSVP] Apps Script response:', txt);
      const msg = document.getElementById('rsvp-message');
      if (msg) msg.textContent = `RSVP submitted! Check your email for confirmation.`;
    })
    .catch(err => {
      console.error('[RSVP] fetch error:', err);
      const msg = document.getElementById('rsvp-message');
      if (msg) msg.textContent = 'Error submitting RSVP. Please try again.';
    });

  // Optional: Reset form or update UI after submission
  form.reset();
});

    if (!name) {
      msg.textContent = 'Please enter your name.';
      msg.classList.add('error');
      return;
    }

    // Invite-only check
    const invitee = findInviteeByName(name);
    if (!invitee) {
      msg.textContent = 'This RSVP form is for invited guests only. If you believe this is an error, please contact us.';
      msg.classList.add('error');
      return;
    }

    // Optional: soft warning if plus one isn't same group
    if (plusOne) {
      const plusInvitee = findInviteeByName(plusOne);
      if (plusInvitee && invitee.group && plusInvitee.group && plusInvitee.group !== invitee.group) {
        msg.textContent = 'Note: the plus one you entered is not in the same group on our list. We will review this manually.';
      }
    }

    // Handle declines
    if (attending === 'no') {
      msg.innerHTML = `
        Sorry you can't make it, <strong>${name}</strong>. Your response has been recorded.<br>
        <button id="changeMind" style="
          margin-top:10px;padding:8px 14px;border-radius:8px;
          border:1px solid #ccd6ff;background:#eef3ff;cursor:pointer;">
          Changed your mind?
        </button>
      `;
      const btn = document.getElementById('changeMind');
      if (btn) {
        btn.addEventListener('click', () => {
          attendingEl.value = 'yes';
          updateVenmoAmount();
          document.getElementById('guestCount').focus();
          msg.textContent = '';
        });
      }
      // reset UI defaults
      form.reset();
      if (guestCountEl) guestCountEl.value = '1';
      if (attendingEl) attendingEl.value = 'yes';
      updateVenmoAmount();
      // Still send to sheet so you track declines
      const payloadNo = { name, plusOne, email, attending, guestCount, amount: 0, notes };
      sendToAppsScript(payloadNo);
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

    // Send to Google Apps Script (GET with ?data=… to your /exec URL)
    sendToAppsScript(payload);

    // On-page confirmation + calendar buttons
    const googleLink = buildGoogleCalLink();
    let text = `RSVP received for <strong>${name}</strong>`;
    if (plusOne) text += ` + <strong>${plusOne}</strong>`;
    text += `. Please Venmo <strong>$${amount}</strong> to <strong>@kyle-Warzecha</strong> to confirm.`;

    msg.innerHTML = `
      ${text}<br><br>
      <strong>Add to calendar:</strong>
      <a href="${googleLink}" target="_blank" class="btn-secondary" style="margin-right:8px;">Google Calendar</a>
      <button type="button" class="btn-secondary" onclick="downloadICSClient()">Download .ics</button>
    `;

    // Reset fields (keep defaults sane)
    form.reset();
    if (guestCountEl) guestCountEl.value = '1';
    if (attendingEl) attendingEl.value = 'yes';
    updateVenmoAmount();
  });
}

/* ======================================
   9) Send payload to Apps Script (GET)
   ====================================== */
function sendToAppsScript(payload) {
  const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbwILdtiAkM0VQsWEQp58Lb-gnt4EnKbvXlXHg2hDUEPc9nkPQSdrzHUL1xWb1-2s-kc/exec';
  const urlWithData = appsScriptUrl + '?data=' + encodeURIComponent(JSON.stringify(payload));

  fetch(urlWithData, {
    method: 'GET',
    mode: 'no-cors'
  })
    .then(() => {
      console.log('RSVP sent to Google Sheet via GET (no-cors).');
    })
    .catch(err => {
      console.error('Error saving to Google Sheet:', err);
    });
}

/* ======================
   10) Init on page load
   ====================== */
document.addEventListener('DOMContentLoaded', () => {
  createSnowflakes();
  populateInviteeDatalist();
  setupPlusOneSuggestion();
  setupRSVP();
});

/**
 * Simple frontend behavior:
 * - Generate soft snowfall
 * - Update Venmo amount when guest count changes
 * - Handle RSVP form submit (local only)
 */

function createSnowflakes() {
  const snowLayer = document.getElementById('snow-layer');
  if (!snowLayer) return;

  const flakes = 70;
  for (let i = 0; i < flakes; i++) {
    const span = document.createElement('span');
    span.style.position = 'fixed';
    span.style.top = '-4vh';
    span.style.width = (Math.random() < 0.3 ? 4 : 6) + 'px';
    span.style.height = span.style.width;
    span.style.background = '#ffffff';
    span.style.borderRadius = '50%';
    span.style.opacity = 0.6 + Math.random() * 0.4;
    span.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.6))';
    span.style.left = Math.random() * 100 + '%';
    const dur = 10 + Math.random() * 8;
    const delay = Math.random() * 5;
    const drift = (Math.random() * 40 - 20);
    span.style.setProperty('--drift', drift + 'px');
    span.style.animation = `fall ${dur}s linear infinite`;
    span.style.animationDelay = `-${delay}s`;
    snowLayer.appendChild(span);
  }
}

function updateAmount() {
  const countEl = document.getElementById('guestCount');
  const amountEl = document.getElementById('venmo-amount');
  if (!countEl || !amountEl) return;
  const count = parseInt(countEl.value || '1', 10);
  const total = 45 * (isNaN(count) ? 1 : count);
  amountEl.textContent = `$${total}`;
}

function setupRSVP() {
  const form = document.getElementById('rsvp-form');
  const msg = document.getElementById('rsvp-message');
  const countEl = document.getElementById('guestCount');
  const attendingEl = document.getElementById('attending');

  if (countEl) {
    countEl.addEventListener('change', updateAmount);
  }
  if (attendingEl) {
    attendingEl.addEventListener('change', updateAmount);
  }

  updateAmount();

  if (!form || !msg) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = (document.getElementById('inviteeName').value || '').trim();
    const plusOne = (document.getElementById('plusOneName').value || '').trim();
    const attending = document.getElementById('attending').value;
    const guestCount = parseInt(document.getElementById('guestCount').value || '1', 10);

    if (!name) {
      msg.textContent = 'Please enter your name.';
      msg.classList.add('error');
      return;
    }

    // This is where you would hook up a real backend or Google Sheet.
    // For now we just show a friendly confirmation message.
    if (attending === 'yes') {
      msg.classList.remove('error');
      msg.textContent =
        `RSVP received for ${name}` +
        (plusOne ? ` + ${plusOne}` : '') +
        `. Please Venmo $${45 * guestCount} to @kyle-Warzecha to confirm your spot.`;
    } else {
      msg.classList.remove('error');
      msg.textContent = `Sorry you can't make it, ${name}. Your response has been noted.`;
    }

    form.reset();
    document.getElementById('guestCount').value = '1';
    document.getElementById('attending').value = 'yes';
    updateAmount();
  });
}

document.addEventListener('DOMContentLoaded', function() {
  createSnowflakes();
  setupRSVP();
});

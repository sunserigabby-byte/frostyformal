// Create small falling snowflakes (performance-friendly)
function createSnowflakes() {
  const snowLayer = document.getElementById('snow-layer');
  if (!snowLayer) return;

  const flakes = 60; // adjust if you want denser or lighter
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

// Add keyframes for fall animation
const styleEl = document.createElement('style');
styleEl.textContent = `
@keyframes fall {
  0%   { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(120vh); opacity: 0.85; }
}
`;
document.head.appendChild(styleEl);

// RSVP logic
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

function setupRSVP() {
  const form = document.getElementById('rsvp-form');
  const msg = document.getElementById('rsvp-message');
  const attendingEl = document.getElementById('attending');
  const guestCountEl = document.getElementById('guestCount');

  if (attendingEl) attendingEl.addEventListener('change', updateVenmoAmount);
  if (guestCountEl) guestCountEl.addEventListener('change', updateVenmoAmount);
  updateVenmoAmount();

  if (!form || !msg) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.classList.remove('error');

    const name = (document.getElementById('inviteeName').value || '').trim();
    const plusOne = (document.getElementById('plusOneName').value || '').trim();
    const attending = document.getElementById('attending').value;
    const guestCount = parseInt(document.getElementById('guestCount').value || '1', 10) || 1;

    if (!name) {
      msg.textContent = 'Please enter your name.';
      msg.classList.add('error');
      return;
    }

    if (attending === 'no') {
      msg.textContent = `Sorry you can't make it, ${name}. Your response has been recorded.`;
      form.reset();
      document.getElementById('guestCount').value = '1';
      document.getElementById('attending').value = 'yes';
      updateVenmoAmount();
      return;
    }

    const total = 45 * guestCount;
    msg.textContent =
      `RSVP received for ${name}` +
      (plusOne ? ` + ${plusOne}` : '') +
      `. Please Venmo $${total} to @kyle-Warzecha to confirm your spot.`;
    form.reset();
    document.getElementById('guestCount').value = '1';
    document.getElementById('attending').value = 'yes';
    updateVenmoAmount();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  createSnowflakes();
  setupRSVP();
});

// Extra snowfall + RSVP logic

function createSnowflakes() {
  const snowLayer = document.getElementById('snow-layer');
  if (!snowLayer) return;

  const flakes = 60;
  for (let i = 0; i < flakes; i++) {
    const dot = document.createElement('span');
    dot.style.position = 'fixed';
    dot.style.top = '-4vh';
    const size = Math.random() < 0.4 ? 3 : 5;
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.background = '#ffffff';
    dot.style.borderRadius = '50%';
    dot.style.opacity = 0.55 + Math.random() * 0.4;
    dot.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.7))';
    dot.style.left = Math.random() * 100 + '%';

    const dur = 9 + Math.random() * 10;
    const delay = Math.random() * dur;

    dot.style.animation = `fall ${dur}s linear infinite`;
    dot.style.animationDelay = `-${delay}s`;

    snowLayer.appendChild(dot);
  }
}

// Falling animation for the JS-generated dots
// (this was missing before, which is why they didn't move)
const style = document.createElement('style');
style.textContent = `
@keyframes fall {
  0% {
    transform: translate3d(0, -10vh, 0);
    opacity: 1;
  }
  100% {
    transform: translate3d(0, 110vh, 0);
    opacity: 0.85;
  }
}`;
document.head.appendChild(style);

function updateAmount() {
  const countEl = document.getElementById('guestCount');
  const attendingEl = document.getElementById('attending');
  const amountEl = document.getElementById('venmo-amount');
  if (!countEl || !amountEl || !attendingEl) return;

  const attending = attendingEl.value;
  const count = parseInt(countEl.value || '1', 10) || 1;

  if (attending === 'no') {
    amountEl.textContent = '$0';
  } else {
    amountEl.textContent = '$' + (45 * count);
  }
}

function setupRSVP() {
  const form = document.getElementById('rsvp-form');
  const msg = document.getElementById('rsvp-message');
  const countEl = document.getElementById('guestCount');
  const attendingEl = document.getElementById('attending');

  if (countEl) countEl.addEventListener('change', updateAmount);
  if (attendingEl) attendingEl.addEventListener('change', updateAmount);
  updateAmount();

  if (!form || !msg) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = (document.getElementById('inviteeName').value || '').trim();
    const plusOne = (document.getElementById('plusOneName').value || '').trim();
    const attending = document.getElementById('attending').value;
    const guestCount = parseInt(document.getElementById('guestCount').value || '1', 10) || 1;

    if (!name) {
      msg.textContent = 'Please enter your name.';
      msg.classList.add('error');
      return;
    }

    if (attending === 'yes') {
      const total = 45 * guestCount;
      msg.classList.remove('error');
      msg.textContent =
        `RSVP received for ${name}` +
        (plusOne ? ` + ${plusOne}` : '') +
        `. Please Venmo $${total} to @kyle-Warzecha to confirm your spot.`;
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


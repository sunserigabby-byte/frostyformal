function createSnowflakes() {
  const snowLayer = document.getElementById('snow-layer');
  const flakes = 60; // fewer small flakes for performance
  for (let i = 0; i < flakes; i++) {
    const dot = document.createElement('div');
    dot.classList.add('smallflake');
    const size = Math.random() * 3 + 1;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.background = 'rgba(255,255,255,0.8)';
    dot.style.position = 'fixed';
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.top = `${Math.random() * -100}%`;
    dot.style.borderRadius = '50%';
    dot.style.zIndex = 1;
    const duration = 6 + Math.random() * 7;
    dot.style.animation = `fall ${duration}s linear infinite`;
    dot.style.animationDelay = `${Math.random() * 12}s`;
    snowLayer.appendChild(dot);
  }
}

const style = document.createElement('style');
style.innerHTML = `
@keyframes fall {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(110vh); opacity: 0.8; }
}
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
  createSnowflakes();

  const guestCount = document.getElementById('guestCount');
  const venmoAmount = document.getElementById('venmo-amount');
  guestCount.addEventListener('change', () => {
    const count = parseInt(guestCount.value);
    venmoAmount.textContent = `$${count * 45}`;
  });

  document.getElementById('rsvp-form').addEventListener('submit', e => {
    e.preventDefault();
    alert('RSVP submitted! Don’t forget to Venmo @kyle-Warzecha to confirm.');
  });
});


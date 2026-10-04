'use strict';

// Use an elapsed-time clock so background-tab throttling does not cause drift.
const initialTimeMs = (17 * 60 + 34) * 1000 + 520;
const fullTimeMs = 20 * 60 * 1000;
const timer = document.getElementById('countdown');
const progress = document.getElementById('timer-progress');
const progressTrack = progress.parentElement;
const startedAt = performance.now();
let countdownInterval;

function renderCountdown(remainingMs) {
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const hundredths = Math.floor((remainingMs % 1000) / 10);
  const pad = value => String(value).padStart(2, '0');
  timer.textContent = `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
  timer.setAttribute('aria-label', `Time remaining: ${minutes} minutes, ${seconds} seconds`);
  progress.style.width = `${(remainingMs / fullTimeMs) * 100}%`;
  progressTrack.setAttribute('aria-valuenow', String(Math.ceil(remainingMs / 1000)));
}

function updateCountdown() {
  const remainingMs = Math.max(0, initialTimeMs - (performance.now() - startedAt));
  renderCountdown(remainingMs);
  if (remainingMs === 0) {
    clearInterval(countdownInterval);
    document.querySelector('.live').textContent = 'TIME UP';
    document.getElementById('timer-status').textContent = 'Time is up. The countdown has ended.';
  }
}

renderCountdown(initialTimeMs);
countdownInterval = setInterval(updateCountdown, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateCountdown();
});

const navigationItems = [...document.querySelectorAll('.nav-item')];

function setActiveNavigation(hash) {
  navigationItems.forEach(item => {
    const active = item.hash === hash;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'location');
    else item.removeAttribute('aria-current');
  });
}

navigationItems.forEach(item => {
  item.addEventListener('click', () => setActiveNavigation(item.hash));
});

document.querySelector('.clock-card .button').addEventListener('click', () => {
  setActiveNavigation('#challenge');
});

function syncNavigationWithHash() {
  const hash = window.location.hash;
  setActiveNavigation(navigationItems.some(item => item.hash === hash) ? hash : '#home');
}

window.addEventListener('hashchange', syncNavigationWithHash);
syncNavigationWithHash();

// Admission is handled at the booth; this reveals instructions only.
const claimButton = document.getElementById('claim-button');
const claimDetails = document.getElementById('claim-details');
claimButton.addEventListener('click', () => {
  const expanded = claimButton.getAttribute('aria-expanded') === 'true';
  claimButton.setAttribute('aria-expanded', String(!expanded));
  claimDetails.hidden = expanded;
});

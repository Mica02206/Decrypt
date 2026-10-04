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

// Public key only. Database row-level policies enforce staff authorization.
const supabaseUrl = 'https://xzivwqdonvyodpvvjzui.supabase.co';
const supabaseKey = 'sb_publishable_hFzHyRQ5bjJpyIZl5eytag_c85HYwaV';
let squadRecords = [];
const rankingRows = document.getElementById('ranking-rows');
const rankingFeedback = document.getElementById('ranking-feedback');
function ordinalRank(value) {
  const lastTwo = value % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({1:'st',2:'nd',3:'rd'}[value % 10] || 'th');
  return `${value}${suffix}`;
}

function renderRankings() {
  squadRecords.sort((a, b) => a.seconds - b.seconds);
  rankingRows.replaceChildren();
  let place = 0;
  squadRecords.forEach((record, index) => {
    if (index === 0 || record.seconds !== squadRecords[index - 1].seconds) place = index + 1;
    const row = document.createElement('tr');
    row.dataset.place = String(place);
    const rank = document.createElement('td');
    rank.textContent = ordinalRank(place);
    const name = document.createElement('td');
    name.textContent = record.name;
    const time = document.createElement('td');
    const stopwatch = document.createElement('i');
    stopwatch.className = 'fa-solid fa-stopwatch';
    stopwatch.setAttribute('aria-hidden', 'true');
    time.append(stopwatch, ` ${String(Math.floor(record.seconds / 60)).padStart(2, '0')}:${String(record.seconds % 60).padStart(2, '0')}`);
    row.append(rank, name, time);
    rankingRows.append(row);
  });
  addOpenRankingPlaces();
  document.getElementById('ranking-count').textContent = `${squadRecords.length} squad${squadRecords.length === 1 ? '' : 's'}`;
  document.getElementById('ranking-empty').hidden = squadRecords.length > 0;
  document.getElementById('ranking-table-wrap').hidden = false;
}
// Empty slots are presentation placeholders, never submitted as real results.
function addOpenRankingPlaces() {
  for (let index = squadRecords.length; index < 5; index++) {
    const row = document.createElement('tr');
    row.dataset.place = String(index + 1);
    row.className = 'ranking-vacant';
    for (const value of [ordinalRank(index + 1), '\u2014', '--:--']) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    row.children[1].setAttribute('aria-label', 'No verified result yet');
    rankingRows.append(row);
  }
}
addOpenRankingPlaces();
document.getElementById('ranking-table-wrap').hidden = false;

(async () => {
  const boardStatus = document.getElementById('board-status');
  const staffStatus = document.getElementById('staff-status');
  const login = document.getElementById('staff-login');
  const form = document.getElementById('ranking-form');
  const signout = document.getElementById('staff-signout');
  if (!window.supabase) {
    boardStatus.textContent = 'Unable to connect. Reload the page to try again.';
    login.querySelector('button').disabled = true;
    return;
  }
  const client = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false }
  });
  let staffUser = null;
  let authGeneration = 0;
  let loading = false;
  async function loadBoard() {
    if (loading) return;
    loading = true;
    const refresh = document.getElementById('refresh-rankings');
    refresh.disabled = true;
    try {
      const {data, error} = await client.from('leaderboard').select('id,name,seconds,created_at')
        .order('seconds').order('created_at').order('id').limit(5);
      if (error) throw error;
      squadRecords = data.slice(0, 5);
      renderRankings();
      boardStatus.textContent = 'Top 5 verified challenge results. Updates every 30 seconds.';
    } catch {
      boardStatus.textContent = 'Rankings are unavailable. Please try Refresh rankings shortly.';
      if (!squadRecords.length) document.getElementById('ranking-count').textContent = 'Unavailable';
    } finally { loading = false; refresh.disabled = false; }
  }
  async function updateStaff(session) {
    const generation = ++authGeneration;
    staffUser = null;
    form.hidden = true;
    login.hidden = !!session;
    signout.hidden = !session;
    if (!session) { staffStatus.textContent = ''; return; }
    staffStatus.textContent = 'Checking staff access...';
    const { data, error } = await client.from('booth_staff').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (generation !== authGeneration) return;
    if (error || !data) {
      staffStatus.textContent = 'This account does not have booth staff access. Contact the organizer.';
      return;
    }
    staffUser = session.user;
    form.hidden = false;
    staffStatus.textContent = 'Booth staff access verified.';
  }
  client.auth.onAuthStateChange((_event, session) => {
    // Run database calls outside the auth callback to avoid locking the auth client.
    setTimeout(() => updateStaff(session), 0);
  });
  login.addEventListener('submit', async event => {
    event.preventDefault();
    const button = login.querySelector('button');
    button.disabled = true;
    staffStatus.textContent = 'Signing in...';
    try {
      const {error} = await client.auth.signInWithPassword({
        email: document.getElementById('staff-email').value.trim(),
        password: document.getElementById('staff-password').value
      });
      if (error) throw error;
    } catch { staffStatus.textContent = 'Sign-in failed. Check your credentials and connection.'; }
    finally { document.getElementById('staff-password').value = ''; button.disabled = false; }
  });
  signout.addEventListener('click', async () => {
    signout.disabled = true;
    const {error} = await client.auth.signOut({scope:'local'});
    if (error) staffStatus.textContent = 'Sign-out failed. Please try again.';
    signout.disabled = false;
  });
  let pendingResult = null;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!staffUser) { rankingFeedback.textContent = 'Sign in with an authorized staff account first.'; return; }
    const name = document.getElementById('squad-name').value.trim();
    const minutes = Number(document.getElementById('challenge-minutes').value);
    const seconds = Number(document.getElementById('challenge-seconds').value);
    const total = minutes * 60 + seconds;
    if (!name || name.length > 40 || !Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds > 59 || total <= 0 || total > 1200) {
      rankingFeedback.textContent = 'Enter a squad name and a completion time from 00:01 to 20:00.';
      return;
    }
    const button = form.querySelector('button');
    button.disabled = true;
    rankingFeedback.textContent = 'Saving verified result...';
    // Reuse the ID on retry so an uncertain network response cannot duplicate a score.
    if (!pendingResult || pendingResult.name !== name || pendingResult.seconds !== total || pendingResult.submitted_by !== staffUser.id) {
      pendingResult = {id:crypto.randomUUID(),name,seconds:total,submitted_by:staffUser.id};
    }
    try {
      const {error} = await client.from('leaderboard').insert(pendingResult);
      if (error && error.code !== '23505') throw error;
      pendingResult = null;
      document.getElementById('squad-name').value = '';
      rankingFeedback.textContent = `${name}: verified result saved.`;
      await loadBoard();
    } catch { rankingFeedback.textContent = 'Result could not be saved. Check your staff access and connection, then retry.'; }
    finally { button.disabled = false; }
  });
  document.getElementById('refresh-rankings').addEventListener('click', loadBoard);
  await loadBoard();
  setInterval(() => { if (!document.hidden) loadBoard(); }, 30000);
})();

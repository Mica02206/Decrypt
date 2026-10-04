'use strict';

// Use an elapsed-time clock so background-tab throttling does not cause drift.
const initialTimeMs = (17 * 60 + 34) * 1000 + 520;
const fullTimeMs = 20 * 60 * 1000;
const timer = document.getElementById('countdown');
const progress = document.getElementById('timer-progress');
const progressTrack = progress?.parentElement;
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

if (timer && progress && progressTrack) {
  renderCountdown(initialTimeMs);
  countdownInterval = setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateCountdown();
  });
}

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

document.querySelector('.inspiration-card .button')?.addEventListener('click', () => {
  setActiveNavigation('#challenge');
});

function syncNavigationWithHash() {
  const hash = window.location.hash;
  setActiveNavigation(navigationItems.some(item => item.hash === hash) ? hash : '#home');
}

window.addEventListener('hashchange', syncNavigationWithHash);
syncNavigationWithHash();

// On mobile, the drawer provides smooth jumps while the full page stays scrollable.
const mobileSectionQuery = matchMedia('(max-width: 850px)');
const mobileSections = [...document.querySelectorAll('.page-shell > .section[id]')];
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sectionDrawer = document.getElementById('section-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');

function setDrawerOpen(open) {
  document.body.classList.toggle('drawer-open', open);
  mobileMenuToggle.setAttribute('aria-expanded', String(open));
  mobileMenuToggle.setAttribute('aria-label', open ? 'Close section menu' : 'Open section menu');
  mobileMenuToggle.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  if (mobileSectionQuery.matches) sectionDrawer.setAttribute('aria-hidden', String(!open));
  else sectionDrawer.removeAttribute('aria-hidden');
}

function showMobileSection(hash, scrollPage = false) {
  if (!mobileSectionQuery.matches) {
    setDrawerOpen(false);
    return;
  }
  const requested = document.querySelector(hash);
  const target = mobileSections.includes(requested) ? requested : document.getElementById('home');
  setActiveNavigation(`#${target.id}`);
  setDrawerOpen(false);
  if (scrollPage) requestAnimationFrame(() => target.scrollIntoView({behavior:'smooth',block:'start'}));
}

mobileMenuToggle.addEventListener('click', () => setDrawerOpen(!document.body.classList.contains('drawer-open')));
drawerBackdrop.addEventListener('click', () => setDrawerOpen(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setDrawerOpen(false); });
document.addEventListener('click', event => {
  if (!mobileSectionQuery.matches) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.querySelector(link.getAttribute('href'));
  if (!mobileSections.includes(target)) return;
  event.preventDefault();
  const hash = `#${target.id}`;
  if (location.hash !== hash) history.pushState(null,'',hash);
  showMobileSection(hash,true);
});
addEventListener('popstate', () => showMobileSection(location.hash || '#home',true));
addEventListener('hashchange', () => showMobileSection(location.hash || '#home'));
mobileSectionQuery.addEventListener('change', () => showMobileSection(location.hash || '#home'));
showMobileSection(location.hash || '#home');

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

// Decorative star field: capped resolution, frame-rate independent movement,
// and no animation work while the page is hidden or motion is disabled.
(() => {
  const canvas = document.getElementById('galaxy');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.getElementById('motion-toggle');
  let paused = preference.matches;
  let width = 0, height = 0, stars = [], frame = 0, previous = 0, elapsed = 0;
  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * ratio; canvas.height = height * ratio;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    stars = Array.from({length:Math.min(220, Math.round(width * height / 4300))}, () => ({
      x:Math.random()*width,y:Math.random()*height,r:.4+Math.random()*1.4,
      speed:2+Math.random()*9,phase:Math.random()*Math.PI*2
    }));
    paint(0);
  }
  function paint(delta) {
    ctx.clearRect(0,0,width,height);
    for (const star of stars) {
      star.x += delta * star.speed * .4; star.y -= delta * star.speed;
      if(star.y < -4) star.y=height+4;
      if(star.x > width+4) star.x=-4;
      ctx.globalAlpha=.3+(.5+.5*Math.sin(elapsed*.6+star.phase))*.55;
      ctx.fillStyle=star.r>1.4?'#91fff2':'#bdc9fa';
      ctx.beginPath(); ctx.arc(star.x,star.y,star.r,0,Math.PI*2);ctx.fill();
    }
    // An occasional short meteor moves across the background, never flashing.
    const meteorPhase = elapsed % 16;
    if(meteorPhase<1.6 && elapsed>2 && !paused) {
      const x=width*.18+meteorPhase*width*.4,y=height*.08+meteorPhase*height*.16;
      const gradient=ctx.createLinearGradient(x-110,y-42,x,y);
      gradient.addColorStop(0,'transparent'); gradient.addColorStop(1,'#a0f7ff');
      ctx.globalAlpha=Math.sin(meteorPhase/1.6*Math.PI)*.6;
      ctx.strokeStyle=gradient;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x-110,y-42);ctx.lineTo(x,y);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  function animate(now) {
    const delta=previous?Math.min((now-previous)/1000,.05):0;
    previous=now;elapsed+=delta;paint(delta);
    frame=requestAnimationFrame(animate);
  }
  function syncMotion() {
    cancelAnimationFrame(frame);previous=0;
    document.body.classList.toggle('motion-paused',paused);
    toggle.textContent=paused?'Enable motion':'Pause motion';
    toggle.setAttribute('aria-label',paused?'Enable background animation':'Pause background animation');
    toggle.setAttribute('aria-pressed',String(paused));
    if(!paused&&!document.hidden) frame=requestAnimationFrame(animate);else paint(0);
  }
  toggle.addEventListener('click',()=>{paused=!paused;syncMotion();});
  preference.addEventListener('change',()=>{paused=preference.matches;syncMotion();});
  document.addEventListener('visibilitychange',syncMotion);
  addEventListener('resize',resize);
  resize();syncMotion();
})();

// Reveal supporting content as it enters the viewport.
(() => {
  const items = [...document.querySelectorAll('.inspiration-media,.inspiration-content,.role-card,.ranking-prize,.ranking-board,.ticket,.site-footer')];
  if (!items.length) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  items.forEach((item,index) => {
    item.classList.add('reveal-item');
    item.style.setProperty('--reveal-delay',`${(index % 3) * 80}ms`);
  });
  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('reveal-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-visible');
      observer.unobserve(entry.target);
    });
  },{threshold:.12,rootMargin:'0px 0px -7%'});
  items.forEach(item => observer.observe(item));
})();

// Keep navigation aligned with the section being read, including rankings.
let navigationScheduled = false;
addEventListener('scroll', () => {
  if (navigationScheduled) return;
  navigationScheduled = true;
  requestAnimationFrame(() => {
    const visibleSections = navigationItems.map(item => document.querySelector(item.hash)).filter(Boolean)
      .sort((a,b) => a.offsetTop-b.offsetTop);
    let current = visibleSections[0];
    for (const section of visibleSections) if (section.getBoundingClientRect().top < innerHeight * .4) current = section;
    if (current) setActiveNavigation(`#${current.id}`);
    navigationScheduled = false;
  });
}, {passive:true});

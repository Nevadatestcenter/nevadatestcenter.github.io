(() => {
  const api = String(window.NTC_API_URL || '').replace(/\/$/, '');
  const appURL = new URL('app.js', document.currentScript.src).href;
  const german = (navigator.language || '').toLowerCase().startsWith('de');
  let appLoaded = false;
  let lastState = '';
  const gate = document.createElement('div');
  gate.id = 'maintenance-gate';
  gate.hidden = true;
  gate.setAttribute('role', 'alert');
  gate.innerHTML = '<div class="maintenance-gate-card"><strong>NTC PERFORMANCE</strong><h1></h1><p></p><button type="button"></button></div>';
  document.body.append(gate);
  const title = gate.querySelector('h1');
  const message = gate.querySelector('p');
  const retry = gate.querySelector('button');
  retry.textContent = german ? 'Erneut prüfen' : 'Check again';
  retry.addEventListener('click', () => check());

  function show(state) {
    lastState = state;
    title.textContent = state === 'maintenance'
      ? (german ? 'Wartung läuft' : 'Maintenance in progress')
      : (german ? 'Server nicht erreichbar' : 'Server unavailable');
    message.textContent = state === 'maintenance'
      ? (german ? 'NTC Performance ist vorübergehend im Wartungsmodus. Bitte versuche es später erneut.' : 'NTC Performance is temporarily in maintenance mode. Please try again later.')
      : (german ? 'Der NTC-Server antwortet gerade nicht. Bitte versuche es gleich erneut.' : 'The NTC server is not responding. Please try again shortly.');
    gate.hidden = false;
    document.documentElement.classList.remove('maintenance-checking');
    document.body.style.overflow = 'hidden';
  }

  function loadApp() {
    if (appLoaded) return;
    appLoaded = true;
    const script = document.createElement('script');
    script.src = appURL;
    document.body.append(script);
  }

  async function check() {
    if (!api || api.includes('YOUR-SYNOLOGY-DOMAIN')) {
      gate.hidden = true;
      document.documentElement.classList.remove('maintenance-checking');
      loadApp();
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 6000);
    try {
      const response = await fetch(api + '?action=maintenance_status', { cache: 'no-store', signal: abort.signal });
      // The existing Synology backend does not have this endpoint.
      if (response.status === 404) {
        gate.hidden = true;
        document.documentElement.classList.remove('maintenance-checking');
        loadApp();
        return;
      }
      if (!response.ok) throw new Error('Status request failed');
      const data = await response.json();
      if (typeof data.maintenance !== 'boolean') throw new Error('Invalid status');
      if (data.maintenance) {
        show('maintenance');
      } else if (lastState && appLoaded) {
        location.reload();
      } else {
        lastState = '';
        gate.hidden = true;
        document.body.style.overflow = '';
        document.documentElement.classList.remove('maintenance-checking');
        loadApp();
      }
    } catch (error) {
      show('offline');
    } finally {
      clearTimeout(timer);
    }
  }

  check();
  setInterval(check, 15000);
})();

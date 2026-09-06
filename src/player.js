/**
 * The Compassion Player — a persistent music widget.
 *
 * Two constraints shape this file.
 *
 * 1. THE AUDIO ELEMENT MUST OUTLIVE NAVIGATION. app.js re-renders `#view`,
 *    the sidebar, the app bar, and the tab bar on every route change. Any
 *    `<audio>` inside that markup would be destroyed and playback would stop
 *    at each tap. So the player mounts once into `#overlays` — the one root
 *    app.js writes at boot and never touches again — and updates itself
 *    through direct DOM writes rather than by re-rendering its own shell.
 *
 * 2. AUTOPLAY IS A REQUEST, NOT A GUARANTEE. Browsers reject `play()` for
 *    audible media until the visitor has interacted with the page. The player
 *    asks, and if it is refused it shows the refusal honestly and arms a
 *    one-shot listener so the very next tap or key press starts the music.
 *
 * The widget is chrome, not a screen: it stays collapsed to one small button
 * until it is opened, sits clear of the mobile tab bar, and is hidden from
 * print entirely.
 */

import { esc } from './dom.js';
import { BRAND, PLAYER, TRACKS } from './data.js';
import {
  musicIcon, playIcon, pauseIcon, skipIcon, volumeIcon, listIcon, closeIcon,
} from './icons.js';

const STORAGE_KEY = 'cup-of-compassion:player:v1';

/**
 * Preferences, not playback position. Where a visitor was in a track is not
 * worth restoring; whether they wanted the music on is.
 */
const prefs = {
  trackId: TRACKS[0]?.id || '',
  volume: 0.55,
  muted: false,
  /* The series is meant to be playing. A visitor who pauses stays paused. */
  wantsPlayback: true,
};

function loadPrefs() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    saved = null;
  }
  if (!saved || typeof saved !== 'object') return;

  if (TRACKS.some((t) => t.id === saved.trackId)) prefs.trackId = saved.trackId;
  if (typeof saved.volume === 'number' && saved.volume >= 0 && saved.volume <= 1) {
    prefs.volume = saved.volume;
  }
  if (typeof saved.muted === 'boolean') prefs.muted = saved.muted;
  if (typeof saved.wantsPlayback === 'boolean') prefs.wantsPlayback = saved.wantsPlayback;
}

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — this session only */
  }
}

/* --------------------------------------------------------------------------
   Formatting
   -------------------------------------------------------------------------- */

/** `m:ss`, and never `NaN:aN` while a track is still loading. */
function clock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const trackLabel = (track) => (track.take ? `${track.title} · ${track.take}` : track.title);

/* --------------------------------------------------------------------------
   Markup
   -------------------------------------------------------------------------- */

const equaliser = () => `
  <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;

function playerMarkup() {
  return `
  <button class="dock-btn player-fab" type="button" data-player-toggle
          aria-expanded="false" aria-controls="compassion-player"
          aria-label="Open ${esc(PLAYER.title)}">
    ${musicIcon(22, 'currentColor')}
    ${equaliser()}
  </button>

  <section class="widget-panel player-panel" id="compassion-player"
           aria-label="${esc(PLAYER.title)}" hidden>
    <header class="widget-head">
      <span class="widget-mark" aria-hidden="true">${musicIcon(18, 'currentColor')}</span>
      <span class="widget-titles">
        <strong>${esc(PLAYER.title)}</strong>
        <span>${esc(PLAYER.subtitle)}</span>
      </span>
      <button class="widget-close" type="button" data-player-close aria-label="Close ${esc(PLAYER.title)}">
        ${closeIcon('currentColor')}
      </button>
    </header>

    <div class="player-now">
      <span class="player-art">
        <img src="${esc(BRAND.logo)}" alt="" width="1536" height="255" decoding="async">
        ${equaliser()}
      </span>
      <span class="player-meta">
        <strong data-player-title>&nbsp;</strong>
        <span data-player-artist>${esc(PLAYER.artist)}</span>
        <span class="player-hint" data-player-hint hidden>${esc(PLAYER.blockedHint)}</span>
      </span>
    </div>

    <div class="player-seek">
      <label class="sr-only" for="player-seek">Seek within the track</label>
      <input id="player-seek" type="range" min="0" max="1000" step="1" value="0" data-player-seek>
      <span class="player-times">
        <span data-player-elapsed>0:00</span>
        <span data-player-duration>0:00</span>
      </span>
    </div>

    <div class="player-controls">
      <button class="player-step" type="button" data-player-prev aria-label="Previous track">
        ${skipIcon(20, 'currentColor', true)}
      </button>
      <button class="player-play" type="button" data-player-play aria-label="Play">
        <span data-player-play-icon>${playIcon(24, 'currentColor')}</span>
      </button>
      <button class="player-step" type="button" data-player-next aria-label="Next track">
        ${skipIcon(20, 'currentColor')}
      </button>
      <span class="player-spacer"></span>
      <button class="player-step" type="button" data-player-mute aria-label="Mute" aria-pressed="false">
        <span data-player-volume-icon>${volumeIcon(19, 'currentColor')}</span>
      </button>
      <label class="sr-only" for="player-volume">Volume</label>
      <input id="player-volume" class="player-volume" type="range" min="0" max="100" step="1"
             value="55" data-player-volume>
    </div>

    <button class="player-list-toggle" type="button" data-player-list
            aria-expanded="false" aria-controls="player-tracklist">
      ${listIcon(17, 'currentColor')}
      <span>All ${TRACKS.length} tracks</span>
    </button>

    <ol class="player-tracklist" id="player-tracklist" hidden>
      ${TRACKS.map((track, index) => `
      <li>
        <button type="button" data-player-track="${esc(track.id)}" aria-current="false">
          <span class="n">${index + 1}</span>
          <span class="t">
            ${esc(track.title)}
            ${track.take ? `<em>${esc(track.take)}</em>` : ''}
          </span>
          <span class="d" data-track-time="${esc(track.id)}">${clock(track.seconds)}</span>
        </button>
      </li>`).join('')}
    </ol>
  </section>`;
}

/* --------------------------------------------------------------------------
   Behaviour
   -------------------------------------------------------------------------- */

export function mountPlayer(dock, onOpen) {
  if (!TRACKS.length) return null;
  loadPrefs();

  const root = document.createElement('div');
  root.className = 'player-widget';
  root.innerHTML = playerMarkup();
  dock.append(root);

  const $ = (selector) => root.querySelector(selector);
  const fab = $('[data-player-toggle]');
  const panel = $('#compassion-player');
  const playButton = $('[data-player-play]');
  const playIconSlot = $('[data-player-play-icon]');
  const volumeIconSlot = $('[data-player-volume-icon]');
  const muteButton = $('[data-player-mute]');
  const seek = $('[data-player-seek]');
  const volume = $('[data-player-volume]');
  const titleSlot = $('[data-player-title]');
  const hint = $('[data-player-hint]');
  const elapsed = $('[data-player-elapsed]');
  const duration = $('[data-player-duration]');
  const listToggle = $('[data-player-list]');
  const trackList = $('#player-tracklist');

  /* Appended to the widget rather than left detached: same playback, but the
     element shows up in devtools and in the accessibility tree. */
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = prefs.volume;
  audio.muted = prefs.muted;
  root.append(audio);

  let index = Math.max(0, TRACKS.findIndex((t) => t.id === prefs.trackId));
  let seeking = false;
  let gestureArmed = false;
  /* Consecutive load failures. Reset by any successful playback. */
  let failures = 0;

  const current = () => TRACKS[index];

  /* --- rendering --- */

  function paintTransport() {
    const playing = !audio.paused && !audio.ended;
    playIconSlot.innerHTML = playing ? pauseIcon(24, 'currentColor') : playIcon(24, 'currentColor');
    playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    root.classList.toggle('is-playing', playing);
    fab.setAttribute(
      'aria-label',
      `${panel.hidden ? 'Open' : 'Close'} ${PLAYER.title}${playing ? ` — now playing ${trackLabel(current())}` : ''}`,
    );
  }

  function paintVolume() {
    volumeIconSlot.innerHTML = volumeIcon(19, 'currentColor', audio.muted || audio.volume === 0);
    muteButton.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
    muteButton.setAttribute('aria-pressed', String(audio.muted));
    volume.value = String(Math.round(audio.volume * 100));
  }

  function paintTrack() {
    const track = current();
    titleSlot.textContent = trackLabel(track);
    root.querySelectorAll('[data-player-track]').forEach((button) => {
      const active = button.dataset.playerTrack === track.id;
      button.setAttribute('aria-current', String(active));
      button.closest('li').classList.toggle('active', active);
    });
    paintTransport();
  }

  function paintProgress() {
    const total = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : current().seconds;
    elapsed.textContent = clock(audio.currentTime);
    duration.textContent = clock(total);
    if (!seeking) seek.value = String(total ? Math.round((audio.currentTime / total) * 1000) : 0);
    seek.setAttribute('aria-valuetext', `${clock(audio.currentTime)} of ${clock(total)}`);
  }

  /* --- playback --- */

  /**
   * Ask to play. A rejection is expected on a first visit, so it is reported
   * in the widget and retried on the next interaction anywhere on the page —
   * never surfaced as an error the visitor has to dismiss.
   */
  function attemptPlay() {
    const request = audio.play();
    if (!request?.catch) return;
    request
      .then(() => {
        hint.hidden = true;
        paintTransport();
      })
      .catch(() => {
        hint.hidden = false;
        paintTransport();
        armGesture();
      });
  }

  /**
   * Wait for any interaction anywhere on the page, then try again — except
   * inside the player itself. `pointerdown` beats `click`, so without that
   * exception a tap on the play button would start the music here and the
   * button's own handler would immediately pause it again.
   */
  function armGesture() {
    if (gestureArmed) return;
    gestureArmed = true;
    const retry = (event) => {
      if (event.target?.closest?.('.player-widget')) return;
      document.removeEventListener('pointerdown', retry);
      document.removeEventListener('keydown', retry);
      gestureArmed = false;
      if (prefs.wantsPlayback && audio.paused) attemptPlay();
    };
    document.addEventListener('pointerdown', retry);
    document.addEventListener('keydown', retry);
  }

  function load(nextIndex, autoplay) {
    index = (nextIndex + TRACKS.length) % TRACKS.length;
    prefs.trackId = current().id;
    savePrefs();
    audio.src = current().src;
    paintTrack();
    paintProgress();
    if (autoplay) attemptPlay();
  }

  function toggle() {
    if (audio.paused) {
      prefs.wantsPlayback = true;
      savePrefs();
      failures = 0;
      hint.textContent = PLAYER.blockedHint;
      attemptPlay();
    } else {
      prefs.wantsPlayback = false;
      savePrefs();
      audio.pause();
    }
  }

  /* --- panel --- */

  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    root.classList.toggle('is-open', open);
    paintTransport();
    if (open) {
      onOpen?.();
      panel.querySelector('[data-player-play]')?.focus({ preventScroll: true });
    }
  }

  /* --- events --- */

  audio.addEventListener('timeupdate', paintProgress);
  audio.addEventListener('durationchange', () => {
    paintProgress();
    const cell = root.querySelector(`[data-track-time="${CSS.escape(current().id)}"]`);
    if (cell && Number.isFinite(audio.duration)) cell.textContent = clock(audio.duration);
  });
  audio.addEventListener('play', paintTransport);
  audio.addEventListener('pause', paintTransport);
  /* Repeat-all: the playlist is meant to keep going. */
  audio.addEventListener('ended', () => load(index + 1, true));
  audio.addEventListener('playing', () => { failures = 0; });
  /**
   * A missing or unplayable file must not strand the playlist on one track —
   * but skipping past a whole lap of failures means the problem is the network,
   * not the file, so stop rather than loop over the playlist forever.
   */
  audio.addEventListener('error', () => {
    failures += 1;
    if (failures >= TRACKS.length || !prefs.wantsPlayback) {
      hint.textContent = 'The music could not load. Check your connection and press play.';
      hint.hidden = false;
      paintTransport();
      return;
    }
    load(index + 1, true);
  });

  fab.addEventListener('click', () => setOpen(panel.hidden));
  root.querySelector('[data-player-close]').addEventListener('click', () => {
    setOpen(false);
    fab.focus({ preventScroll: true });
  });

  playButton.addEventListener('click', toggle);
  root.querySelector('[data-player-prev]').addEventListener('click', () => {
    /* Restart the track first, the way a physical transport control does. */
    if (audio.currentTime > 3) audio.currentTime = 0;
    else load(index - 1, prefs.wantsPlayback);
  });
  root.querySelector('[data-player-next]').addEventListener('click', () => load(index + 1, prefs.wantsPlayback));

  muteButton.addEventListener('click', () => {
    audio.muted = !audio.muted;
    prefs.muted = audio.muted;
    savePrefs();
    paintVolume();
  });

  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    if (audio.volume > 0 && audio.muted) audio.muted = false;
    prefs.volume = audio.volume;
    prefs.muted = audio.muted;
    savePrefs();
    paintVolume();
  });

  const scrub = () => {
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    if (total) audio.currentTime = (Number(seek.value) / 1000) * total;
  };
  seek.addEventListener('pointerdown', () => { seeking = true; });
  seek.addEventListener('input', () => { seeking = true; });
  seek.addEventListener('change', () => { scrub(); seeking = false; });

  listToggle.addEventListener('click', () => {
    const open = trackList.hidden;
    trackList.hidden = !open;
    listToggle.setAttribute('aria-expanded', String(open));
  });

  trackList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-player-track]');
    if (!button) return;
    const next = TRACKS.findIndex((t) => t.id === button.dataset.playerTrack);
    if (next < 0) return;
    prefs.wantsPlayback = true;
    savePrefs();
    load(next, true);
  });

  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setOpen(false);
    fab.focus({ preventScroll: true });
  });

  /* --- boot --- */

  paintVolume();
  load(index, false);
  if (prefs.wantsPlayback) attemptPlay();

  return { close: () => setOpen(false) };
}

const frame = document.getElementById('game');
const fullscreen = document.getElementById('fullscreen');
const gameArea = document.getElementById('game-area');
const loadError = document.getElementById('load-error');

// The frame stays at the same URL across releases so browser saves keep their identity.
frame.addEventListener('load', () => {
  try {
    if (!frame.contentDocument?.querySelector('canvas')) loadError.hidden = false;
  } catch {
    loadError.hidden = false;
  }
});
frame.addEventListener('error', () => { loadError.hidden = false; });

if (!document.fullscreenEnabled) fullscreen.hidden = true;
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameArea.requestFullscreen();
    frame.contentWindow.focus();
  } catch {
    fullscreen.textContent = 'Fullscreen unavailable';
  }
});
document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
});

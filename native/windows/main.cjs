const { app, BrowserWindow, session, protocol } = require('electron');
const path = require('node:path');
const { readFile } = require('node:fs/promises');
protocol.registerSchemesAsPrivileged([{ scheme: 'layans', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

app.setName("Layan's Skate");
app.setAppUserModelId('com.layansskate.game');
let window;
app.whenReady().then(() => {
  // A stable private origin keeps saves across moving/updating the portable folder.
  protocol.handle('layans', async request => {
    const url = new URL(request.url);
    const file = url.hostname === 'game' && url.pathname === '/' ? 'game.html' : url.hostname === 'game' && url.pathname === '/THIRD_PARTY_NOTICES.txt' ? 'THIRD_PARTY_NOTICES.txt' : null;
    if (!file) return new Response('Not found', { status: 404 });
    return new Response(await readFile(path.join(__dirname, file)), { headers: { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8' } });
  });
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(permission === 'fullscreen' || permission === 'mediaKeySystem');
  });
  window = new BrowserWindow({
    title: "Layan's Skate", width: 1280, height: 800, minWidth: 800, minHeight: 600,
    backgroundColor: '#172b31', autoHideMenuBar: true, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault(); window.setFullScreen(!window.isFullScreen());
    }
  });
  window.once('ready-to-show', () => window.show());
  window.loadURL('layans://game/');
});
app.on('window-all-closed', () => app.quit());

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const logPath = path.join(app.getPath('userData'), 'debug.log');
function log(msg) {
  const time = new Date().toISOString();
  fs.appendFileSync(logPath, `[${time}] ${msg}\n`);
}

log('--- App starting ---');
log(`Args: ${process.argv.join(' ')}`);

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    log(`LoadConfig error: ${e.message}`);
  }
  return { alertsApiKey: '', ukraineAlarmApiKey: '' };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config), 'utf8');
    log('Config saved successfully');
  } catch (e) {
    log(`SaveConfig error: ${e.message}`);
  }
}

function createWindow(isSettings) {
  log(`Creating window. isSettings: ${isSettings}`);
  
  mainWindow = new BrowserWindow({
    width: isSettings ? 600 : 1024,
    height: isSettings ? 600 : 768,
    fullscreen: !isSettings,
    frame: isSettings,
    alwaysOnTop: !isSettings,
    skipTaskbar: !isSettings,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [isSettings ? '--mode=settings' : '--mode=map']
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) {
    const finalUrl = url + (isSettings ? '#settings' : '');
    log(`Loading dev URL: ${finalUrl}`);
    mainWindow.loadURL(finalUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    log(`Loading prod file: ${indexPath} with hash: ${isSettings ? 'settings' : 'none'}`);
    
    // Using a more manual way to set hash to be safe
    const hash = isSettings ? '#settings' : '';
    mainWindow.loadURL(`file://${indexPath}${hash}`);
  }

  mainWindow.once('ready-to-show', () => {
    log('Window ready to show');
    mainWindow.show();
    if (isSettings) {
      mainWindow.focus();
      mainWindow.center();
    }
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log(`FAILED TO LOAD: ${code} - ${desc}`);
  });

  if (!isSettings) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'Escape') {
        log('Escape pressed, quitting');
        app.quit();
      }
    });
  }
}

app.whenReady().then(() => {
  log('App ready');
  const args = process.argv;
  const argString = args.join(' ').toLowerCase();
  
  const config = loadConfig();
  
  // IF NO KEYS, FORCE SETTINGS
  let isSettings = argString.includes('/c') || argString.includes('-c') || !config.alertsApiKey;
  
  log(`Mode determined: ${isSettings ? 'SETTINGS' : 'MAP'}`);

  if (argString.includes('/p')) {
    log('Preview mode, quitting');
    app.quit();
    return;
  }

  ipcMain.handle('get-config', () => {
    log('IPC: get-config called');
    return loadConfig();
  });
  
  ipcMain.handle('save-config', (event, cfg) => {
    log('IPC: save-config called');
    saveConfig(cfg);
    return true;
  });

  createWindow(isSettings);
});

app.on('window-all-closed', () => {
  log('All windows closed, quitting');
  app.quit();
});

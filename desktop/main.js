const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'FixMaster POS - Repair Management System',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: false,
    backgroundColor: '#090d16',
  });

  const liveAppUrl = 'https://fix-master-git-main-hansa7788-s-projects1.vercel.app';

  // Clear session cache before loading to guarantee instant realtime cloud data sync
  session.defaultSession.clearCache().then(() => {
    mainWindow.loadURL(liveAppUrl);
  });

  // Custom Application Top Menu
  const template = [
    {
      label: 'FixMaster POS',
      submenu: [
        {
          label: 'Reload System (Sync Live Updates)',
          accelerator: 'CmdOrCtrl+R',
          click: async () => {
            await session.defaultSession.clearCache();
            mainWindow.reload();
          }
        },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Exit Application', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Print & Receipts',
      submenu: [
        { label: 'Print Current Invoice / Receipt', accelerator: 'CmdOrCtrl+P', click: () => mainWindow.webContents.print() }
      ]
    },
    {
      label: 'Help & Cloud',
      submenu: [
        { label: 'Open Supabase Cloud Dashboard', click: () => shell.openExternal('https://emvbsjturokhyjpeoiiv.supabase.co') },
        { label: 'Open Live Web Version', click: () => shell.openExternal(liveAppUrl) }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

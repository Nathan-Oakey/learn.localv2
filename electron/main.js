const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess = null;
const isDev = !app.isPackaged;
const BACKEND_PORT = 5001;
const FRONTEND_PORT = 5173; // Use same port as dev for consistency
let isQuitting = false;
let frontendServer = null;

function startBackend() {
  const commands = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  
  // Get the correct server path
  let serverPath;
  let serverDir;
  
  if (isDev) {
    serverPath = path.join(__dirname, '..', 'server', 'server.py');
    serverDir = path.dirname(serverPath);
  } else {
    // In production, check multiple possible locations
    const possiblePaths = [
      path.join(process.resourcesPath, 'server', 'server.py'),
      path.join(path.dirname(process.execPath), 'resources', 'server', 'server.py'),
      path.join(__dirname, 'server', 'server.py')
    ];
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        serverPath = testPath;
        serverDir = path.dirname(serverPath);
        console.log('Found server at:', serverPath);
        break;
      }
    }
    
    if (!serverPath) {
      console.error('Could not find server.py in any location');
      return;
    }
  }

  // Ensure uploads directory exists
  const uploadsPath = path.join(serverDir, 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Try each Python command
  for (const cmd of commands) {
    try {
      console.log(`Attempting to start backend with: ${cmd} ${serverPath}`);
      
      backendProcess = spawn(cmd, [serverPath], {
        cwd: serverDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          PORT: BACKEND_PORT.toString(),
          PYTHONUNBUFFERED: '1'
        }
      });
      
      console.log(`Started backend with ${cmd} (PID: ${backendProcess.pid})`);
      
      backendProcess.on('error', (err) => {
        console.error('Backend process error:', err);
        backendProcess = null;
      });
      
      backendProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code} and signal ${signal}`);
        backendProcess = null;
      });
      
      backendProcess.stdout.on('data', (data) => {
        console.log(`Backend stdout: ${data}`);
      });
      
      backendProcess.stderr.on('data', (data) => {
        console.error(`Backend stderr: ${data}`);
      });
      
      break;
    } catch (err) {
      console.log(`Failed to start with ${cmd}:`, err.message);
      continue;
    }
  }
}

function startFrontendServer() {
  if (isDev) return; // Don't start server in dev mode, use Vite dev server
  
  // Find the frontend dist directory
  let frontendDistPath = null;
  const possiblePaths = [
    path.join(process.resourcesPath, 'frontend', 'dist'),
    path.join(path.dirname(process.execPath), 'resources', 'frontend', 'dist'),
    path.join(__dirname, 'frontend', 'dist'),
    path.join(__dirname, '..', 'frontend', 'dist')
  ];
  
  for (const testPath of possiblePaths) {
    console.log('Checking frontend path:', testPath);
    if (fs.existsSync(testPath)) {
      frontendDistPath = testPath;
      console.log('Found frontend dist at:', frontendDistPath);
      break;
    }
  }
  
  if (!frontendDistPath) {
    console.error('Could not find frontend dist in any location');
    return;
  }

  // Create a simple HTTP server to serve static files
  frontendServer = http.createServer((req, res) => {
    console.log(`Frontend request: ${req.url}`);
    
    // Parse the URL
    let filePath = path.join(frontendDistPath, req.url === '/' ? 'index.html' : req.url);
    
    // Get the file extension
    const extname = path.extname(filePath);
    
    // Map file extensions to MIME types
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.woff': 'application/font-woff',
      '.ttf': 'application/font-ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'application/font-otf',
      '.wasm': 'application/wasm'
    };

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // File doesn't exist - for SPA, serve index.html
        console.log(`File not found: ${filePath}, serving index.html for SPA routing`);
        filePath = path.join(frontendDistPath, 'index.html');
      }
      
      // Read and serve the file
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end(`Server Error: ${err.code}`);
          return;
        }
        
        // Set the correct content type
        const contentType = mimeTypes[path.extname(filePath)] || 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      });
    });
  });
  
  frontendServer.listen(FRONTEND_PORT, 'localhost', () => {
    console.log(`Frontend server running at http://localhost:${FRONTEND_PORT}`);
  });
  
  frontendServer.on('error', (err) => {
    console.error('Frontend server error:', err);
  });
}

function killBackend() {
  if (backendProcess && !backendProcess.killed) {
    console.log('Killing backend process...');
    
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
    } else {
      try {
        process.kill(-backendProcess.pid, 'SIGTERM');
      } catch (err) {
        // Process group might not exist
      }
    }
    
    backendProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
    }, 1000);
  }
}

function killFrontendServer() {
  if (frontendServer) {
    console.log('Stopping frontend server...');
    frontendServer.close();
    frontendServer = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Show the window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    // Development - use Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production - load from our local frontend server
    const frontendUrl = `http://localhost:${FRONTEND_PORT}`;
    console.log('Loading frontend from:', frontendUrl);
    
    mainWindow.loadURL(frontendUrl).catch(err => {
      console.error('Failed to load frontend:', err);
      
      // Fallback: try to load from file if server isn't ready
      const indexPath = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        console.log('Falling back to file:// protocol');
        mainWindow.loadFile(indexPath);
      } else {
        showErrorPage(`
          <h1>Frontend Server Error</h1>
          <p>Could not connect to frontend server at ${frontendUrl}</p>
          <p>Make sure the frontend server is running.</p>
        `);
      }
    });
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Frontend loaded successfully');
  });
}

function showErrorPage(message) {
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #d32f2f; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>Application Error</h1>
        <div>${message}</div>
      </body>
    </html>
  `)}`);
}

app.whenReady().then(() => {
  // Start backend in production
  if (!isDev) {
    startBackend();
    startFrontendServer();
  }
  
  // Create window after servers start
  setTimeout(createWindow, isDev ? 0 : 2000);
});

app.on('window-all-closed', () => {
  // Don't quit on macOS when all windows are closed
  if (process.platform !== 'darwin') {
    killBackend();
    killFrontendServer();
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  if (isQuitting) {
    return;
  }
  
  isQuitting = true;
  
  try {
    console.log('Logging out...');
    fetch(`http://127.0.0.1:${BACKEND_PORT}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(1000)
    }).catch(() => {
      // Ignore errors during shutdown
    });
  } catch (error) {
    // Ignore all errors during shutdown
  }
  
  killBackend();
  killFrontendServer();
});

app.on('will-quit', () => {
  killBackend();
  killFrontendServer();
});

// IPC Handlers
ipcMain.handle('api-request', async (event, { method, endpoint, data }) => {
  try {
    const url = `http://localhost:${BACKEND_PORT}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    };
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    const text = await response.text();
    
    if (response.status === 401 && mainWindow) {
      mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}/login`);
    }
    
    return { success: true, data: text, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file-upload', async (event, { endpoint, filename, filedata }) => {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    const buffer = Buffer.from(filedata, 'base64');
    form.append('file', buffer, { filename });
    
    const response = await fetch(`http://localhost:${BACKEND_PORT}${endpoint}`, {
      method: 'POST',
      body: form,
      credentials: 'include',
      headers: form.getHeaders()
    });
    const text = await response.text();
    return { success: true, data: text };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

ipcMain.handle('logout', async () => {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    return { success: response.ok };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
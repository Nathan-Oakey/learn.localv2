const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

async function bundlePython() {
  console.log('Bundling Python with dependencies...');
  
  const platform = os.platform();
  const pythonDir = path.join(__dirname, '../build/python');
  
  await fs.ensureDir(pythonDir);
  
  if (platform === 'win32') {
    // For Windows, we need to bundle Python embeddable package
    console.log('Downloading Python embeddable package for Windows...');
    // This would need actual download logic
    // For now, we'll use the system Python in production as well
  }
  
  // Install Python dependencies
  console.log('Installing Python dependencies...');
  const backendDir = path.join(__dirname, '../server');
  execSync(`pip install -r ${path.join(backendDir, 'requirements.txt')} --target ${path.join(pythonDir, 'site-packages')}`, 
    { stdio: 'inherit' });
  
  console.log('Python bundling complete!');
}

bundlePython().catch(err => {
  console.error('Python bundling failed:', err);
  process.exit(1);
});
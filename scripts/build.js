const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function build() {
  console.log('Starting build process...');

  // Build frontend
  console.log('Building frontend...');
  execSync('cd frontend && npm run build', { stdio: 'inherit' });

  // Ensure uploads directory exists in server
  const uploadsPath = path.join(__dirname, '../server/uploads');
  await fs.ensureDir(uploadsPath);
  console.log('Ensured uploads directory exists');

  // Ensure templates directory exists
  const templatesPath = path.join(__dirname, '../server/templates');
  await fs.ensureDir(templatesPath);
  
  // Copy HTML templates if they don't exist (optional - your server.py already has them)
  // This is just to ensure they're included in the build

  console.log('Build complete! Ready for packaging with electron-builder.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
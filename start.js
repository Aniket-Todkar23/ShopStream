#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const os = require('os');

// Simple chalk-like coloring functions
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

console.log(colors.bold(colors.cyan('========================================')));
console.log(colors.bold(colors.cyan('  ShopStream System Launcher')));
console.log(colors.bold(colors.cyan('========================================')));

let backendProcess, frontendProcess;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n' + colors.yellow('Shutting down services...'));
  
  if (backendProcess) {
    backendProcess.kill();
    console.log(colors.green('✓ Backend server stopped'));
  }
  
  if (frontendProcess) {
    frontendProcess.kill();

async function checkDependency(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function checkDockerContainer(name) {
  try {
    const result = execSync(`docker ps -f name=${name} --format "{{.Names}}"`, { encoding: 'utf8' });
    return result.trim() === name;
  } catch {
    return false;
  }
}

async function startPostgreSQL() {
  console.log(colors.blue('Checking PostgreSQL database...'));
  
  const hasDocker = await checkDependency('docker');
  if (!hasDocker) {
    console.log(colors.yellow('⚠ Docker not found. Please ensure PostgreSQL is running manually on localhost:5432'));
    console.log(colors.yellow('  Database URL should be: postgresql://postgres:yourpassword@localhost:5432/shopstream'));
    return;
  }
  
  const containerExists = await checkDockerContainer('shopstream-postgres');

async function runMigrations() {
  console.log(colors.blue('Running database migrations...'));
  try {
    execSync('npx prisma migrate deploy', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
    console.log(colors.green('✓ Database migrations completed'));
  } catch (error) {
    console.log(colors.red('✗ Failed to run database migrations:'), error.message);
  }
}

function startBackend() {
  return new Promise((resolve) => {
    console.log(colors.blue('Starting backend server...'));
    
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ShopStream API running')) {
        console.log(colors.green('✓ Backend server started'));
        resolve();
      }
      // Only show important messages to avoid clutter
      if (output.includes('🚀') || output.includes('✅') || output.includes('📖')) {
        process.stdout.write(output);
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

function startFrontend() {
  return new Promise((resolve) => {
    console.log(colors.blue('Starting frontend server...'));
    
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('Network:')) {

async function main() {
  try {
    // Check prerequisites
    const hasNode = await checkDependency('node');
    const hasNpm = await checkDependency('npm');
    
    if (!hasNode || !hasNpm) {
      console.log(colors.red('✗ Node.js and npm are required. Please install them first.'));
      process.exit(1);
    }
    
    // Start PostgreSQL
    await startPostgreSQL();
    
    // Install dependencies
    await installDependencies(path.join(__dirname, 'backend'));
    await installDependencies(path.join(__dirname, 'frontend'));
    
    // Run migrations
    await runMigrations();
    
    // Start services
    await startBackend();
    await startFrontend();
    
    // Show success message
    console.log('\n' + colors.bold(colors.cyan('========================================')));
    console.log(colors.bold(colors.green('  ShopStream Systems Started')));
    console.log(colors.bold(colors.cyan('========================================')));
    console.log(colors.green('Backend API:   '), colors.blue('http://localhost:4000'));
    console.log(colors.green('Frontend App:  '), colors.blue('http://localhost:5173'));
    console.log(colors.green('Swagger Docs:  '), colors.blue('http://localhost:4000/api/docs'));
    console.log('\n' + colors.yellow('Press Ctrl+C to stop all services'));
    
  } catch (error) {
    console.log(colors.red('✗ Error starting system:'), error.message);
    process.exit(1);
  }
}

main();
        console.log(colors.green('✓ Frontend server started'));
        resolve();
      }
      // Show Vite startup messages
      if (output.includes('VITE') || output.includes('Local:') || output.includes('Network:')) {
        process.stdout.write(output);
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}
  if (containerExists) {
    console.log(colors.green('✓ PostgreSQL container is already running'));
    return;
  }
  
  console.log(colors.blue('Starting PostgreSQL Docker container...'));
  try {
    execSync(
      'docker run --name shopstream-postgres -e POSTGRES_DB=shopstream -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres:13',
      { stdio: 'inherit' }
    );
    console.log(colors.green('✓ PostgreSQL container started'));
    
    // Wait for PostgreSQL to initialize
    console.log(colors.blue('Waiting for PostgreSQL to initialize...'));
    await new Promise(resolve => setTimeout(resolve, 10000));
  } catch (error) {
    console.log(colors.red('✗ Failed to start PostgreSQL container:'), error.message);
  }
}

async function installDependencies(dir) {
  const nodeModulesPath = path.join(dir, 'node_modules');
  try {
    await fs.access(nodeModulesPath);
    console.log(colors.green(`✓ Dependencies already installed in ${path.basename(dir)}`));
    return;
  } catch {
    console.log(colors.blue(`Installing dependencies in ${path.basename(dir)}...`));
    try {
      execSync('npm install', { cwd: dir, stdio: 'inherit' });
      console.log(colors.green(`✓ Dependencies installed in ${path.basename(dir)}`));
    } catch (error) {
      console.log(colors.red(`✗ Failed to install dependencies in ${path.basename(dir)}:`), error.message);
    }
  }
}
    console.log(colors.green('✓ Frontend server stopped'));
  }
  
  process.exit(0);
});
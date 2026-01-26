import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

let errors = 0;
let warnings = 0;

function log(type, message, details = '') {
    if (type === 'error') {
        console.log(`${colors.red}${colors.bold}[ERROR]${colors.reset} ${message}`);
        if (details) console.log(`        ${details}`);
        errors++;
    } else if (type === 'warn') {
        console.log(`${colors.yellow}${colors.bold}[WARN]${colors.reset} ${message}`);
        if (details) console.log(`        ${details}`);
        warnings++;
    } else if (type === 'success') {
        console.log(`${colors.green}${colors.bold}[PASS]${colors.reset} ${message}`);
    } else {
        console.log(`${colors.cyan}${colors.bold}[INFO]${colors.reset} ${message}`);
    }
}

// 1. Directory Structure check
const requiredDirs = ['src/components', 'src/views', 'src/lib', 'src/assets', 'src/context', 'src/utils'];
log('info', 'Checking directory structure...');
requiredDirs.forEach(dir => {
    if (fs.existsSync(path.join(rootDir, dir))) {
        log('success', `Directory exists: ${dir}`);
    } else {
        log('error', `Missing required directory: ${dir}`);
    }
});

// 2. Naming Conventions (PascalCase for Views and Components)
const uiDirs = ['src/components', 'src/views'];
uiDirs.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) return;

    const files = fs.readdirSync(fullPath);
    files.forEach(file => {
        if (file.endsWith('.jsx')) {
            const baseName = path.basename(file, '.jsx');
            if (!/^[A-Z][a-zA-Z0-9]+$/.test(baseName)) {
                log('warn', `Naming convention violation in ${dir}: ${file}`, 'Files in components/views should use PascalCase.');
            }
        }
    });
});

// 3. Import Boundaries and Service Isolation
function checkImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const isComponent = filePath.includes('src/components');
    const fileName = path.basename(filePath);

    lines.forEach((line, index) => {
        // Direct Supabase imports check
        if (line.includes("from '@supabase/supabase-js'") && !filePath.endsWith('supabase.js')) {
            log('error', `Service isolation violation in ${fileName}:${index + 1}`, 'Import from @supabase/supabase-js should only happen in src/lib/supabase.js');
        }

        // Component importing View check
        if (isComponent && line.includes("from '../views/") || line.includes('from "../views/')) {
            log('error', `Circular dependency risk in ${fileName}:${index + 1}`, 'Components should not import from views.');
        }
    });
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

log('info', 'Scanning source files for architectural violations...');
if (fs.existsSync(path.join(rootDir, 'src'))) {
    walkDir(path.join(rootDir, 'src'), (filePath) => {
        if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
            checkImports(filePath);
        }
    });
}

// 4. Environment Audit
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (fs.existsSync(envExamplePath)) {
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    const requiredKeys = exampleContent.split('\n')
        .map(line => line.split('=')[0].trim())
        .filter(key => key && !key.startsWith('#'));

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        requiredKeys.forEach(key => {
            if (!envContent.includes(key)) {
                log('error', `Missing environment variable: ${key}`, 'Check your .env file against .env.example');
            }
        });
    } else {
        log('warn', '.env file missing', 'Please create a .env file based on .env.example');
    }
}

console.log('\n--- Architecture Validation Summary ---');
console.log(`${colors.bold}Errors:${colors.reset} ${errors > 0 ? colors.red : colors.green}${errors}${colors.reset}`);
console.log(`${colors.bold}Warnings:${colors.reset} ${warnings > 0 ? colors.yellow : colors.green}${warnings}${colors.reset}`);

if (errors > 0) {
    console.log(`\n${colors.red}${colors.bold}VALIDATION FAILED${colors.reset}`);
    process.exit(1);
} else {
    console.log(`\n${colors.green}${colors.bold}VALIDATION PASSED${colors.reset}`);
    process.exit(0);
}

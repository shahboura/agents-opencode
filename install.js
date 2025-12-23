#!/usr/bin/env node

/**
 * OpenCode Agents Installation Script
 * Cross-platform installer for Windows, Linux, and macOS
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, prefix, message) {
    console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function info(message) {
    log(colors.blue, 'INFO', message);
}

function success(message) {
    log(colors.green, 'SUCCESS', message);
}

function warning(message) {
    log(colors.yellow, 'WARNING', message);
}

function error(message) {
    log(colors.red, 'ERROR', message);
}

// Check if command exists
function commandExists(command) {
    try {
        const testCmd = os.platform() === 'win32' ? `where ${command}` : `which ${command}`;
        execSync(testCmd, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Cross-platform path handling
function getHomeDir() {
    return os.homedir();
}

function getGlobalConfigDir() {
    const home = getHomeDir();
    if (os.platform() === 'win32') {
        return path.join(home, 'AppData', 'Local', 'opencode');
    } else {
        return path.join(home, '.config', 'opencode');
    }
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        ensureDir(dest);
        const files = fs.readdirSync(src);
        files.forEach(file => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            copyRecursive(srcPath, destPath);
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function cloneRepository(tempDir) {
    info('Cloning OpenCode Agents repository...');

    try {
        execSync('git clone https://github.com/shahboura/agents-opencode.git .', {
            cwd: tempDir,
            stdio: 'pipe'
        });
        return true;
    } catch (err) {
        error('Failed to clone repository. Please check your internet connection.');
        return false;
    }
}

function validateRepository(repoDir) {
    const opencodeDir = path.join(repoDir, '.opencode');
    if (!fs.existsSync(opencodeDir)) {
        error('Invalid repository structure. Missing .opencode directory.');
        return false;
    }
    return true;
}

function installGlobal(tempDir) {
    info('Installing agents globally...');

    const globalConfigDir = getGlobalConfigDir();
    const opencodeSrc = path.join(tempDir, '.opencode');

    // Copy all directories in .opencode/
    if (fs.existsSync(opencodeSrc)) {
        const items = fs.readdirSync(opencodeSrc);
        items.forEach(item => {
            const srcPath = path.join(opencodeSrc, item);
            const destPath = path.join(globalConfigDir, item);

            if (fs.statSync(srcPath).isDirectory()) {
                copyRecursive(srcPath, destPath);
                success(`Copied ${item} to ${destPath}`);
            }
        });
    }

    // Copy opencode.json
    const configSrc = path.join(tempDir, 'opencode.json');
    if (fs.existsSync(configSrc)) {
        const configDest = path.join(globalConfigDir, 'opencode.json');
        fs.copyFileSync(configSrc, configDest);
        success(`Copied configuration to ${configDest}`);
    }

    success('Global installation completed!');
    info('Agents are now available in all your projects.');
}

function installProject(tempDir, projectDir) {
    info(`Installing agents for project: ${projectDir}`);

    // Check if project directory exists
    if (!fs.existsSync(projectDir)) {
        error(`Project directory does not exist: ${projectDir}`);
        return false;
    }

    // Check if it's a git repository (optional but recommended)
    const gitDir = path.join(projectDir, '.git');
    if (!fs.existsSync(gitDir)) {
        warning('Project directory is not a git repository. Consider initializing git first.');
    }

    // Create .opencode directory
    const opencodeDir = path.join(projectDir, '.opencode');
    ensureDir(opencodeDir);

    // Copy all directories from .opencode/
    const opencodeSrc = path.join(tempDir, '.opencode');
    if (fs.existsSync(opencodeSrc)) {
        const items = fs.readdirSync(opencodeSrc);
        items.forEach(item => {
            const srcPath = path.join(opencodeSrc, item);
            const destPath = path.join(opencodeDir, item);

            if (fs.statSync(srcPath).isDirectory()) {
                copyRecursive(srcPath, destPath);
                success(`Copied ${item} to ${destPath}`);
            }
        });
    }

    // Copy opencode.json
    const configSrc = path.join(tempDir, 'opencode.json');
    if (fs.existsSync(configSrc)) {
        fs.copyFileSync(configSrc, path.join(projectDir, 'opencode.json'));
    }

    // Copy AGENTS.md template if it doesn't exist
    const agentsMdSrc = path.join(tempDir, 'AGENTS.md');
    const agentsMdDest = path.join(projectDir, 'AGENTS.md');
    if (fs.existsSync(agentsMdSrc) && !fs.existsSync(agentsMdDest)) {
        fs.copyFileSync(agentsMdSrc, agentsMdDest);
    }

    // Copy examples directory for learning
    const examplesSrc = path.join(tempDir, 'examples');
    if (fs.existsSync(examplesSrc)) {
        const examplesDest = path.join(projectDir, 'examples');
        copyRecursive(examplesSrc, examplesDest);
        success(`Copied examples to ${examplesDest}`);
    }

    success('Project installation completed!');
    info(`Agents configured for: ${projectDir}`);
    return true;
}

function showUsage() {
    console.log(`
OpenCode Agents Installation Script

USAGE:
    node install.js [OPTIONS]

OPTIONS:
    -g, --global                Install agents globally (available in all projects)
    -p, --project DIR           Install agents for specific project directory
    -h, --help                  Show this help message

EXAMPLES:
    node install.js --global                    # Install globally
    node install.js --project /path/to/project  # Install for specific project
    node install.js --project .                 # Install in current directory

PREREQUISITES:
    - Git
    - Node.js/npm
    - Internet connection

For more information, visit: https://github.com/shahboura/agents-opencode
`);
    process.exit(1);
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        showUsage();
    }

    // Check prerequisites
    if (!commandExists('git')) {
        error('Git is required but not installed. Please install git first.');
        process.exit(1);
    }

    if (!commandExists('npm')) {
        error('Node.js/npm is required but not installed. Please install Node.js first.');
        process.exit(1);
    }

    // Create temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-install-'));

    try {
        // Clone repository
        if (!cloneRepository(tempDir)) {
            process.exit(1);
        }

        // Validate repository
        if (!validateRepository(tempDir)) {
            process.exit(1);
        }

        // Parse arguments and install
        const command = args[0];
        switch (command) {
            case '-g':
            case '--global':
                installGlobal(tempDir);
                success('OpenCode Agents installation completed!');
                info("Run 'opencode' to start using the agents.");
                info("For help, see: https://github.com/shahboura/agents-opencode");
                break;
            case '-p':
            case '--project':
                if (args.length < 2) {
                    error('Project directory required');
                    showUsage();
                }
                if (!installProject(tempDir, args[1])) {
                    process.exit(1);
                } else {
                    success('OpenCode Agents installation completed!');
                    info("Run 'opencode' to start using the agents.");
                    info("For help, see: https://github.com/shahboura/agents-opencode");
                }
                break;
            default:
                error(`Unknown option: ${command}`);
                showUsage();
        }

    } finally {
        // Clean up temporary directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (err) {
            warning(`Failed to clean up temporary directory: ${tempDir}`);
        }
    }
}

if (require.main === module) {
    main();
}
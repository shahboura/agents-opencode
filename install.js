#!/usr/bin/env node

/**
 * OpenCode Agents Installation Script
 * Cross-platform installer for Windows, Linux, and macOS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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
        execSync('git clone --depth 1 --quiet https://github.com/shahboura/agents-opencode.git .', {
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

function verifyInstallation(installDir) {
    try {
        // Check for essential directories
        const requiredDirs = ['agent', 'instructions', 'prompts'];
        for (const dir of requiredDirs) {
            const dirPath = path.join(installDir, dir);
            if (!fs.existsSync(dirPath)) {
                error(`Missing required directory: ${dir}`);
                return false;
            }
        }

        // Check for configuration file
        const configFile = path.join(path.dirname(installDir), 'opencode.json');
        if (!fs.existsSync(configFile)) {
            error('Missing configuration file: opencode.json');
            return false;
        }

        // Check for at least one agent
        const agentDir = path.join(installDir, 'agent');
        const agents = fs.readdirSync(agentDir).filter(file => file.endsWith('.md'));
        if (agents.length === 0) {
            error('No agent files found in agent directory');
            return false;
        }

        return true;
    } catch (err) {
        error(`Installation verification failed: ${err.message}`);
        return false;
    }
}

function checkVersion(tempDir) {
    try {
        const packagePath = path.join(tempDir, 'package.json');
        if (fs.existsSync(packagePath)) {
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const version = packageData.version;
            info(`Installing OpenCode Agents v${version}`);
            return version;
        }
    } catch (err) {
        // Ignore version check errors
    }
    return null;
}

function installGlobal(tempDir) {
    info('Installing agents globally...');

    const globalConfigDir = getGlobalConfigDir();

    // Backup existing installation if it exists
    if (fs.existsSync(globalConfigDir)) {
        const backupDir = `${globalConfigDir}.backup.${Date.now()}`;
        try {
            fs.renameSync(globalConfigDir, backupDir);
            info(`Backed up existing installation to ${backupDir}`);
        } catch (err) {
            warning(`Could not backup existing installation: ${err.message}`);
        }
    }

    // Copy all .opencode/ contents
    const opencodeSrc = path.join(tempDir, '.opencode');
    if (fs.existsSync(opencodeSrc)) {
        copyRecursive(opencodeSrc, globalConfigDir);
        success(`✓ Copied all agent configurations`);
    }

    // Copy opencode.json
    const configSrc = path.join(tempDir, 'opencode.json');
    if (fs.existsSync(configSrc)) {
        fs.copyFileSync(configSrc, path.join(globalConfigDir, 'opencode.json'));
        success(`✓ Configuration installed`);
    }

    // Copy AGENTS.md template only if it doesn't exist (preserve user history)
    const agentsMdSrc = path.join(tempDir, 'AGENTS.md');
    const agentsMdDest = path.join(globalConfigDir, 'AGENTS.md');
    if (fs.existsSync(agentsMdSrc) && !fs.existsSync(agentsMdDest)) {
        fs.copyFileSync(agentsMdSrc, agentsMdDest);
        success(`✓ Session log template created`);
    } else if (fs.existsSync(agentsMdDest)) {
        info(`✓ Preserved existing session history`);
    }

    success('✅ Global installation completed successfully!');
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
        warning('Project directory is not a git repository. Agent session logging may be limited.');
    }

    // Create .opencode directory
    const opencodeDir = path.join(projectDir, '.opencode');
    ensureDir(opencodeDir);

    // Backup existing .opencode if it exists
    if (fs.existsSync(opencodeDir) && fs.readdirSync(opencodeDir).length > 0) {
        const backupDir = `${opencodeDir}.backup.${Date.now()}`;
        try {
            fs.renameSync(opencodeDir, backupDir);
            info(`Backed up existing .opencode to ${backupDir}`);
            ensureDir(opencodeDir); // Recreate the directory
        } catch (err) {
            warning(`Could not backup existing .opencode: ${err.message}`);
        }
    }

    // Copy all .opencode/ contents
    const opencodeSrc = path.join(tempDir, '.opencode');
    if (fs.existsSync(opencodeSrc)) {
        copyRecursive(opencodeSrc, opencodeDir);
        success(`✓ Copied all agent configurations`);
    }

    // Copy opencode.json
    const configSrc = path.join(tempDir, 'opencode.json');
    if (fs.existsSync(configSrc)) {
        fs.copyFileSync(configSrc, path.join(projectDir, 'opencode.json'));
        success(`✓ Configuration installed`);
    }

    // Copy AGENTS.md template if it doesn't exist (preserve user history)
    const agentsMdSrc = path.join(tempDir, 'AGENTS.md');
    const agentsMdDest = path.join(projectDir, 'AGENTS.md');
    if (fs.existsSync(agentsMdSrc) && !fs.existsSync(agentsMdDest)) {
        fs.copyFileSync(agentsMdSrc, agentsMdDest);
        success(`✓ Session log template created`);
    } else if (fs.existsSync(agentsMdDest)) {
        info(`✓ Preserved existing session history`);
    }

    // Copy examples directory for learning
    const examplesSrc = path.join(tempDir, 'examples');
    if (fs.existsSync(examplesSrc)) {
        const examplesDest = path.join(projectDir, 'examples');
        copyRecursive(examplesSrc, examplesDest);
        success(`✓ Examples installed for learning`);
    }

    // Verify installation
    if (verifyInstallation(opencodeDir)) {
        success('✅ Project installation completed successfully!');
        info(`Agents configured for: ${projectDir}`);
        info(`Configuration: ${path.join(projectDir, 'opencode.json')}`);
        return true;
    } else {
        error('❌ Installation verification failed. Please check the project directory.');
        return false;
    }
}

function uninstall() {
    info('Uninstalling OpenCode Agents from current directory...');

    const currentDir = process.cwd();
    const opencodeDir = path.join(currentDir, '.opencode');
    const agentsMdPath = path.join(currentDir, 'AGENTS.md');
    const configPath = path.join(currentDir, 'opencode.json');



    let foundInstallation = false;

    try {
        // Check for any OpenCode installation files/directories
        if (fs.existsSync(opencodeDir) || fs.existsSync(configPath)) {
            foundInstallation = true;

            // Remove opencode.json
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
                success(`✅ Removed opencode.json`);
            }

            // Remove .opencode directory entirely
            if (fs.existsSync(opencodeDir)) {
                fs.rmSync(opencodeDir, { recursive: true, force: true });
                success(`✅ Removed agent configurations`);
            }

            success('✅ OpenCode Agents uninstalled from current directory!');
            info('Agent configurations removed (can be re-installed).');

            // Remove the install script itself
            const scriptPath = path.join(currentDir, 'install.js');
            if (fs.existsSync(scriptPath)) {
                try {
                    fs.unlinkSync(scriptPath);
                    success(`✅ Removed installation script`);
                } catch (err) {
                    warning(`Could not remove install script: ${err.message}`);
                }
            }
        }

        if (!foundInstallation) {
            warning('No OpenCode Agents installation found in current directory.');
        }

    } catch (err) {
        error(`❌ Failed to uninstall: ${err.message}`);
        return false;
    }

    return true;
}

function showVersion(tempDir) {
    try {
        const packagePath = path.join(tempDir, 'package.json');
        if (fs.existsSync(packagePath)) {
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            console.log(`OpenCode Agents v${packageData.version}`);
            console.log(`Repository: https://github.com/shahboura/agents-opencode`);
        } else {
            console.log('OpenCode Agents (version unknown)');
        }
    } catch (err) {
        console.log('OpenCode Agents (version check failed)');
    }
}

function showUsage() {
    console.log(`
🤖 OpenCode Agents Installation Script

USAGE:
    node install.js [OPTIONS]

OPTIONS:
    -g, --global                Install agents globally (available in all projects)
    -p, --project DIR           Install agents for specific project directory
    -u, --uninstall             Remove agents from current directory
    -v, --version               Show version information
    -h, --help                  Show this help message

EXAMPLES:
    node install.js --global                    # Install globally
    node install.js --project /path/to/project  # Install for specific project
    node install.js --project .                 # Install in current directory
    node install.js --uninstall                 # Remove from current directory

PREREQUISITES:
    - Git (for downloading)
    - Node.js/npm
    - Internet connection

FEATURES:
    ✓ Cross-platform (Windows/Linux/macOS)
    ✓ Automatic backups of existing installations
    ✓ Preserves user session history (AGENTS.md)
    ✓ Post-installation verification
    ✓ Includes examples and learning materials

For more information, visit: https://github.com/shahboura/agents-opencode
`);
    process.exit(1);
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        showUsage();
    }

    // Handle uninstall separately (doesn't need repository clone)
    const hasUninstall = args.includes('-u') || args.includes('--uninstall');
    if (hasUninstall) {
        if (uninstall()) {
            success('Uninstallation completed!');
        }
        return;
    }

    // Check prerequisites for install operations
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
        info('🚀 Starting OpenCode Agents installation...');

        // Clone repository
        if (!cloneRepository(tempDir)) {
            error('❌ Repository download failed');
            process.exit(1);
        }

        // Check version
        const version = checkVersion(tempDir);
        if (version) {
            info(`📦 Installing version ${version}`);
        }

        // Validate repository
        if (!validateRepository(tempDir)) {
            error('❌ Repository validation failed');
            process.exit(1);
        }

        // Parse arguments and install
        const command = args[0];
        switch (command) {
            case '-g':
            case '--global':
                installGlobal(tempDir);
                info("\n🎯 Next steps:");
                info("1. Run 'opencode' to start using the agents");
                info("2. Type '@' to see available agents");
                info("3. Try: @codebase Create a user API endpoint");
                info("\n📚 Documentation: https://github.com/shahboura/agents-opencode");
                break;
            case '-p':
            case '--project':
                if (args.length < 2) {
                    error('Project directory required');
                    showUsage();
                }
                if (!installProject(tempDir, args[1])) {
                    error('❌ Project installation failed');
                    process.exit(1);
                } else {
                    const projectPath = path.resolve(args[1]);
                    info("\n🎯 Next steps:");
                    info(`1. cd ${projectPath}`);
                    info("2. Run 'opencode' to start using the agents");
                    info("3. Type '@' to see available agents");
                    info("\n📚 Documentation: https://github.com/shahboura/agents-opencode");
                }
                break;
            case '-v':
            case '--version':
                showVersion(tempDir);
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
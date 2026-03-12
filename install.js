#!/usr/bin/env node

/**
 * OpenCode Agents Installation Script
 * Cross-platform installer for Windows, Linux, and macOS
 */

const fs = require('fs');
const path = require('path');
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

// Cross-platform path handling
function getHomeDir() {
    return os.homedir();
}

function getGlobalConfigDir() {
    const home = getHomeDir();
    return path.join(home, '.config', 'opencode');
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

function validatePackageContents(sourceDir) {
    const opencodeDir = path.join(sourceDir, '.opencode');
    if (!fs.existsSync(opencodeDir)) {
        error('Invalid repository structure. Missing .opencode directory.');
        return false;
    }
    return true;
}

function verifyInstallation(installDir) {
    try {
        // Check for essential directories
        const requiredDirs = ['agent', 'instructions', 'commands'];
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

function checkVersion(sourceDir) {
    try {
        const packagePath = path.join(sourceDir, 'package.json');
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

function installGlobal(sourceDir) {
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
    const opencodeSrc = path.join(sourceDir, '.opencode');
    if (fs.existsSync(opencodeSrc)) {
        copyRecursive(opencodeSrc, globalConfigDir);
        success(`✓ Copied all agent configurations`);
    }

    // Copy opencode.json
    const configSrc = path.join(sourceDir, 'opencode.json');
    if (fs.existsSync(configSrc)) {
        fs.copyFileSync(configSrc, path.join(globalConfigDir, 'opencode.json'));
        success(`✓ Configuration installed`);
    }

    // AGENTS.md is created on first agent run (not during install)

    success('✅ Global installation completed successfully!');
    info(`Configuration location: ${globalConfigDir}`);
    info('Agents are now available in all your projects.');
}

function installProject(sourceDir, projectDir) {
    info(`Installing agents for project: ${projectDir}`);

    // Check if project directory exists
    if (!fs.existsSync(projectDir)) {
        error(`Project directory does not exist: ${projectDir}`);
        return false;
    }

    // Create .opencode directory (backup first if non-empty)
    const opencodeDir = path.join(projectDir, '.opencode');

    if (fs.existsSync(opencodeDir) && fs.readdirSync(opencodeDir).length > 0) {
        const backupDir = `${opencodeDir}.backup.${Date.now()}`;
        try {
            fs.renameSync(opencodeDir, backupDir);
            info(`Backed up existing .opencode to ${backupDir}`);
        } catch (err) {
            warning(`Could not backup existing .opencode: ${err.message}`);
        }
    }

    ensureDir(opencodeDir);

    // Copy all .opencode/ contents
    const opencodeSrc = path.join(sourceDir, '.opencode');
    if (fs.existsSync(opencodeSrc)) {
        copyRecursive(opencodeSrc, opencodeDir);
        success(`✓ Copied all agent configurations`);
    }

    // Copy opencode.json
    const configSrc = path.join(sourceDir, 'opencode.json');
    if (fs.existsSync(configSrc)) {
        fs.copyFileSync(configSrc, path.join(projectDir, 'opencode.json'));
        success(`✓ Configuration installed`);
    }

    // AGENTS.md is created on first agent run (not during install)

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
        if (fs.existsSync(opencodeDir) || fs.existsSync(configPath) || fs.existsSync(agentsMdPath)) {
            foundInstallation = true;

            // Backup AGENTS.md with timestamp
            if (fs.existsSync(agentsMdPath)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const backupAgentsMd = path.join(currentDir, `AGENTS.${timestamp}.bk.md`);
                fs.renameSync(agentsMdPath, backupAgentsMd);
                success(`✅ Session history backed up to: AGENTS.${timestamp}.bk.md`);
            }

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

// Language-to-instruction file mapping
const LANGUAGE_MAP = {
    dotnet: 'dotnet-clean-architecture.instructions.md',
    python: 'python-best-practices.instructions.md',
    typescript: 'typescript-strict.instructions.md',
    flutter: 'flutter.instructions.md',
    go: 'go.instructions.md',
    java: 'java-spring-boot.instructions.md',
    node: 'node-express.instructions.md',
    react: 'react-next.instructions.md',
    ruby: 'ruby-on-rails.instructions.md',
    rust: 'rust.instructions.md',
    sql: 'sql-migrations.instructions.md',
    cicd: 'ci-cd-hygiene.instructions.md',
};

const LANGUAGE_INSTRUCTIONS = new Set(Object.values(LANGUAGE_MAP));

// Content-focused instruction files that are always kept
const ALWAYS_KEEP = [
    'blogger.instructions.md',
    'brutal-critic.instructions.md',
];

function filterLanguages(installDir, languages) {
    const instructionsDir = path.join(installDir, 'instructions');
    if (!fs.existsSync(instructionsDir)) {
        warning('No instructions directory found — skipping language filter.');
        return;
    }

    // Validate requested languages
    const validLanguages = Object.keys(LANGUAGE_MAP);
    const requested = languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
    const invalid = requested.filter(l => !validLanguages.includes(l));
    if (invalid.length > 0) {
        warning(`Unknown language(s): ${invalid.join(', ')}`);
        info(`Available: ${validLanguages.join(', ')}`);
    }

    const valid = requested.filter(l => validLanguages.includes(l));
    if (valid.length === 0) {
        warning('No valid languages specified — keeping all instruction files.');
        return;
    }

    // Build set of files to keep
    const keepFiles = new Set(ALWAYS_KEEP);
    for (const lang of valid) {
        if (LANGUAGE_MAP[lang]) {
            keepFiles.add(LANGUAGE_MAP[lang]);
        }
    }

    // Scan and remove non-matching instruction files
    const allFiles = fs.readdirSync(instructionsDir);
    const kept = [];
    const removed = [];

    for (const file of allFiles) {
        if (keepFiles.has(file) || !LANGUAGE_INSTRUCTIONS.has(file)) {
            kept.push(file);
        } else {
            const filePath = path.join(instructionsDir, file);
            try {
                fs.unlinkSync(filePath);
                removed.push(file);
            } catch (err) {
                warning(`Could not remove ${file}: ${err.message}`);
            }
        }
    }

    if (kept.length > 0) {
        success(`✓ Kept ${kept.length} instruction file(s): ${kept.join(', ')}`);
    }
    if (removed.length > 0) {
        info(`Removed ${removed.length} instruction file(s): ${removed.join(', ')}`);
    }
}

function showVersion(sourceDir) {
    try {
        const packagePath = path.join(sourceDir, 'package.json');
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

function showUsage(exitCode = 0) {
    console.log(`
🤖 OpenCode Agents Installation Script

USAGE:
    node install.js [OPTIONS]

OPTIONS:
    -g, --global                Install agents globally (available in all projects)
    -p, --project DIR           Install agents for specific project directory
    -U, --update                Update existing installation to latest version
    -l, --languages LANGS       Only install specified language standards (comma-separated)
                                Available: dotnet,python,typescript,flutter,go,java,node,react,ruby,rust,sql,cicd
    -u, --uninstall             Remove agents from current directory
    -v, --version               Show version information
    -h, --help                  Show this help message

EXAMPLES:
    node install.js --global                                    # Install globally
    node install.js --project /path/to/project                  # Install for specific project
    node install.js --project .                                 # Install in current directory
    node install.js --update                                    # Update existing installation
    node install.js --global --languages python,typescript      # Install with specific languages only
    node install.js --uninstall                                 # Remove from current directory
    npx agents-opencode --global                                # Install via npx

 PREREQUISITES:
     - Node.js

 NOTES:
     - npx/npm install downloads a published package version
     - Git is not required

 FEATURES:
     ✓ Cross-platform (Windows/Linux/macOS)
     ✓ Automatic backups of existing installations
     ✓ AGENTS.md created on first agent run
     ✓ Post-installation verification
     ✓ Deterministic installs from published package contents

 INSTALLATION LOCATIONS:
    Global: ~/.config/opencode/ (Linux/macOS/Windows)
    Project: ./.opencode/ in your project directory

For more information, visit: https://github.com/shahboura/agents-opencode
`);
    process.exit(exitCode);
}

function main() {
    let args = process.argv.slice(2);
    const sourceDir = __dirname;

    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        showUsage(0);
    }

    // Handle uninstall separately (no install source needed)
    const hasUninstall = args.includes('-u') || args.includes('--uninstall');
    if (hasUninstall) {
        if (uninstall()) {
            success('Uninstallation completed!');
        }
        return;
    }

    // Parse --languages flag (can appear anywhere in args)
    let languages = null;
    const langIdx = args.findIndex(a => a === '-l' || a === '--languages');
    if (langIdx !== -1) {
        if (langIdx + 1 >= args.length) {
            error('--languages requires a comma-separated list of languages.');
            info(`Available: ${Object.keys(LANGUAGE_MAP).join(', ')}`);
            process.exit(1);
        }
        languages = args[langIdx + 1];
        // Remove the flag and its value from args so they don't interfere with command parsing
        args.splice(langIdx, 2);
    }

    // Handle --update (auto-detect install location)
    const hasUpdate = args.includes('-U') || args.includes('--update');
    if (hasUpdate) {
        const globalConfigDir = getGlobalConfigDir();
        const localOpencodeDir = path.join(process.cwd(), '.opencode');

        const hasGlobal = fs.existsSync(globalConfigDir);
        const hasLocal = fs.existsSync(localOpencodeDir);

        if (!hasGlobal && !hasLocal) {
            error('No existing installation found. Use --global or --project to install.');
            process.exit(1);
        }

        info('🔄 Updating OpenCode Agents installation...');

        const version = checkVersion(sourceDir);
        if (version) {
            info(`📦 Updating to version ${version}`);
        }

        if (!validatePackageContents(sourceDir)) {
            error('❌ Package validation failed');
            process.exit(1);
        }

        if (hasGlobal) {
            installGlobal(sourceDir);
            if (languages) {
                filterLanguages(globalConfigDir, languages);
            }
            info('✅ Global installation updated.');
        } else if (hasLocal) {
            installProject(sourceDir, process.cwd());
            if (languages) {
                filterLanguages(localOpencodeDir, languages);
            }
            info('✅ Project installation updated.');
        }
        return;
    }

    info('🚀 Starting OpenCode Agents installation...');

    // Check version
    const version = checkVersion(sourceDir);
    if (version) {
        info(`📦 Installing version ${version}`);
    }

    // Validate package contents
    if (!validatePackageContents(sourceDir)) {
        error('❌ Package validation failed');
        process.exit(1);
    }

    // Parse arguments and install
    const command = args[0];
    switch (command) {
        case '-g':
        case '--global':
            installGlobal(sourceDir);
            if (languages) {
                filterLanguages(getGlobalConfigDir(), languages);
            }
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
                showUsage(1);
            }
            if (!installProject(sourceDir, args[1])) {
                error('❌ Project installation failed');
                process.exit(1);
            } else {
                const projectPath = path.resolve(args[1]);
                if (languages) {
                    filterLanguages(path.join(projectPath, '.opencode'), languages);
                }
                info("\n🎯 Next steps:");
                info(`1. cd ${projectPath}`);
                info("2. Run 'opencode' to start using the agents");
                info("3. Type '@' to see available agents");
                info("\n📚 Documentation: https://github.com/shahboura/agents-opencode");
            }
            break;
        case '-v':
        case '--version':
            showVersion(sourceDir);
            break;
        default:
            error(`Unknown option: ${command}`);
            showUsage(1);
    }
}

if (require.main === module) {
    main();
}

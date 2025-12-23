#!/bin/bash

# OpenCode Agents Installation Script
# This script sets up OpenCode agents for local or project-specific use

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to backup existing files
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        print_warning "Backed up $file to $backup"
    fi
}

# Main installation function
install_agents() {
    local install_type="$1"
    local project_dir="$2"

    print_status "Starting OpenCode Agents installation..."

    # Check prerequisites
    if ! command_exists git; then
        print_error "Git is required but not installed. Please install git first."
        exit 1
    fi

    if ! command_exists npm; then
        print_error "Node.js/npm is required but not installed. Please install Node.js first."
        exit 1
    fi

    # Create temporary directory for cloning
    temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT

    print_status "Cloning OpenCode Agents repository..."
    if ! git clone https://github.com/shahboura/agents-opencode.git "$temp_dir" >/dev/null 2>&1; then
        print_error "Failed to clone repository. Please check your internet connection."
        exit 1
    fi

    cd "$temp_dir"

    # Validate the repository
    if [ ! -d ".opencode" ]; then
        print_error "Invalid repository structure. Missing .opencode directory."
        exit 1
    fi

    case "$install_type" in
        "global")
            install_global
            ;;
        "project")
            if [ -z "$project_dir" ]; then
                print_error "Project directory required for project installation"
                usage
            fi
            install_project "$project_dir"
            ;;
        *)
            print_error "Invalid installation type: $install_type"
            usage
            ;;
    esac

    print_success "OpenCode Agents installation completed!"
    print_status "Run 'opencode' to start using the agents."
    print_status "For help, see: https://github.com/shahboura/agents-opencode"
}

# Global installation (available in all projects)
install_global() {
    print_status "Installing agents globally..."

    local global_config_dir="$HOME/.config/opencode"

    # Create global config directory
    mkdir -p "$global_config_dir"

    # Copy agent configurations
    if [ -d ".opencode/agent" ]; then
        mkdir -p "$global_config_dir/agent"
        cp -r .opencode/agent/* "$global_config_dir/agent/"
        print_success "Copied agent configurations to $global_config_dir/agent/"
    fi

    # Copy instructions
    if [ -d ".opencode/instructions" ]; then
        mkdir -p "$global_config_dir/instructions"
        cp -r .opencode/instructions/* "$global_config_dir/instructions/"
        print_success "Copied instructions to $global_config_dir/instructions/"
    fi

    # Copy prompts
    if [ -d ".opencode/prompts" ]; then
        mkdir -p "$global_config_dir/prompts"
        cp -r .opencode/prompts/* "$global_config_dir/prompts/"
        print_success "Copied prompts to $global_config_dir/prompts/"
    fi

    # Copy opencode.json
    if [ -f "opencode.json" ]; then
        cp opencode.json "$global_config_dir/"
        print_success "Copied configuration to $global_config_dir/opencode.json"
    fi

    print_success "Global installation completed!"
    print_status "Agents are now available in all your projects."
}

# Project-specific installation
install_project() {
    local project_dir="$1"

    print_status "Installing agents for project: $project_dir"

    # Check if project directory exists
    if [ ! -d "$project_dir" ]; then
        print_error "Project directory does not exist: $project_dir"
        exit 1
    fi

    # Check if it's a git repository (optional but recommended)
    if [ ! -d "$project_dir/.git" ]; then
        print_warning "Project directory is not a git repository. Consider initializing git first."
    fi

    cd "$project_dir"

    # Create .opencode directory structure
    mkdir -p .opencode/agent
    mkdir -p .opencode/instructions
    mkdir -p .opencode/prompts

    # Copy files from temp directory
    cp -r "$temp_dir/.opencode/agent/"* .opencode/agent/ 2>/dev/null || true
    cp -r "$temp_dir/.opencode/instructions/"* .opencode/instructions/ 2>/dev/null || true
    cp -r "$temp_dir/.opencode/prompts/"* .opencode/prompts/ 2>/dev/null || true

    # Copy opencode.json
    cp "$temp_dir/opencode.json" . 2>/dev/null || true

    # Copy AGENTS.md template
    if [ ! -f "AGENTS.md" ]; then
        cp "$temp_dir/AGENTS.md" . 2>/dev/null || true
    fi

    print_success "Project installation completed!"
    print_status "Agents configured for: $project_dir"
}

# Function to show usage
usage() {
    cat << EOF
OpenCode Agents Installation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -g, --global                Install agents globally (available in all projects)
    -p, --project DIR           Install agents for specific project directory
    -h, --help                  Show this help message

EXAMPLES:
    $0 --global                 # Install globally
    $0 --project /path/to/my/project  # Install for specific project
    $0 --project .               # Install in current directory

PREREQUISITES:
    - Git
    - Node.js/npm
    - Internet connection

For more information, visit: https://github.com/shahboura/agents-opencode
EOF
    exit 1
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    usage
fi

case "$1" in
    -g|--global)
        install_agents "global"
        ;;
    -p|--project)
        if [ -z "$2" ]; then
            print_error "Project directory required"
            usage
        fi
        install_agents "project" "$2"
        ;;
    -h|--help)
        usage
        ;;
    *)
        print_error "Unknown option: $1"
        usage
        ;;
esac
# OpenCode Agents Installation Script (Windows)

param(
    [string]$TargetDir = "$env:USERPROFILE\.opencode"
)

Write-Host "🚀 Installing OpenCode Agents..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path ".opencode/agent")) {
    Write-Host "❌ Error: .opencode/agent directory not found. Please run this script from the agents-opencode repository root." -ForegroundColor Red
    exit 1
}

# Create target directory if it doesn't exist
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

Write-Host "📁 Installing to: $TargetDir" -ForegroundColor Blue

# Copy all OpenCode directories
Get-ChildItem -Path ".opencode" -Directory | ForEach-Object {
    $dirName = $_.Name
    Write-Host "📋 Copying $dirName..." -ForegroundColor Blue
    Copy-Item -Path $_.FullName -Destination $TargetDir -Recurse -Force
}

# Copy configuration files
if (Test-Path "opencode.json") {
    Copy-Item -Path "opencode.json" -Destination $TargetDir -Force
}

# Copy AGENTS.md template only if it doesn't exist (preserve user history)
if ((Test-Path "AGENTS.md") -and (-not (Test-Path "$TargetDir/AGENTS.md"))) {
    Copy-Item -Path "AGENTS.md" -Destination $TargetDir -Force
}

Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open OpenCode: opencode"
Write-Host "2. Type @ to see available agents"
Write-Host "3. Try: @codebase Create a user API endpoint"
Write-Host ""
Write-Host "📚 For more info: https://github.com/shahboura/agents-opencode" -ForegroundColor Blue
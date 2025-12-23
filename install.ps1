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

# Copy agent files
Copy-Item -Path ".opencode/agent" -Destination $TargetDir -Recurse -Force

Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open OpenCode: opencode"
Write-Host "2. Type @ to see available agents"
Write-Host "3. Try: @codebase Create a user API endpoint"
Write-Host ""
Write-Host "📚 For more info: https://github.com/shahboura/agents-opencode" -ForegroundColor Blue
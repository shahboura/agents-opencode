# OpenCode Agents Installation Script (Windows)

param(
    [string]$TargetDir = "$env:USERPROFILE\.opencode"
)

$REPO_URL = "https://github.com/shahboura/agents-opencode.git"
$TEMP_DIR = [System.IO.Path]::GetTempPath() + [System.Guid]::NewGuid().ToString()

Write-Host "🚀 Installing OpenCode Agents..." -ForegroundColor Green

# Download repository
Write-Host "📥 Downloading repository..." -ForegroundColor Yellow
try {
    & git clone --depth 1 --quiet $REPO_URL $TEMP_DIR
    if ($LASTEXITCODE -ne 0) {
        throw "Git clone failed"
    }
} catch {
    Write-Host "❌ Error: Failed to download repository. Make sure git is installed." -ForegroundColor Red
    exit 1
}

# Change to downloaded directory
Push-Location $TEMP_DIR

try {
    # Verify we have the right files
    if (-not (Test-Path ".opencode/agent")) {
        Write-Host "❌ Error: Downloaded repository is missing .opencode/agent directory." -ForegroundColor Red
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
        Write-Host "📋 Copying $dirName..." -ForegroundColor Gray
        Copy-Item -Path $_.FullName -Destination "$TargetDir\$dirName" -Recurse -Force
    }

    # Copy configuration files
    if (Test-Path "opencode.json") {
        Copy-Item -Path "opencode.json" -Destination $TargetDir -Force
    }

    # Copy AGENTS.md template only if it doesn't exist (preserve user history)
    if ((Test-Path "AGENTS.md") -and -not (Test-Path "$TargetDir/AGENTS.md")) {
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

} finally {
    # Clean up
    Pop-Location
    Remove-Item -Path $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
}
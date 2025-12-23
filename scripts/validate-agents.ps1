# Agent Configuration Validator
$ErrorActionPreference = "Stop"

# Check both agent directories
$copilotPath = ".github/agents"
$opencodePath = ".opencode/agent"
$errors = @()
$warnings = @()

Write-Host "Validating Agent Configurations..." -ForegroundColor Cyan

# Determine which agent system is in use
$agentFiles = @()

if (Test-Path $opencodePath) {
    Write-Host "Found OpenCode agents directory" -ForegroundColor Green
    $agentFiles = Get-ChildItem -Path $opencodePath -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }
    $agentType = "opencode"
} elseif (Test-Path $copilotPath) {
    Write-Host "Found GitHub Copilot agents directory" -ForegroundColor Green
    $agentFiles = Get-ChildItem -Path $copilotPath -Filter "*.agent.md"
    $agentType = "copilot"
} else {
    Write-Host "ERROR: No agent directory found (.github/agents or .opencode/agent)" -ForegroundColor Red
    exit 1
}

if ($agentFiles.Count -eq 0) {
    Write-Host "ERROR: No agent files found" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($agentFiles.Count) $agentType agent files`n" -ForegroundColor Green

# Different required fields based on agent type
if ($agentType -eq "copilot") {
    $requiredFields = @('name', 'description', 'tools')
} else {
    $requiredFields = @('description', 'mode')
}

foreach ($file in $agentFiles) {
    Write-Host "Validating: $($file.Name)" -ForegroundColor Yellow
    
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
    } catch {
        $errors += "$($file.Name): Failed to read file - $($_.Exception.Message)"
        continue
    }
    
    if ($content -notmatch '(?ms)^---\s*\n(.+?)\n---') {
        $errors += "$($file.Name): Missing frontmatter (---...---)"
        continue
    }
    
    $frontmatter = $Matches[1]
    
    foreach ($field in $requiredFields) {
        if ($frontmatter -notmatch "(?m)^$field\s*:") {
            $errors += "$($file.Name): Missing required field '$field'"
        }
    }
    
    # Type-specific validation
    if ($agentType -eq "copilot") {
        # Copilot-specific checks
        if ($frontmatter -match 'name\s*:\s*(.+)') {
            $name = $Matches[1].Trim()
            if ($name -match '\s') {
                $warnings += "$($file.Name): Agent name contains spaces: '$name'"
            }
            if ($file.BaseName -ne "$name.agent") {
                $warnings += "$($file.Name): Filename doesn't match agent name (expected: $name.agent.md)"
            }
        }
        
        if ($frontmatter -notmatch "tools\s*:\s*\[.+\]") {
            $errors += "$($file.Name): 'tools' must be an array [...]"
        }
    } else {
        # OpenCode-specific checks
        if ($frontmatter -match 'mode\s*:\s*(.+)') {
            $mode = $Matches[1].Trim()
            if ($mode -notin @('primary', 'secondary', 'utility')) {
                $warnings += "$($file.Name): Unusual mode value: '$mode' (expected: primary, secondary, or utility)"
            }
        }
        
        if ($frontmatter -notmatch "permission\s*:") {
            $warnings += "$($file.Name): Missing 'permission' section"
        }
    }
    
    # Common checks
    if ($content -notmatch '(?m)^##?\s+(Role|Description)') {
        $warnings += "$($file.Name): Missing Role/Description section"
    }
    
    if ($agentType -eq "copilot" -and $content -notmatch '\*\*Start every response with:\*\*') {
        $warnings += "$($file.Name): Missing startup message instruction"
    }
    
    Write-Host "  ✓ Basic structure valid" -ForegroundColor Green
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Validation Results" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ All agents validated successfully!" -ForegroundColor Green
    exit 0
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ ERRORS ($($errors.Count)):" -ForegroundColor Red
    foreach ($errorMessage in $errors) {
        Write-Host "  • $errorMessage" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️  WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
    Write-Host "`n✅ Validation complete (warnings only)" -ForegroundColor Green
}

if ($errors.Count -gt 0) {
    exit 1
}

exit 0

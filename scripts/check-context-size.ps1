# Context File Size Monitor
$ErrorActionPreference = "Stop"

# Check for global installation first, then local
$globalContextFile = "$env:USERPROFILE\AppData\Local\opencode\AGENTS.md"
if ($IsLinux -or $IsMacOS) {
    $globalContextFile = "$HOME/.config/opencode/AGENTS.md"
}
$localContextFile = "AGENTS.md"

$contextFile = if (Test-Path $globalContextFile) { $globalContextFile } elseif (Test-Path $localContextFile) { $localContextFile } else { $null }

$maxSizeKB = 100
$pruneToKB = 75

Write-Host "Checking context file size..." -ForegroundColor Cyan

if (-not $contextFile) {
    Write-Host "WARNING: No AGENTS.md context file found in global or local location." -ForegroundColor Yellow
    exit 0
}

$file = Get-Item $contextFile
$sizeKB = [math]::Round($file.Length / 1KB, 2)

Write-Host "Current size: $sizeKB KB (Max: $maxSizeKB KB)" -ForegroundColor $(if ($sizeKB -gt $maxSizeKB) { "Yellow" } else { "Green" })

if ($sizeKB -gt $maxSizeKB) {
    Write-Host "`n⚠️  Context file exceeds $maxSizeKB KB - Pruning required!" -ForegroundColor Yellow
    
    $content = Get-Content -Path $contextFile -Raw
    
    if ($content -match '(?ms)^(.*?)(### \d{4}-\d{2}-\d{2}.*)$') {
        $header = $Matches[1]
        $entries = $Matches[2]
        
        $entryList = $entries -split '(?m)^### ' | Where-Object { $_.Trim() -ne '' }
        
        Write-Host "Found $($entryList.Count) context entries" -ForegroundColor Cyan
        
        $targetBytes = $pruneToKB * 1KB
        $headerBytes = [System.Text.Encoding]::UTF8.GetByteCount($header)
        $remainingBytes = $targetBytes - $headerBytes
        
        $keptEntries = @()
        $currentSize = 0
        
        foreach ($entry in $entryList) {
            $entrySize = [System.Text.Encoding]::UTF8.GetByteCount("### $entry")
            if ($currentSize + $entrySize -lt $remainingBytes) {
                $keptEntries += $entry
                $currentSize += $entrySize
            } else {
                break
            }
        }
        
        Write-Host "Keeping most recent $($keptEntries.Count) entries" -ForegroundColor Green
        Write-Host "Removing oldest $($entryList.Count - $keptEntries.Count) entries" -ForegroundColor Yellow
        
        $newContent = $header + ($keptEntries | ForEach-Object { "### $_" }) -join "`n`n"
        
        $backupFile = "$contextFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $contextFile $backupFile
        Write-Host "Backup created: $backupFile" -ForegroundColor Cyan
        
        Set-Content -Path $contextFile -Value $newContent -NoNewline
        
        $newFile = Get-Item $contextFile
        $newSizeKB = [math]::Round($newFile.Length / 1KB, 2)
        Write-Host "✅ Pruned to $newSizeKB KB" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Context file size is healthy" -ForegroundColor Green
}

exit 0

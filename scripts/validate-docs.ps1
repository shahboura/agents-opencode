# Documentation Link Validator
$ErrorActionPreference = "Stop"
$brokenLinks = @()

Write-Host "Validating documentation links..." -ForegroundColor Cyan

$mdFiles = Get-ChildItem -Path . -Include "*.md" -Recurse -File | Where-Object { 
    $_.FullName -notmatch '[\\/]node_modules[\\/]' -and 
    $_.FullName -notmatch '[\\/]\.git[\\/]'
}

Write-Host "Found $($mdFiles.Count) markdown files`n" -ForegroundColor Green

foreach ($file in $mdFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $relPath = $file.FullName.Replace($PWD, "").TrimStart('\', '/')
    
    $links = [regex]::Matches($content, '\[([^\]]+)\]\(([^\)]+)\)')
    
    if ($links.Count -eq 0) { continue }
    
    Write-Host "Checking: $relPath ($($links.Count) links)" -ForegroundColor Yellow
    
    foreach ($link in $links) {
        $linkText = $link.Groups[1].Value
        $linkPath = $link.Groups[2].Value
        
        if ($linkPath -match '^https?://') { continue }
        if ($linkPath -match '^#') { continue }
        
        $cleanPath = $linkPath -replace '#.*$', ''
        
        if ([string]::IsNullOrWhiteSpace($cleanPath)) { continue }
        
        $targetPath = if ($cleanPath.StartsWith('/')) {
            Join-Path $PWD $cleanPath.TrimStart('/')
        } else {
            Join-Path $file.DirectoryName $cleanPath
        }
        
        $targetPath = [System.IO.Path]::GetFullPath($targetPath)
        
        if (-not (Test-Path $targetPath)) {
            $brokenLinks += [PSCustomObject]@{
                File = $relPath
                LinkText = $linkText
                LinkPath = $linkPath
                ResolvedPath = $targetPath.Replace($PWD, "").TrimStart('\', '/')
            }
            Write-Host "  ✗ Broken: [$linkText]($linkPath)" -ForegroundColor Red
        }
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Validation Results" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($brokenLinks.Count -eq 0) {
    Write-Host "✅ All links are valid!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Found $($brokenLinks.Count) broken links:`n" -ForegroundColor Red
    $brokenLinks | Format-Table -AutoSize
    exit 1
}

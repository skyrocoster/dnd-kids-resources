<#
Opens one Chrome window per viewport width from the VF4 gate's manual verification matrix
(320px, 375px, 768px, and a desktop width), each pointed at the frontend dev server.

Each window gets its own throwaway Chrome profile (via --user-data-dir) so --window-size is
respected even if Chrome is already running elsewhere, and so the windows can be tiled onto
the screen without disturbing your normal Chrome session.

Note: --window-size sets the OS window size, not the page viewport — browser chrome (tab bar,
address bar) eats a bit of the requested height, and on some Chrome builds a few px of width.
Treat these as close approximations for layout checks, not pixel-exact viewports; use DevTools'
device toolbar (Ctrl+Shift+M) in any of these windows for an exact viewport width if needed.

Usage:
  .\scripts\open_responsive_checks.ps1                          # http://127.0.0.1:5173
  .\scripts\open_responsive_checks.ps1 -Url http://127.0.0.1:5173/dungeons
  .\scripts\open_responsive_checks.ps1 -Widths 320,768,1440
#>

param(
    [string]$Url = "http://127.0.0.1:5173",
    [int[]]$Widths = @(320, 375, 768, 1440),
    [int]$Height = 900
)

$ErrorActionPreference = "Stop"

function Find-Chrome {
    $candidates = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    $onPath = Get-Command chrome.exe -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    throw "Could not find chrome.exe. Pass -ChromePath explicitly or install Chrome."
}

$Chrome = Find-Chrome
$ProfileRoot = Join-Path $env:TEMP "dnd-kids-responsive-check"
New-Item -ItemType Directory -Force -Path $ProfileRoot | Out-Null

try {
    Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing | Out-Null
} catch {
    Write-Host "Warning: could not reach $Url — is the dev server running? (.\scripts\start_server.ps1)" -ForegroundColor Yellow
}

Write-Host "Opening $($Widths.Count) windows against $Url ..." -ForegroundColor Cyan

$left = 0
foreach ($width in $Widths) {
    $profileDir = Join-Path $ProfileRoot "w$width"
    $args = @(
        "--new-window",
        "--window-size=$width,$Height",
        "--window-position=$left,0",
        "--user-data-dir=$profileDir",
        "--no-first-run",
        "--no-default-browser-check",
        $Url
    )
    Start-Process -FilePath $Chrome -ArgumentList $args | Out-Null
    Write-Host "  ${width}px window opened (profile: $profileDir)" -ForegroundColor Green
    $left += $width + 20
    Start-Sleep -Milliseconds 400
}

Write-Host "`nDone. Close these windows when finished; the throwaway profiles live under $ProfileRoot" -ForegroundColor Cyan
Write-Host "and can be deleted any time (they hold no sign-in state, just window prefs)." -ForegroundColor Gray

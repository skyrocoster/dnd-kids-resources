<#
Starts a headless opencode server bound to this machine's LAN address so you can
drive it from a phone or tablet on the same network via a plain browser.

The server gates access with HTTP Basic auth when OPENCODE_SERVER_PASSWORD is set
(username is always "opencode"). Without it the server is wide open, so this
script generates and persists a password rather than letting that happen. It also
binds to the LAN IP only (never 0.0.0.0) and refuses to start on a Public network
profile, since an authenticated agent still runs commands as you.

Usage:
  .\scripts\opencode_remote.ps1
  .\scripts\opencode_remote.ps1 -Port 4096
  .\scripts\opencode_remote.ps1 -ShowPassword

Stop it with Ctrl+C.
#>

param(
    [int]$Port = 4096,
    [switch]$ShowPassword
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$RuleName = "opencode LAN (TCP $Port)"

# Kept outside the repo so it can never be committed.
$PasswordFile = Join-Path $env:LOCALAPPDATA "opencode\server-password.txt"

# --- Find the active LAN interface -----------------------------------------
$netProfile = Get-NetConnectionProfile |
    Where-Object { $_.IPv4Connectivity -ne "Disconnected" } |
    Select-Object -First 1

if (-not $netProfile) {
    Write-Host "No connected IPv4 network found." -ForegroundColor Red
    exit 1
}

if ($netProfile.NetworkCategory -eq "Public") {
    Write-Host "Network '$($netProfile.Name)' is on the Public profile." -ForegroundColor Red
    Write-Host "Refusing to expose an unauthenticated agent here. Switch the network to Private first." -ForegroundColor Red
    exit 1
}

$ipInfo = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $netProfile.InterfaceIndex |
    Where-Object { $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1

if (-not $ipInfo) {
    Write-Host "Could not determine a LAN IPv4 address for '$($netProfile.Name)'." -ForegroundColor Red
    exit 1
}

$LanIp = $ipInfo.IPAddress
$Prefix = $ipInfo.PrefixLength

# Derive the subnet in CIDR form so the firewall rule can be scoped to it.
$addrBytes = ([System.Net.IPAddress]::Parse($LanIp)).GetAddressBytes()
[array]::Reverse($addrBytes)
$addrLong = [int64][System.BitConverter]::ToUInt32($addrBytes, 0)
$maskLong = ([int64]0xFFFFFFFF -shl (32 - $Prefix)) -band 0xFFFFFFFF
$netBytes = [System.BitConverter]::GetBytes([uint32]($addrLong -band $maskLong))
[array]::Reverse($netBytes)
$Subnet = "$([System.Net.IPAddress]::new($netBytes))/$Prefix"

# --- Password ---------------------------------------------------------------
if ($env:OPENCODE_SERVER_PASSWORD) {
    $ServerPassword = $env:OPENCODE_SERVER_PASSWORD
    $PasswordSource = "OPENCODE_SERVER_PASSWORD environment variable"
}
elseif (Test-Path $PasswordFile) {
    $ServerPassword = (Get-Content $PasswordFile -Raw).Trim()
    $PasswordSource = $PasswordFile
}
else {
    $bytes = [byte[]]::new(18)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $ServerPassword = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("/", "_").Replace("+", "-")

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $PasswordFile) | Out-Null
    Set-Content -Path $PasswordFile -Value $ServerPassword -NoNewline
    $PasswordSource = "$PasswordFile (newly generated)"
}

if (-not $ServerPassword) {
    Write-Host "Server password is empty. Delete $PasswordFile and re-run to regenerate." -ForegroundColor Red
    exit 1
}

# --- Preflight --------------------------------------------------------------
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "Port $Port is already in use. Stop the existing listener or pass -Port." -ForegroundColor Red
    exit 1
}

if (-not (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue)) {
    Write-Host "Firewall rule '$RuleName' not found." -ForegroundColor Yellow
    Write-Host "Run this ONCE in an elevated PowerShell, then re-run this script:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  New-NetFirewallRule -DisplayName '$RuleName' -Direction Inbound ``" -ForegroundColor Cyan
    Write-Host "    -Action Allow -Protocol TCP -LocalPort $Port ``" -ForegroundColor Cyan
    Write-Host "    -Profile Private -RemoteAddress $Subnet" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Starting anyway — it will work from this machine, but the phone will be blocked." -ForegroundColor Yellow
    Write-Host ""
}

# --- Serve ------------------------------------------------------------------
Write-Host "Network : $($netProfile.Name) ($($netProfile.NetworkCategory))" -ForegroundColor Gray
Write-Host "Repo    : $RepoRoot" -ForegroundColor Gray
Write-Host ""
# The web UI routes a project as /<base64url of its worktree path>. The bare
# host:port lands on a Home screen whose project list is browser-local state,
# and whose "Add project" folder picker only searches under the user profile on
# C: -- so a repo on another drive can never be selected there. Hand out the
# direct project link instead.
$DirSegment = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($RepoRoot)).Replace('+', '-').Replace('/', '_')

Write-Host "Open this on your phone (same Wi-Fi):" -ForegroundColor Green
Write-Host "  http://${LanIp}:$Port/$DirSegment" -ForegroundColor Green
Write-Host ""
Write-Host "Bookmark that exact link. The bare http://${LanIp}:$Port shows an empty" -ForegroundColor Gray
Write-Host "Home screen with no projects - that is expected, not a fault." -ForegroundColor Gray
Write-Host "Serving: $RepoRoot" -ForegroundColor Gray
Write-Host ""
Write-Host "It will prompt for a login:" -ForegroundColor Green
Write-Host "  username: opencode" -ForegroundColor Green
if ($ShowPassword) {
    Write-Host "  password: $ServerPassword" -ForegroundColor Green
} else {
    Write-Host "  password: (stored) — re-run with -ShowPassword to print it" -ForegroundColor Green
}
Write-Host "  source  : $PasswordSource" -ForegroundColor Gray
Write-Host ""
Write-Host "Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

$env:OPENCODE_SERVER_PASSWORD = $ServerPassword
Push-Location $RepoRoot
try {
    opencode serve --hostname $LanIp --port $Port
}
finally {
    Pop-Location
}

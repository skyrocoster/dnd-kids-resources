[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "restart", "rebuild", "status", "logs")]
    [string]$Action = "status",
    [Parameter(Position = 1)]
    [ValidateSet("all", "backend", "frontend", "storybook", "datasette")]
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"
$ComposeFile = Join-Path $PSScriptRoot "compose.yaml"
$LiveDatabase = "/workspace/data/database/dnd_kids_resources.db"

function Invoke-BudgetedRun {
    param([string]$ContainerName, [string[]]$RunArgs, [int]$TimeoutSeconds)
    $arguments = @("compose", "--file", $ComposeFile, "--project-directory", $PSScriptRoot, "run", "--rm", "--no-deps", "--name", $ContainerName) + $RunArgs
    $quoted = ($arguments | ForEach-Object {
        if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
    $process = Start-Process -FilePath "docker" -ArgumentList $quoted -NoNewWindow -PassThru
    try {
        Wait-Process -InputObject $process -Timeout $TimeoutSeconds -ErrorAction SilentlyContinue
        if (-not $process.HasExited) {
            & docker rm -f $ContainerName *> $null
            $process.Kill()
            throw "Docker operation timed out after $TimeoutSeconds seconds."
        }
        return $process.ExitCode
    }
    finally {
        & docker rm -f $ContainerName *> $null
    }
}

function Test-LiveDatabase {
    $probe = "from pathlib import Path; raise SystemExit(0 if Path('$LiveDatabase').is_file() else 1)"
    $exitCode = Invoke-BudgetedRun -ContainerName "dnd-kids-db-probe" -RunArgs @("backend", "python", "-c", $probe) -TimeoutSeconds 90
    if ($exitCode -eq 0) { return $true }
    if ($exitCode -eq 1) { return $false }
    throw "Could not check the live database volume (exit code $exitCode)."
}

function Invoke-Compose {
    param([string[]]$Arguments)
    & docker compose --file $ComposeFile --project-directory $PSScriptRoot @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed with exit code $LASTEXITCODE." }
}

& docker info --format "{{.ServerVersion}}" *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker is unavailable. Start Docker Desktop and try again." }
$targets = if ($Service -eq "all") { @() } else { @($Service) }

switch ($Action) {
    "start" {
        if (-not (Test-LiveDatabase)) {
            throw "Live database is absent from the dnd-database volume. Restore it into the volume before starting; start will not initialize or seed it."
        }
        Invoke-Compose (@("up", "--detach", "--wait", "--wait-timeout", "180") + $targets)
    }
    "stop" { Invoke-Compose (@("stop") + $targets) }
    "restart" {
        if (-not (Test-LiveDatabase)) { throw "Live database is absent; restore it into the Docker volume before restarting." }
        Invoke-Compose (@("restart") + $targets)
        Invoke-Compose (@("up", "--detach", "--wait", "--wait-timeout", "180", "--no-recreate") + $targets)
    }
    "rebuild" {
        if (-not (Test-LiveDatabase)) { throw "Live database is absent; restore it into the Docker volume before rebuilding." }
        Invoke-Compose (@("up", "--detach", "--build", "--force-recreate", "--wait", "--wait-timeout", "300") + $targets)
    }
    "status" { Invoke-Compose (@("ps", "--all") + $targets) }
    "logs" { Invoke-Compose (@("logs", "--tail", "100", "--no-log-prefix") + $targets) }
}

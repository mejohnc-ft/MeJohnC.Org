#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs a Node.js application as a Windows Service using NSSM.
.DESCRIPTION
    This script installs and configures a Node.js application to run as a Windows Service.
    It supports both NSSM (Non-Sucking Service Manager) and native Windows Service via node-windows.
.PARAMETER ServiceName
    The name of the Windows service to create.
.PARAMETER AppPath
    Path to the Node.js application directory.
.PARAMETER EntryPoint
    The main entry file (default: index.js).
.PARAMETER UseNSSM
    Use NSSM for service management (default: true).
.EXAMPLE
    .\install-windows.ps1 -ServiceName "SiteManagerAgent" -AppPath "C:\apps\site-manager-agent"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceName,

    [Parameter(Mandatory=$true)]
    [string]$AppPath,

    [string]$EntryPoint = "index.js",

    [switch]$UseNSSM = $true,

    [string]$NodePath = "",

    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Windows Service Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Validate paths
if (-not (Test-Path $AppPath)) {
    Write-Error "Application path does not exist: $AppPath"
    exit 1
}

$EntryFile = Join-Path $AppPath $EntryPoint
if (-not (Test-Path $EntryFile)) {
    Write-Error "Entry point file does not exist: $EntryFile"
    exit 1
}

# Find Node.js
if ([string]::IsNullOrEmpty($NodePath)) {
    $NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    if ([string]::IsNullOrEmpty($NodePath)) {
        Write-Error "Node.js not found. Please install Node.js or specify -NodePath"
        exit 1
    }
}

Write-Host "Service Name: $ServiceName" -ForegroundColor Green
Write-Host "App Path: $AppPath" -ForegroundColor Green
Write-Host "Entry Point: $EntryPoint" -ForegroundColor Green
Write-Host "Node Path: $NodePath" -ForegroundColor Green
Write-Host ""

if ($UseNSSM) {
    # Check for NSSM
    $nssmPath = (Get-Command nssm -ErrorAction SilentlyContinue).Source

    if ([string]::IsNullOrEmpty($nssmPath)) {
        Write-Host "NSSM not found. Installing via winget..." -ForegroundColor Yellow
        winget install --id nssm.nssm --accept-source-agreements --accept-package-agreements
        $nssmPath = "nssm"
    }

    # Check if service already exists
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "Service '$ServiceName' already exists. Removing..." -ForegroundColor Yellow
        & $nssmPath stop $ServiceName 2>$null
        & $nssmPath remove $ServiceName confirm
    }

    Write-Host "Installing service with NSSM..." -ForegroundColor Cyan

    # Install service
    & $nssmPath install $ServiceName $NodePath $EntryFile

    # Configure service
    & $nssmPath set $ServiceName AppDirectory $AppPath
    & $nssmPath set $ServiceName DisplayName $ServiceName
    & $nssmPath set $ServiceName Description "MeJohnC.Org $ServiceName Service"
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    & $nssmPath set $ServiceName AppStdout (Join-Path $AppPath "logs\service.log")
    & $nssmPath set $ServiceName AppStderr (Join-Path $AppPath "logs\error.log")
    & $nssmPath set $ServiceName AppRotateFiles 1
    & $nssmPath set $ServiceName AppRotateBytes 1048576

    # Create logs directory
    $logsDir = Join-Path $AppPath "logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }

    # Set environment variables from .env file
    $envFilePath = Join-Path $AppPath $EnvFile
    if (Test-Path $envFilePath) {
        Write-Host "Loading environment variables from $EnvFile..." -ForegroundColor Cyan
        $envVars = @()
        Get-Content $envFilePath | ForEach-Object {
            if ($_ -match "^([^#=]+)=(.*)$") {
                $envVars += "$($matches[1])=$($matches[2])"
            }
        }
        if ($envVars.Count -gt 0) {
            & $nssmPath set $ServiceName AppEnvironmentExtra $envVars
        }
    }

    Write-Host ""
    Write-Host "Service installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  Start:   nssm start $ServiceName" -ForegroundColor White
    Write-Host "  Stop:    nssm stop $ServiceName" -ForegroundColor White
    Write-Host "  Restart: nssm restart $ServiceName" -ForegroundColor White
    Write-Host "  Status:  nssm status $ServiceName" -ForegroundColor White
    Write-Host "  Remove:  nssm remove $ServiceName confirm" -ForegroundColor White
    Write-Host ""

    # Start the service
    $startNow = Read-Host "Start service now? (Y/n)"
    if ($startNow -ne "n" -and $startNow -ne "N") {
        Write-Host "Starting service..." -ForegroundColor Cyan
        & $nssmPath start $ServiceName
        Start-Sleep -Seconds 2
        $status = & $nssmPath status $ServiceName
        Write-Host "Service status: $status" -ForegroundColor Green
    }
}
else {
    # Use node-windows (requires npm install -g node-windows)
    Write-Host "Installing using node-windows..." -ForegroundColor Cyan

    $nodeWindows = npm list -g node-windows 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing node-windows globally..." -ForegroundColor Yellow
        npm install -g node-windows
    }

    # Create service wrapper script
    $wrapperScript = @"
const Service = require('node-windows').Service;

const svc = new Service({
    name: '$ServiceName',
    description: 'MeJohnC.Org $ServiceName Service',
    script: '$($EntryFile -replace '\\', '\\\\')',
    nodeOptions: [],
    env: [{
        name: 'NODE_ENV',
        value: 'production'
    }]
});

svc.on('install', () => {
    console.log('Service installed. Starting...');
    svc.start();
});

svc.on('alreadyinstalled', () => {
    console.log('Service already installed.');
});

svc.on('start', () => {
    console.log('Service started.');
});

svc.install();
"@

    $wrapperPath = Join-Path $AppPath "install-service.js"
    Set-Content -Path $wrapperPath -Value $wrapperScript

    Push-Location $AppPath
    node $wrapperPath
    Pop-Location

    Write-Host "Service installed with node-windows." -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

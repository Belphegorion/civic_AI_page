# fix-eol-and-node-mods.ps1
# Run from repository root (PowerShell). Safe, non-destructive defaults.
# It will:
#  - set core.autocrlf = false locally
#  - add/update .gitignore
#  - add .gitattributes (normalize to LF)
#  - remove node_modules from git index (keeps them on disk)
#  - renormalize the repo and commit changes
#  - run npm install/ci in frontend and backend to produce lockfiles (if npm is available)
#  - stage & commit generated lockfiles
# Note: If you prefer to inspect changes before committing, run parts manually.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Pause-Confirm {
  param([string]$Message)
  $msg = "$Message [y/N]"
  $ans = Read-Host $msg
  if (-not $ans) { return $false }
  return $ans -match '^[Yy]'
}

# ensure git available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git is not installed or not in PATH. Install Git and re-run."
  exit 2
}

Write-Host ""
Write-Host "This script will modify .gitignore/.gitattributes, remove tracked node_modules, renormalize, and commit." -ForegroundColor Yellow
if (-not (Pause-Confirm "Continue?")) {
  Write-Host "Aborted by user."
  exit 0
}

# 1) set core.autocrlf = false locally
git config core.autocrlf false
Write-Host "Set git config core.autocrlf=false (local)."

# 2) ensure .gitignore
$gitignorePath = ".gitignore"
if (-not (Test-Path $gitignorePath)) {
  New-Item -Path $gitignorePath -ItemType File -Force | Out-Null
  Write-Host "Created .gitignore"
}

function Add-IfMissing {
  param($FilePath, $Line)
  if (-not (Test-Path $FilePath)) { New-Item -Path $FilePath -ItemType File -Force | Out-Null }
  $exists = Select-String -Path $FilePath -Pattern ([regex]::Escape($Line)) -SimpleMatch -Quiet -ErrorAction SilentlyContinue
  if (-not $exists) {
    Add-Content -Path $FilePath -Value $Line
    Write-Host ("Added to {0}: {1}" -f $FilePath, $Line)
  } else {
    Write-Host ("Already present in {0}: {1}" -f $FilePath, $Line)
  }
}

Add-IfMissing $gitignorePath "node_modules/"
Add-IfMissing $gitignorePath "frontend/node_modules/"
Add-IfMissing $gitignorePath "backend/node_modules/"
Add-IfMissing $gitignorePath "dist/"
Add-IfMissing $gitignorePath "build/"
Add-IfMissing $gitignorePath ".env"
Add-IfMissing $gitignorePath "npm-debug.log"
Add-IfMissing $gitignorePath ".DS_Store"
Add-IfMissing $gitignorePath ".vscode/"
Add-IfMissing $gitignorePath ".idea/"

# Stage .gitignore
git add .gitignore 2>$null

# 3) create .gitattributes
$gitattributesPath = ".gitattributes"
$gitattributesContent = @"
# enforce LF in the repository for all text files
* text=auto eol=lf

# binary files (do not touch)
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.zip binary
*.pdf binary
"@
# overwrite/create
Set-Content -Path $gitattributesPath -Value $gitattributesContent -Encoding UTF8
Write-Host "Wrote .gitattributes"
git add .gitattributes 2>$null

# commit .gitignore and .gitattributes if staged
$staged1 = (git diff --cached --name-only) -join "`n"
if ($staged1) {
  git commit -m "chore: add/update .gitignore and .gitattributes (normalize EOL, ignore node_modules)" 2>$null
  Write-Host "Committed .gitignore and .gitattributes"
} else {
  Write-Host "No changes to .gitignore/.gitattributes to commit."
}

# 4) remove node_modules from index (keep files on disk)
$rmPaths = @("frontend/node_modules","backend/node_modules","node_modules")
foreach ($p in $rmPaths) {
  if (Test-Path $p) {
    Write-Host "Removing $p from git index (cached)..."
    git rm -r --cached $p 2>$null
  } else {
    Write-Host "Path not present, skipping: $p"
  }
}

# 5) renormalize repository per .gitattributes
Write-Host "Renormalizing repository (git add --renormalize .) ..."
git add --renormalize . 2>$null

$staged2 = (git diff --cached --name-only) -join "`n"
if ($staged2) {
  git commit -m "chore: renormalize line endings and remove node_modules from index" 2>$null
  Write-Host "Committed renormalization changes."
} else {
  Write-Host "No renormalization changes to commit."
}

# 6) install frontend/backend deps (generate lockfiles)
function Run-NpmInstallIfNeeded {
  param($dir)
  if (Test-Path (Join-Path $dir "package.json")) {
    Write-Host "Installing dependencies in $dir ..."
    Push-Location $dir
    try {
      if (Test-Path "package-lock.json") {
        npm ci
      } else {
        npm install
      }
    } catch {
      Write-Warning "npm install/ci failed in $dir : $_"
    } finally {
      Pop-Location
    }
    Write-Host "Done $dir."
  } else {
    Write-Host "No package.json in $dir; skipping."
  }
}

Run-NpmInstallIfNeeded "frontend"
Run-NpmInstallIfNeeded "backend"

# 7) stage & commit new lockfiles / package.json changes if any
$targets = @()
if (Test-Path "frontend/package-lock.json") { $targets += "frontend/package-lock.json" }
if (Test-Path "frontend/package.json") { $targets += "frontend/package.json" }
if (Test-Path "backend/package-lock.json") { $targets += "backend/package-lock.json" }
if (Test-Path "backend/package.json") { $targets += "backend/package.json" }

if ($targets.Count -gt 0) {
  git add $targets 2>$null
  $staged3 = (git diff --cached --name-only) -join "`n"
  if ($staged3) {
    git commit -m "chore: add package-lock.json and update package.json dependencies (post-install)" 2>$null
    Write-Host "Committed lockfiles and package.json changes."
  } else {
    Write-Host "No lockfile/package.json changes to commit."
  }
} else {
  Write-Host "No lockfiles or package.json changes found to add/commit."
}

# 8) optional: ask to run docker compose up --build
if (Get-Command docker -ErrorAction SilentlyContinue) {
  if (Pause-Confirm "Do you want to run 'docker compose up --build' now? (requires Docker)") {
    Write-Host "Running docker compose up --build ..."
    docker compose up --build
  } else {
    Write-Host "Skipped Docker step."
  }
} else {
  Write-Host "Docker not found; skipping Docker step."
}

Write-Host "`nDone. Recommended next steps:"
Write-Host " - Inspect commits: git log --oneline | head"
Write-Host " - Push changes: git push"
Write-Host " - If you need to remove node_modules from history, use BFG (destructive) - ask for instructions."

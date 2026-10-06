<#
.SYNOPSIS
  RSCENE 2026 machine check. Read-only: installs nothing, changes nothing,
  never reads secrets (it only checks whether .env.local exists).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\prepare-machine.ps1
#>

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Write-Host "RSCENE 2026 environment check: $root" -ForegroundColor Cyan
Write-Host ""

function Write-Ok($text) { Write-Host "[OK]      $text" -ForegroundColor Green }
function Write-Todo($text) { Write-Host "[TODO]    $text" -ForegroundColor Yellow }
function Write-Missing($text) { Write-Host "[MISSING] $text" -ForegroundColor Red }

# 1. Tools
$tools = @(
    @{ Name = "node"; Required = $true },
    @{ Name = "npm"; Required = $true },
    @{ Name = "git"; Required = $true },
    @{ Name = "claude"; Required = $true },
    @{ Name = "python"; Required = $false }
)
foreach ($tool in $tools) {
    $found = Get-Command $tool.Name -ErrorAction SilentlyContinue
    if ($found) {
        $version = ""
        try { $version = (& $tool.Name --version 2>$null | Select-Object -First 1) } catch {}
        Write-Ok "$($tool.Name) $version"
    } elseif ($tool.Required) {
        Write-Missing "$($tool.Name) (required)"
    } else {
        Write-Host "[skip]    $($tool.Name) (optional)" -ForegroundColor Gray
    }
}

# 2. Node version (package.json engines: >=22.18)
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $raw = (& node --version) -replace '^v', ''
    try {
        if ([version]$raw -ge [version]"22.18.0") { Write-Ok "Node $raw meets >=22.18" }
        else { Write-Missing "Node $raw is older than 22.18 (package.json engines)" }
    } catch { Write-Todo "could not parse Node version '$raw'" }
}

# 3. Dependencies
if (Test-Path (Join-Path $root "node_modules")) { Write-Ok "node_modules present" }
else { Write-Todo "run 'npm ci' in $root while online" }

# 4. Playwright (used by npm run smoke and the Playwright MCP)
Push-Location $root
try {
    # Same as 'npx playwright --version', but never downloads (--no) if it is missing.
    $pw = (& npx --no -- playwright --version 2>$null | Select-Object -First 1)
    if ($pw -match 'Version') { Write-Ok "Playwright $pw" }
    else { Write-Todo "Playwright not found: run 'npm ci' while online" }
} catch {
    Write-Todo "Playwright check failed: run 'npm ci' while online"
} finally {
    Pop-Location
}
$edge = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($edge) { Write-Ok "Microsoft Edge found (npm run smoke uses it on Windows)" }
else { Write-Todo "Edge not found: npm run smoke falls back to Playwright Chromium ('npx playwright install chromium' while online)" }

# 5. AI keys: existence only, never read
$envLocal = Join-Path $root ".env.local"
if (Test-Path $envLocal) {
    Write-Ok ".env.local exists (not read). Test the key on /admin/ai (connection test)."
} else {
    Write-Todo "create .env.local from .env.example: AI_PROVIDER=openai and OPENAI_API_KEY=..."
}
Write-Host "          Keys go only in .env.local: never committed, never VITE_-prefixed." -ForegroundColor Gray

# 6. Git
if (Get-Command git -ErrorAction SilentlyContinue) {
    & git -C $root check-ignore -q .env.local 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Ok ".env.local is git-ignored" }
    else { Write-Missing ".env.local is NOT git-ignored: check .gitignore" }

    $dirty = @(& git -C $root status --porcelain 2>$null).Count
    if ($dirty -eq 0) { Write-Ok "working tree clean" } else { Write-Todo "$dirty uncommitted change(s)" }

    $tag = & git -C $root tag --list "pre-event-freeze" 2>$null
    if ($tag) { Write-Ok "tag pre-event-freeze exists" } else { Write-Todo "tag the frozen baseline: git tag pre-event-freeze" }
}

Write-Host ""
Write-Host "Next: npm run dev (http://localhost:5201), then npm run smoke with Wi-Fi off." -ForegroundColor Cyan
Write-Host "This script installs nothing and changes nothing." -ForegroundColor Gray

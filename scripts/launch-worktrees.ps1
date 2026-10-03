<#
.SYNOPSIS
  Creates one git worktree per RCENE project and opens one Claude Code session
  per worktree in a Windows Terminal tab.

.DESCRIPTION
  Reads docs\projects\projects.json (the manifest). For each selected project
  it creates or reuses the worktree <WorktreeRoot>\<slug> on branch
  proj/<slug> (created from the local Base branch), runs pnpm install at the
  worktree root (one worktree at a time), then opens a Windows Terminal tab
  that starts claude with the project prompt.

  App sessions start INSIDE the app folder, <worktree>\apps\<slug>: every app
  is a self-contained project with its own CLAUDE.md, .claude\settings.json
  (hooks, permissions, plugins), skills, .mcp.json and docs\brief.md, so the
  session sees exactly what the copied folder will have on the day. The data
  session (00-data, no app folder) starts at the worktree root and uses the
  root hooks. In both cases the SessionStart hook tells the session which
  project it is building and the PreToolUse guard keeps it in its write scope.

  Works in Windows PowerShell 5.1 (powershell.exe) and PowerShell 7 (pwsh).
  When run with -File, pass one value per array parameter (-Batch 1) or a
  comma-separated string for -Project ("01-ligtas,03-likas"). From a
  PowerShell prompt, -Batch 1,2 also works.

.PARAMETER Batch
  Batch numbers to launch (0 = data foundation, 1-4 = apps, 5-6 = platforms
  P1-P10; launch a platform after its module apps are merged).

.PARAMETER Project
  Project ids or slugs, e.g. 01, 01-ligtas, P1, p01 or p01-andam.
  Comma-separated values are split.

.PARAMETER WorktreeRoot
  Folder that holds the worktrees. Default: worktreeRoot from the manifest
  (C:/RSCENE-wt). Keep it short: Windows paths and pnpm nest deeply.

.PARAMETER Base
  Local branch new proj/<slug> branches start from. Default: main.

.PARAMETER PermissionMode
  claude --permission-mode for the sessions. Default: acceptEdits.

.PARAMETER Model
  Optional claude --model value.

.PARAMETER NoClaude
  Create worktrees and install, but do not open sessions.

.PARAMETER NoInstall
  Skip pnpm install in the worktrees.

.PARAMETER Resume
  Open each existing worktree with claude --continue instead of a new prompt,
  from the same folder the session was started in (the app folder, or the
  worktree root for 00-data), so it picks up that conversation.

.PARAMETER Status
  Print progress for the selected projects (all when none selected) and exit.

.PARAMETER Remove
  Remove the selected worktrees (git worktree remove --force), keep branches.

.PARAMETER StaggerSeconds
  Seconds to wait between opening tabs. Default: 20.

.PARAMETER DryRun
  Print every git, pnpm and wt command, and the script each tab would run,
  without running them.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 0
  Launches the data session (local only: it reads D:\lgu_portal - GIS).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 1 -DryRun
  Shows what launching batch 1 would do.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Batch 1
  Creates five worktrees, installs them one by one, opens five tabs.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Status

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Project "01-ligtas,03" -Resume
  Reopens two sessions where they left off.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Project 01-ligtas -Remove
  Removes the worktree after its branch is merged. The branch stays.
#>
[CmdletBinding()]
param(
  [int[]]$Batch,
  [string[]]$Project,
  [string]$WorktreeRoot,
  [string]$Base = "main",
  [ValidateSet("acceptEdits", "auto", "default", "plan")]
  [string]$PermissionMode = "acceptEdits",
  [string]$Model,
  [switch]$NoClaude,
  [switch]$NoInstall,
  [switch]$Resume,
  [switch]$Status,
  [switch]$Remove,
  [int]$StaggerSeconds = 20,
  [switch]$DryRun
)

$OnWindows = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
$RepoRoot = (Resolve-Path -LiteralPath ([System.IO.Path]::Combine($PSScriptRoot, ".."))).Path
$script:Failures = 0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Step([string]$Text) {
  Write-Host ""
  Write-Host $Text -ForegroundColor Cyan
}

function Write-Warn([string]$Text) {
  Write-Host "WARNING: $Text" -ForegroundColor Yellow
}

function Write-Fail([string]$Text) {
  Write-Host "ERROR: $Text" -ForegroundColor Red
  $script:Failures++
}

function Format-Arg([string]$Value) {
  if ($Value -match '[\s"]') { return '"' + ($Value -replace '"', '\"') + '"' }
  return $Value
}

# Runs a native command with its output on the console, or only prints it
# under -DryRun. Returns $true when it succeeded (always under -DryRun).
function Invoke-Tool {
  param([string]$Exe, [string[]]$Arguments, [string]$WorkingDirectory)
  $shown = (@($Arguments) | ForEach-Object { Format-Arg $_ }) -join " "
  $where = ""
  if ($WorkingDirectory) { $where = "   (in $WorkingDirectory)" }
  if ($DryRun) {
    Write-Host "[dry-run] $Exe $shown$where"
    return $true
  }
  if (-not (Test-Tool $Exe)) {
    Write-Host "ERROR: $Exe is not on PATH." -ForegroundColor Red
    return $false
  }
  Write-Host "> $Exe $shown$where" -ForegroundColor DarkGray
  if ($WorkingDirectory) { Push-Location -LiteralPath $WorkingDirectory }
  try {
    & $Exe @Arguments | Out-Host
    $code = $LASTEXITCODE
  } finally {
    if ($WorkingDirectory) { Pop-Location }
  }
  return ($code -eq 0)
}

# Read-only git query. Emits the output lines (nothing on failure); wrap calls
# in @() to always get an array, and read $LASTEXITCODE right after the call.
function Get-GitAt {
  param([string]$Dir, [string[]]$Arguments)
  $ErrorActionPreference = "Continue"
  $out = & git -C $Dir @Arguments 2>$null
  if ($LASTEXITCODE -ne 0) { return }
  $out
}

function Get-Git {
  param([string[]]$Arguments)
  Get-GitAt $RepoRoot $Arguments
}

function Test-Branch([string]$Name) {
  $sha = @(Get-Git @("rev-parse", "--verify", "--quiet", "refs/heads/$Name"))
  return ($sha.Count -gt 0)
}

function Test-Tool([string]$Name) {
  return ($null -ne (Get-Command $Name -ErrorAction SilentlyContinue))
}

# Simple glob to regex: ** spans folders, * and ? stay inside one folder.
function Convert-GlobToRegex([string]$Glob) {
  $g = $Glob -replace '\\', '/'
  $sb = New-Object System.Text.StringBuilder
  $i = 0
  while ($i -lt $g.Length) {
    $c = [string]$g[$i]
    if ($c -eq "*") {
      if ((($i + 1) -lt $g.Length) -and ([string]$g[$i + 1] -eq "*")) {
        $atStart = ($i -eq 0) -or ([string]$g[$i - 1] -eq "/")
        $slashAfter = (($i + 2) -lt $g.Length) -and ([string]$g[$i + 2] -eq "/")
        if ($atStart -and $slashAfter) {
          [void]$sb.Append("(?:.*/)?")
          $i += 3
          continue
        }
        if ($atStart -and (($i + 2) -eq $g.Length) -and ($i -gt 0)) {
          [void]$sb.Remove($sb.Length - 1, 1)
          [void]$sb.Append("(?:/.*)?")
          $i += 2
          continue
        }
        [void]$sb.Append(".*")
        $i += 2
        continue
      }
      [void]$sb.Append("[^/]*")
    } elseif ($c -eq "?") {
      [void]$sb.Append("[^/]")
    } else {
      [void]$sb.Append([regex]::Escape($c))
    }
    $i++
  }
  return "^" + $sb.ToString() + "$"
}

function Test-InScope([string]$File, [object[]]$Globs) {
  foreach ($glob in $Globs) {
    if ($File -match (Convert-GlobToRegex ([string]$glob))) { return $true }
  }
  return $false
}

function Get-WorktreePath($Row) {
  return [System.IO.Path]::Combine($WorktreeRoot, [string]$Row.slug)
}

# Where the session starts: the app folder for app rows, the worktree root otherwise.
function Get-SessionPath($Row, [string]$Worktree) {
  if ($Row.app) {
    $parts = @($Worktree) + @(([string]$Row.app) -split '[\\/]' | Where-Object { $_ })
    $p = $parts[0]
    for ($k = 1; $k -lt $parts.Count; $k++) { $p = [System.IO.Path]::Combine($p, $parts[$k]) }
    return $p
  }
  return $Worktree
}

function Get-LaunchPrompt($Row) {
  # No double quotes, %, &, | or ^: the prompt travels through several shells.
  if ($Row.app) {
    return "Begin project $($Row.slug). Read docs/brief.md and follow CLAUDE.md in this folder."
  }
  return "Begin project $($Row.slug). Read $($Row.brief) and follow CLAUDE.md in this folder."
}

function Get-TabScript($Row, [string]$Path, [bool]$Continue) {
  $claudeArgs = New-Object System.Collections.Generic.List[string]
  if ($Continue) { $claudeArgs.Add("--continue") }
  $claudeArgs.Add("--permission-mode")
  $claudeArgs.Add($PermissionMode)
  if ($Model) {
    $claudeArgs.Add("--model")
    $claudeArgs.Add("'" + ($Model -replace "'", "''") + "'")
  }
  if (-not $Continue) {
    $claudeArgs.Add("'" + ((Get-LaunchPrompt $Row) -replace "'", "''") + "'")
  }
  # One Add per line: inside @(...) the comma operator binds tighter than +.
  $quotedPath = "'" + ($Path -replace "'", "''") + "'"
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("`$Host.UI.RawUI.WindowTitle = '$($Row.slug)'")
  $lines.Add("`$env:ECC_GATEGUARD = 'off'")
  $lines.Add("Set-Location -LiteralPath $quotedPath")
  $lines.Add("Write-Host 'RCENE $($Row.slug) on $($Row.branch)' -ForegroundColor Cyan")
  $lines.Add("claude " + ($claudeArgs -join " "))
  return ($lines -join "`r`n")
}

function Open-SessionTab($Row, [string]$Path, [bool]$Continue) {
  $tabScript = Get-TabScript $Row $Path $Continue
  $encoded = [System.Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($tabScript))
  $psArgs = @("-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded)
  $useWt = $DryRun -or (Test-Tool "wt.exe")
  if ($DryRun) {
    Write-Host "[dry-run] tab script for $($Row.slug) (sent base64-encoded as -EncodedCommand):" -ForegroundColor DarkGray
    foreach ($line in ($tabScript -split "`r`n")) { Write-Host "            $line" }
  }
  if ($useWt) {
    $wtArgs = @("-w", "rcene", "new-tab", "--title", [string]$Row.slug, "--suppressApplicationTitle", "-d", $Path, "powershell.exe") + $psArgs
    return (Invoke-Tool "wt.exe" $wtArgs)
  }
  Write-Warn "wt.exe not found; opening a separate PowerShell window instead."
  Write-Host "> Start-Process powershell.exe (in $Path)" -ForegroundColor DarkGray
  Start-Process -FilePath "powershell.exe" -ArgumentList $psArgs -WorkingDirectory $Path | Out-Null
  return $true
}

# Warns (never fails) when the plugins the app settings enable are not installed.
function Test-ClaudePlugins {
  $ErrorActionPreference = "Continue"
  $listed = ""
  try {
    $listed = (& claude plugin list 2>&1 | Out-String)
  } catch {
    $listed = ""
  }
  $missingPlugins = @()
  foreach ($name in @("frontend-design", "design", "superpowers")) {
    $pattern = '(^|[^A-Za-z0-9-])' + [regex]::Escape($name) + '($|[^A-Za-z0-9-])'
    if ($listed -notmatch $pattern) { $missingPlugins += $name }
  }
  if ($missingPlugins.Count -eq 0) {
    Write-Host "  plugins: frontend-design, design, superpowers"
    return
  }
  Write-Warn ("claude plugin list does not show: " + ($missingPlugins -join ", ") + ". Sessions work without them, but the app settings enable them. Install once per machine, while online:")
  Write-Host "    claude plugin install frontend-design@claude-plugins-official"
  Write-Host "    claude plugin marketplace add anthropics/knowledge-work-plugins"
  Write-Host "    claude plugin install design@knowledge-work-plugins"
  Write-Host "    claude plugin marketplace add obra/superpowers-marketplace"
  Write-Host "    claude plugin install superpowers@superpowers-marketplace"
}

function Show-NextSteps {
  Write-Step "Next steps"
  Write-Host "  Watch progress:  powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Status"
  Write-Host "  Folder trust:    trust the main checkout once (run claude in $RepoRoot and accept the prompt);"
  Write-Host "                   worktrees share it. If a tab still asks (folder trust or the app's Playwright MCP), accept once."
  Write-Host "  Review a branch: in the main checkout run /code-review proj/<slug>, node scripts/smoke.mjs --app <slug>,"
  Write-Host "                   and pnpm check-standalone <slug>."
  Write-Host "  Merge:           git switch $Base; git merge --no-ff proj/<slug>"
  Write-Host "                   then pnpm install (resolve pnpm-lock.yaml conflicts by re-running pnpm install)."
  Write-Host "  After merging:   pnpm sync-data (after 00-data), pnpm sync-shared --all (after template changes),"
  Write-Host "                   pnpm lockfiles (after dependency changes); commit the results on $Base."
  Write-Host "  Resume a tab:    powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Project <slug> -Resume"
  Write-Host "  Clean up:        powershell -ExecutionPolicy Bypass -File scripts\launch-worktrees.ps1 -Project <slug> -Remove"
  Write-Host "                   (removes the worktree, keeps the branch; never delete worktrees by hand)"
}

# ---------------------------------------------------------------------------
# Manifest and selection
# ---------------------------------------------------------------------------

$manifestPath = [System.IO.Path]::Combine($RepoRoot, "docs", "projects", "projects.json")
if (-not (Test-Path -LiteralPath $manifestPath)) {
  Write-Host "ERROR: manifest not found: $manifestPath" -ForegroundColor Red
  exit 1
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$allRows = @($manifest.projects)

if (-not $WorktreeRoot) { $WorktreeRoot = [string]$manifest.worktreeRoot }
if (-not $WorktreeRoot) { $WorktreeRoot = "C:/RSCENE-wt" }
if ($OnWindows) { $WorktreeRoot = $WorktreeRoot -replace '/', '\' }
$WorktreeRoot = $WorktreeRoot.TrimEnd('\', '/')

$selected = New-Object System.Collections.Generic.List[object]
function Add-Selected($Row) {
  foreach ($existing in $selected) { if ($existing.slug -eq $Row.slug) { return } }
  $selected.Add($Row)
}
# Test for $null, not truthiness: -Batch 0 is a one-element array holding 0, which is falsy.
if ($null -ne $Batch) {
  $knownBatches = @($allRows | ForEach-Object { [int]$_.batch } | Sort-Object -Unique)
  foreach ($b in $Batch) {
    if ($knownBatches -notcontains $b) {
      # powershell -File passes "1,2" as one string, which [int] reads as 12.
      Write-Host ("ERROR: there is no batch $b (batches: " + ($knownBatches -join ", ") + "). With -File, pass one batch per run (-Batch 1), or use -Project with a comma-separated list.") -ForegroundColor Red
      exit 1
    }
  }
  foreach ($row in $allRows) {
    if ($Batch -contains [int]$row.batch) { Add-Selected $row }
  }
}
if ($null -ne $Project) {
  foreach ($item in $Project) {
    foreach ($name in ($item -split ",")) {
      $key = $name.Trim()
      if (-not $key) { continue }
      # PowerShell turns an unquoted 05 into 5; restore the two-digit id.
      if ($key -match '^\d$') { $key = $key.PadLeft(2, '0') }
      # Platform ids: p01 / P01 / p1 -> P1.
      if ($key -match '^[pP]0*(\d{1,2})$') { $key = 'P' + [int]$Matches[1] }
      $match = $null
      foreach ($row in $allRows) {
        if (($row.slug -eq $key) -or ($row.id -eq $key) -or ($row.branch -eq $key)) { $match = $row; break }
      }
      if ($null -eq $match) {
        Write-Host "ERROR: no project '$key' in the manifest. Use an id (01, P1) or a slug (01-ligtas, p01-andam)." -ForegroundColor Red
        exit 1
      }
      Add-Selected $match
    }
  }
}
$rows = @($selected | Sort-Object { [int]$_.batch }, { [string]$_.id })

if (-not (Test-Tool "git")) {
  Write-Host "ERROR: git is not on PATH. Install Git for Windows first." -ForegroundColor Red
  exit 1
}

# ---------------------------------------------------------------------------
# -Status
# ---------------------------------------------------------------------------

if ($Status) {
  if ($rows.Count -eq 0) { $rows = @($allRows | Sort-Object { [int]$_.batch }, { [string]$_.id }) }
  $baseExists = Test-Branch $Base
  if (-not $baseExists) { Write-Warn "base branch '$Base' not found locally; ahead counts are unavailable." }
  $oldEncoding = [Console]::OutputEncoding
  try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $report = foreach ($row in $rows) {
      $branch = [string]$row.branch
      $path = Get-WorktreePath $row
      $hasBranch = Test-Branch $branch
      $ahead = "-"
      $last = "-"
      $outside = "-"
      $statusLine = "-"
      if ($hasBranch) {
        if ($baseExists) {
          $count = @(Get-Git @("rev-list", "--count", "$Base..$branch"))
          if ($count.Count -gt 0) { $ahead = $count[0] }
          $changed = @(Get-Git @("diff", "--name-only", "$Base...$branch"))
          if ($LASTEXITCODE -eq 0) {
            $bad = @($changed | Where-Object { $_ -and -not (Test-InScope $_ @($row.writeScope)) })
            $outside = $bad.Count
          }
        }
        $log = @(Get-Git @("log", "-1", "--format=%cr | %s", $branch))
        if ($log.Count -gt 0) { $last = $log[0] }
        if ($row.app) {
          $spec = $branch + ":" + [string]$row.app + "/STATUS.md"
          $text = @(Get-Git @("show", $spec))
          if ($text.Count -gt 0) {
            foreach ($line in $text) {
              $t = ([string]$line).Trim()
              if ($t -and -not $t.StartsWith("#") -and -not $t.StartsWith("<!--")) { $statusLine = $t; break }
            }
          }
        }
      }
      [PSCustomObject]@{
        Slug     = $row.slug
        Batch    = $row.batch
        Branch   = $(if ($hasBranch) { "yes" } else { "no" })
        Worktree = $(if (Test-Path -LiteralPath $path) { "yes" } else { "no" })
        Ahead    = $ahead
        Outside  = $outside
        Last     = $last
        Status   = $statusLine
      }
    }
    Write-Step "RCENE status (base: $Base, worktrees: $WorktreeRoot)"
    # Out-String with an explicit width also renders when output is redirected to a file.
    Write-Host ($report | Format-Table -AutoSize -Wrap | Out-String -Width 220).TrimEnd()
    Write-Host "Outside = files changed on the branch outside its writeScope (should be 0)."
  } finally {
    [Console]::OutputEncoding = $oldEncoding
  }
  exit 0
}

if ($rows.Count -eq 0) {
  Write-Host "ERROR: choose projects with -Batch <n> or -Project <id|slug> (see Get-Help $PSCommandPath -Examples)." -ForegroundColor Red
  exit 1
}

# ---------------------------------------------------------------------------
# -Remove
# ---------------------------------------------------------------------------

if ($Remove) {
  Write-Step "Removing worktrees (branches are kept)"
  foreach ($row in $rows) {
    $path = Get-WorktreePath $row
    if (Test-Path -LiteralPath $path) {
      # git removes pnpm's junctions without following them; Remove-Item -Recurse would not.
      if (-not (Invoke-Tool "git" @("-C", $RepoRoot, "worktree", "remove", "--force", $path))) {
        Write-Fail "could not remove $path (close any terminal or editor using it and retry)"
      }
    } else {
      Write-Host "  $($row.slug): no worktree at $path"
    }
  }
  [void](Invoke-Tool "git" @("-C", $RepoRoot, "worktree", "prune"))
  if ($script:Failures -gt 0) { exit 1 }
  exit 0
}

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

Write-Step "Preflight"
$missing = $false
if (Test-Tool "node") {
  $nodeVersion = (& node --version) -replace '^v', ''
  $parsed = $null
  if ([version]::TryParse(($nodeVersion -replace '-.*$', ''), [ref]$parsed)) {
    if ($parsed -lt [version]"22.18.0") {
      Write-Fail "node $nodeVersion is too old; RCENE needs node 22.18 or newer."
      $missing = $true
    } else {
      Write-Host "  node $nodeVersion"
    }
  }
} else {
  Write-Fail "node is not on PATH."
  $missing = $true
}
if (Test-Tool "pnpm") {
  Write-Host ("  pnpm " + (& pnpm --version))
} elseif (-not $NoInstall) {
  Write-Fail "pnpm is not on PATH (corepack enable, or npm install -g pnpm)."
  $missing = $true
}
if (-not $NoClaude) {
  if (Test-Tool "claude") {
    Write-Host "  claude found"
    Test-ClaudePlugins
  } elseif ($DryRun) {
    Write-Warn "claude is not on PATH (fine for -DryRun)."
  } else {
    Write-Fail "claude is not on PATH. Install Claude Code, or pass -NoClaude."
    $missing = $true
  }
  if (Test-Tool "wt.exe") {
    Write-Host "  Windows Terminal found"
  } else {
    Write-Warn "wt.exe not found; sessions will open in separate PowerShell windows."
  }
}
if ($missing -and -not $DryRun) { exit 1 }

if (-not (Test-Branch $Base)) {
  Write-Host "ERROR: base branch '$Base' does not exist locally. Create it (git branch $Base origin/$Base) or pass -Base." -ForegroundColor Red
  exit 1
}

[void](Invoke-Tool "git" @("-C", $RepoRoot, "config", "core.longpaths", "true"))
[void](Invoke-Tool "git" @("-C", $RepoRoot, "config", "gc.auto", "0"))

$appRows = @($rows | Where-Object { [int]$_.batch -ge 1 })
if ($appRows.Count -gt 0) {
  $realData = @(Get-Git @("ls-tree", "-r", "--name-only", $Base, "--", "data/files") | Where-Object { $_ -like "*.geojson" })
  if ($realData.Count -eq 0) {
    Write-Warn "data/files on $Base has no .geojson yet (the data session is not merged). App sessions will use the fixtures."
  }
  foreach ($row in $appRows) {
    if ($row.app) {
      $appPkg = @(Get-Git @("ls-tree", "--name-only", $Base, "--", ([string]$row.app + "/package.json")))
      if ($appPkg.Count -eq 0) {
        Write-Warn "$($row.app) does not exist on $Base yet. Generate it on $Base first: node scripts/new-app.mjs $($row.slug), commit, then launch."
      }
    }
  }
}
foreach ($row in $rows) {
  if ($row.localOnly) {
    Write-Host "  $($row.slug) is local only: it needs D:\lgu_portal - GIS on this PC." -ForegroundColor Yellow
  }
}

# ---------------------------------------------------------------------------
# Worktrees and installs (one at a time: Defender plus parallel installs cause EPERM)
# ---------------------------------------------------------------------------

Write-Step "Worktrees in $WorktreeRoot"
if (-not (Test-Path -LiteralPath $WorktreeRoot)) {
  if ($DryRun) {
    Write-Host "[dry-run] New-Item -ItemType Directory $WorktreeRoot"
  } else {
    New-Item -ItemType Directory -Path $WorktreeRoot -Force | Out-Null
  }
}

$ready = New-Object System.Collections.Generic.List[object]
foreach ($row in $rows) {
  $branch = [string]$row.branch
  $path = Get-WorktreePath $row
  $existed = Test-Path -LiteralPath $path
  Write-Host ""
  Write-Host "$($row.slug)  (batch $($row.batch), $branch)" -ForegroundColor White
  $ok = $true
  if ($existed) {
    $current = @(Get-GitAt $path @("rev-parse", "--abbrev-ref", "HEAD"))
    if (($current.Count -gt 0) -and ($current[0] -ne $branch)) {
      Write-Warn "$path is on '$($current[0])', not '$branch'. Reusing it anyway; check before continuing."
    } else {
      Write-Host "  reusing existing worktree $path"
    }
  } elseif (Test-Branch $branch) {
    $ok = Invoke-Tool "git" @("-C", $RepoRoot, "worktree", "add", $path, $branch)
  } else {
    $ok = Invoke-Tool "git" @("-C", $RepoRoot, "worktree", "add", "-b", $branch, $path, $Base)
  }
  if (-not $ok) {
    Write-Fail "could not create the worktree for $($row.slug); skipping it."
    continue
  }
  if (-not $NoInstall) {
    $installed = Invoke-Tool "pnpm" @("install", "--frozen-lockfile", "--prefer-offline") $path
    if (-not $installed) {
      Write-Fail "pnpm install failed in $path; not starting a session there. Fix it and rerun with -Project $($row.slug)."
      continue
    }
  }
  $sessionPath = Get-SessionPath $row $path
  if ((-not $DryRun) -and (-not (Test-Path -LiteralPath $sessionPath))) {
    Write-Fail "$sessionPath does not exist in the worktree (is $($row.app) committed on $Base?); not starting a session for $($row.slug)."
    continue
  }
  $ready.Add([PSCustomObject]@{ Row = $row; Path = $path; SessionPath = $sessionPath; Existed = $existed })
}

# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

if (-not $NoClaude -and $ready.Count -gt 0) {
  Write-Step "Opening $($ready.Count) Claude Code session(s), $StaggerSeconds s apart"
  for ($i = 0; $i -lt $ready.Count; $i++) {
    $item = $ready[$i]
    $continue = $false
    if ($Resume) {
      if ($item.Existed) {
        $continue = $true
      } else {
        Write-Warn "$($item.Row.slug) had no worktree yet, so there is nothing to resume; starting it fresh."
      }
    }
    if (-not (Open-SessionTab $item.Row $item.SessionPath $continue)) {
      Write-Fail "could not open a tab for $($item.Row.slug)."
    }
    if (($i -lt ($ready.Count - 1)) -and ($StaggerSeconds -gt 0)) {
      if ($DryRun) {
        Write-Host "[dry-run] Start-Sleep -Seconds $StaggerSeconds"
      } else {
        Start-Sleep -Seconds $StaggerSeconds
      }
    }
  }
}

Show-NextSteps
if ($script:Failures -gt 0) {
  Write-Host ""
  Write-Host "$($script:Failures) problem(s) above need attention." -ForegroundColor Red
  exit 1
}
exit 0

Param(
    [string]$Message = "chore(repo): checkpoint de seguranca para rollback"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$repos = @(
    $root,
    (Join-Path $root "admin"),
    (Join-Path $root "Backend"),
    (Join-Path $root "frontend")
)

$results = @()

foreach ($repo in $repos) {
    if (-not (Test-Path $repo)) {
        continue
    }

    $isGit = $false
    try {
        $inside = git -C $repo rev-parse --is-inside-work-tree 2>$null
        if ($inside -eq "true") {
            $isGit = $true
        }
    } catch {
        $isGit = $false
    }

    if (-not $isGit) {
        continue
    }

    $branch = (git -C $repo branch --show-current).Trim()
    $status = git -C $repo status --porcelain

    if ($status) {
        git -C $repo add -A
        try {
            git -C $repo commit -m $Message | Out-Null
            $committed = $true
        } catch {
            $committed = $false
        }
    } else {
        $committed = $false
    }

    $pushed = $false
    $origin = ""
    try {
        $origin = (git -C $repo remote get-url origin 2>$null).Trim()
    } catch {
        $origin = ""
    }

    if ($origin) {
        try {
            if (-not $branch) {
                $branch = (git -C $repo rev-parse --abbrev-ref HEAD).Trim()
            }
            git -C $repo push origin $branch | Out-Null
            $pushed = $true
        } catch {
            $pushed = $false
        }
    }

    $head = (git -C $repo rev-parse HEAD).Trim()

    $results += [PSCustomObject]@{
        Repo = $repo
        Branch = $branch
        HadChanges = [bool]$status
        Committed = $committed
        Pushed = $pushed
        Head = $head
    }
}

$results | Format-Table -AutoSize

param(
    [ValidateSet('dev', 'stable')]
    [string]$Channel = 'dev'
)

$ErrorActionPreference = 'Stop'

function Invoke-CheckedGit {
    & git @args
    if ($LASTEXITCODE -ne 0) {
        throw "git $($args[0]) failed with exit code $LASTEXITCODE."
    }
}

$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ("robot-game-pages-" + [guid]::NewGuid())
$previousIndex = $env:GIT_INDEX_FILE
Push-Location (Join-Path $PSScriptRoot '..')
try {
    New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
    $gitDirectory = Invoke-CheckedGit rev-parse --absolute-git-dir
    Invoke-CheckedGit fetch --no-tags --no-write-fetch-head origin refs/heads/gh-pages:refs/remotes/origin/gh-pages
    $parent = Invoke-CheckedGit rev-parse refs/remotes/origin/gh-pages

    $site = Join-Path $temporaryDirectory 'site'
    $output = $site
    $baseUrl = './'
    if ($Channel -eq 'dev') {
        $output = Join-Path $site 'dev'
        $baseUrl = '/robot-game/dev/'
    }
    & npm.cmd run build -- "--outDir=$output" "--base=$baseUrl" --emptyOutDir
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE."
    }

    $env:GIT_INDEX_FILE = Join-Path $temporaryDirectory 'index'
    $indexOptions = @("--git-dir=$gitDirectory", "--work-tree=$site", '-c', 'core.fsmonitor=false', '-c', 'core.autocrlf=false')
    Invoke-CheckedGit @indexOptions read-tree $parent
    $buildPaths = @('assets', 'index.html', 'game.webmanifest')
    if ($Channel -eq 'dev') {
        $buildPaths = @('dev')
    }
    Copy-Item -LiteralPath 'AGENTS.md' -Destination $site
    Push-Location $site
    try {
        Invoke-CheckedGit @indexOptions rm -q -r -f --cached --ignore-unmatch -- @buildPaths
        Invoke-CheckedGit @indexOptions add -f -- @buildPaths AGENTS.md
        $tree = Invoke-CheckedGit @indexOptions write-tree
    } finally {
        Pop-Location
    }

    $parentTree = Invoke-CheckedGit rev-parse "$parent^{tree}"
    if ($tree -eq $parentTree) {
        Write-Output "The $Channel build is already published."
        return
    }
    $commit = Invoke-CheckedGit commit-tree $tree -p $parent -m "Publish $Channel build"
    Invoke-CheckedGit push origin "${commit}:refs/heads/gh-pages"
} finally {
    $env:GIT_INDEX_FILE = $previousIndex
    Pop-Location
    if (Test-Path -LiteralPath $temporaryDirectory) {
        $resolved = (Resolve-Path -LiteralPath $temporaryDirectory).ProviderPath
        if ($resolved -eq $temporaryDirectory) {
            Remove-Item -LiteralPath $resolved -Recurse -Force
        }
    }
}

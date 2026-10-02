param(
  [ValidateRange(1, 1000000)]
  [int]$Games = 100,

  [ValidateSet("very-easy", "easy", "hard")]
  [string]$Yellow = "hard",

  [ValidateSet("very-easy", "easy", "hard")]
  [string]$Purple = "hard",

  [ValidateRange(1, 1000000)]
  [int]$MaxTurns = 300,

  [ValidateRange(2, 1000)]
  [int]$Repetition = 3,

  [ValidateRange(0, 4294967295)]
  [long]$Seed = 20260728,

  [string]$Output
)

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) {
  $nodeCommand.Source
} else {
  $userProfilePath = [Environment]::GetFolderPath("UserProfile")
  Join-Path $userProfilePath ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
}

if (-not (Test-Path -LiteralPath $nodePath -PathType Leaf)) {
  Write-Error "Node.js was not found on PATH or in the Codex bundled runtime. Reopen this project in Codex or install Node.js, then try again."
  exit 1
}

$simulatorPath = Join-Path $PSScriptRoot "simulate.js"
$arguments = @(
  $simulatorPath,
  "--games", $Games,
  "--yellow", $Yellow,
  "--purple", $Purple,
  "--max-turns", $MaxTurns,
  "--repetition", $Repetition,
  "--seed", $Seed
)

if ($Output) {
  $arguments += @("--output", $Output)
}

& $nodePath @arguments
exit $LASTEXITCODE
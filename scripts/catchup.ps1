# Stuck? Move your branch to the finished state of a module and push it.
#   .\scripts\catchup.ps1 3   -> your branch now matches module-03-complete
# This discards uncommitted changes on your branch, so commit or stash anything you want to keep.
param([Parameter(Mandatory = $true)][int]$Module)

$tag = "module-{0:d2}-complete" -f $Module
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq "main") {
  Write-Host "You are on main. Create your own branch first: git checkout -b <your-name>/workshop"
  exit 1
}
git fetch origin --tags --force --quiet
git reset --hard $tag --quiet
git push --force-with-lease origin $branch
Write-Host "Branch '$branch' now matches $tag. Your open pull request will redeploy automatically."

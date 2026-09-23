#!/usr/bin/env bash
# Stuck? Move your branch to the finished state of a module and push it.
#   scripts/catchup.sh 3      -> your branch now matches module-03-complete
# This discards uncommitted changes on your branch, so commit or stash anything you want to keep.
set -euo pipefail

n="${1:?usage: scripts/catchup.sh <module number 2-7>}"
tag=$(printf "module-%02d-complete" "$n")
branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" = "main" ]; then
  echo "You are on main. Create your own branch first: git checkout -b <your-name>/workshop"
  exit 1
fi

git fetch origin --tags --force --quiet
git reset --hard "$tag" --quiet
git push --force-with-lease origin "$branch"
echo "Branch '$branch' now matches $tag. Your open pull request will redeploy automatically."

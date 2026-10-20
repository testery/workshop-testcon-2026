#!/usr/bin/env bash
# Prints the preview URL for the current branch (same rule the pipeline uses).
branch=$(git rev-parse --abbrev-ref HEAD)
safe=$(echo "$branch" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//' | cut -c1-40 | sed -E 's/-+$//')
echo "https://${safe}.${PREVIEW_DOMAIN:-testcon.testery.academy}"

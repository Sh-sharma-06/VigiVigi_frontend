#!/usr/bin/env bash
# Re-tone Vigilant UI: lavender/purple -> neutral glass text + rose/burgundy accent
set -e
cd /home/z/my-project/src/components/vigilant

apply() {
  local old="$1" new="$2"
  for f in *.tsx; do
    sed -i "s/${old}/${new}/g" "$f"
  done
}

# --- Bright near-white text (lavender -> warm neutral) ---
apply '#fdf6ff' '#fff5f8'
apply '#fbeaff' '#f7eef4'
apply '#f8e6fc' '#f7eef4'
apply '#f6ebfd' '#f7eef4'
apply '#f6e7fc' '#f7eef4'
apply '#f4e8fc' '#f7eef4'
apply '#f4ebfc' '#f7eef4'
apply '#f7e6fd' '#f7eef4'
apply '#f2e8fb' '#f4f0f6'
apply '#f0e2fa' '#f4f0f6'
apply '#f0dcf8' '#f4f0f6'
apply '#efe5fa' '#f4f0f6'
apply '#efe6fa' '#f4f0f6'
apply '#f1e7fb' '#f4f0f6'
apply '#f2e6fb' '#f4f0f6'
apply '#f0e6fa' '#f4f0f6'
apply '#ecdcf8' '#f0ebf2'
apply '#e9e2f4' '#f0ebf2'
apply '#e9d8f5' '#f0ebf2'
apply '#e9dcf7' '#f0ebf2'
apply '#e8d9f6' '#f0ebf2'
apply '#e6d7f5' '#f0ebf2'
apply '#e4d9f3' '#ece8f0'
apply '#e2d5f2' '#ece8f0'

# --- Mid text ---
apply '#d9cdeb' '#b9b5c6'
apply '#d5c8ea' '#b9b5c6'
apply '#d8cdea' '#b9b5c6'
apply '#cfc2e5' '#bcb8c8'
apply '#cfc0e6' '#bcb8c8'
apply '#cabce0' '#bcb8c8'
apply '#c9b8e2' '#b3afbf'
apply '#c9bcdc' '#b3afbf'
apply '#c6b8dd' '#b3afbf'
apply '#c4b6dc' '#b3afbf'
apply '#c3b4da' '#b3afbf'
apply '#b9a8d4' '#a29fb1'

# --- Dim text ---
apply '#a798c2' '#94919f'
apply '#a89bbf' '#94919f'
apply '#a394bd' '#94919f'
apply '#a88cc0' '#94919f'
apply '#9d8fb8' '#8c899a'
apply '#9b8db5' '#8c899a'
apply '#9c90b3' '#8c899a'
apply '#8d7fa8' '#837f93'
apply '#827399' '#726f83'
apply '#7d6f96' '#6c697d'
apply '#6d5f85' '#5f5c6e'

# --- Accent purples -> rose / burgundy ---
apply '#dc9aee' '#ef95bb'
apply '#e79bf5' '#f5a3c4'
apply '#f0b6f8' '#f7b8d0'
apply '#f0a8f5' '#f5a8c8'
apply '#f5b8f0' '#f8bcd4'
apply '#e9a8f5' '#f2b1ca'
apply '#e05ae0' '#e85a92'
apply '#e05ab8' '#e0517f'
apply '#d862e8' '#e05588'
apply '#d451ec' '#d94b82'
apply '#c963e0' '#d84a83'
apply '#b13bcf' '#b83a6e'
apply '#9c28b8' '#962d5c'
apply '#8f24ad' '#822850'
apply '#5e1a75' '#5a1b3e'
apply '#7a1f91' '#7d2448'
apply '#c9a7e2' '#dba0b8'
apply '#d9a8ee' '#eb9fc0'
apply '#eab6f5' '#f2b6cd'
apply '#2a0f33' '#3d0f24'

# --- Dark surface tints ---
apply '#0a080e' '#0b0a10'
apply '#0d0a13' '#0e0c13'
apply '#120e1a' '#110f16'
apply '#0a070f' '#0b090f'

echo "Sweep complete."

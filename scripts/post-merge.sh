#!/bin/bash
set -e

echo ">>> Post-merge setup boshlandi..."

# Barcha bog'liqliklarni o'rnatish
npm install --prefer-offline 2>/dev/null || npm install

echo ">>> Post-merge setup muvaffaqiyatli tugadi."

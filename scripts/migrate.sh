#!/bin/bash
# ============================================================
# CLARY - Supabase Migration Runner
# Barcha migration fayllarni remote Supabase bazasiga yuboradi
# ============================================================

set -e

# .env faylini yuklash (agar mavjud bo'lsa)
if [ -f ".env" ]; then
  echo ">>> .env fayli yuklanmoqda..."
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Agar SUPABASE_DB_URL qiymati "KEY=value" yoki KEY="value" formatida bo'lsa — faqat URL qismini olamiz
if echo "$SUPABASE_DB_URL" | grep -q '='; then
  SUPABASE_DB_URL=$(echo "$SUPABASE_DB_URL" | sed 's/^[^=]*=["'"'"']*//' | sed 's/["'"'"']*$//')
fi

# SUPABASE_DB_URL tekshirish
if [ -z "$SUPABASE_DB_URL" ]; then
  echo ""
  echo "XATO: SUPABASE_DB_URL o'rnatilmagan."
  echo ""
  echo "Supabase Dashboard > Project Settings > Database > Connection string > URI"
  echo "dan ko'chirib SUPABASE_DB_URL secrets ga qo'shing:"
  echo ""
  echo "  postgresql://postgres:[PAROL]@db.[PROJECT_ID].supabase.co:5432/postgres"
  echo ""
  exit 1
fi

MIGRATIONS_DIR="supabase/migrations"
FILES=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)
COUNT=$(echo "$FILES" | wc -l)

echo ""
echo ">>> Supabase migrationlari ishga tushirilmoqda (psql)..."
echo ">>> Jami: $COUNT ta migration fayl"
echo ""

# Replit ichki DATABASE_URL ni override qilmaslik uchun
unset DATABASE_URL

SUCCESS=0
FAIL=0

for f in $FILES; do
  echo -n "  Applying: $(basename $f) ... "
  if PGPASSWORD="" psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=0 -q -f "$f" 2>&1; then
    echo "OK"
    SUCCESS=$((SUCCESS+1))
  else
    echo "XATO (yuqoridagi xabarga qarang)"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo ">>> Natija: $SUCCESS ta muvaffaqiyatli, $FAIL ta xato"

if [ "$FAIL" -gt 0 ]; then
  echo ">>> Ba'zi migrationlarda xato bor — yuqoridagi chiqishni ko'ring."
  exit 1
fi

echo ">>> Barcha migrationlar muvaffaqiyatli bajarildi!"

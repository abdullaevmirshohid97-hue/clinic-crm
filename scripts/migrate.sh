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
else
  echo ">>> Ogohlantirish: .env fayli topilmadi."
  echo "    .env.example faylini ko'chirib .env yarating va to'ldiring."
fi

# SUPABASE_DB_URL tekshirish
if [ -z "$SUPABASE_DB_URL" ]; then
  echo ""
  echo "XATO: SUPABASE_DB_URL o'rnatilmagan."
  echo ""
  echo "Supabase Dashboard > Project Settings > Database > Connection string > URI"
  echo "dan ko'chirib .env fayliga qo'shing:"
  echo ""
  echo "  SUPABASE_DB_URL=postgresql://postgres:[PAROL]@db.[PROJECT_ID].supabase.co:5432/postgres"
  echo ""
  exit 1
fi

echo ""
echo ">>> Supabase migrationlari ishga tushirilmoqda..."
echo ">>> Jami: $(ls supabase/migrations/*.sql 2>/dev/null | wc -l) ta migration fayl"
echo ""

npx supabase db push --db-url "$SUPABASE_DB_URL"

echo ""
echo ">>> Migrationlar muvaffaqiyatli bajarildi!"

#!/bin/bash
# ============================================================
# CLARY - Supabase Edge Functions Deploy Script
# Edge functionlarni remote Supabase ga deploy qiladi
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

# SUPABASE_ACCESS_TOKEN tekshirish
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo ""
  echo "XATO: SUPABASE_ACCESS_TOKEN o'rnatilmagan."
  echo ""
  echo "Supabase Dashboard > Account > Access Tokens"
  echo "dan yangi token yaratib .env fayliga qo'shing:"
  echo ""
  echo "  SUPABASE_ACCESS_TOKEN=your_access_token_here"
  echo ""
  exit 1
fi

# SUPABASE_PROJECT_REF tekshirish
PROJECT_REF="${SUPABASE_PROJECT_REF:-$(cat supabase/.temp/project-ref 2>/dev/null || echo '')}"

if [ -z "$PROJECT_REF" ]; then
  echo ""
  echo "XATO: SUPABASE_PROJECT_REF o'rnatilmagan."
  echo ""
  echo "Supabase Dashboard > Project Settings > General"
  echo "dan Reference ID ni ko'chirib .env fayliga qo'shing:"
  echo ""
  echo "  SUPABASE_PROJECT_REF=your_project_ref_here"
  echo ""
  exit 1
fi

echo ""
echo ">>> Edge functions deploy qilinmoqda..."
echo ">>> Project ref: $PROJECT_REF"
echo ""

npx supabase functions deploy create-staff-user \
  --project-ref "$PROJECT_REF"

echo ""
echo ">>> Edge functions muvaffaqiyatli deploy qilindi!"
echo ""
echo "Deployed functions:"
echo "  - create-staff-user"
echo ""
echo "Eslatma: SUPABASE_SERVICE_ROLE_KEY Supabase Dashboard > Project Settings > API"
echo "bo'limida mavjud va edge function uni avtomatik oladi."

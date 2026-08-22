-- ============================================================================
-- تحديث 003: تخصيص ألوان الموقع (ثيم قابل للتعديل من صفحة الإعدادات)
-- شغّل هذا الملف كاملاً مرة واحدة في Supabase SQL Editor بعد migration_002
-- (آمن التنفيذ عدة مرات: يستعمل if not exists)
-- ============================================================================

alter table public.site_settings
  add column if not exists theme jsonb not null default '{}'::jsonb;

comment on column public.site_settings.theme is
  'تخصيص ألوان الموقع: {bg, ink, primary, accent} بصيغة hex. أي مفتاح غائب
   يستعمل القيمة الافتراضية المضمّنة في كود الموقع.';

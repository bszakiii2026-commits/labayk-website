-- ============================================================================
-- تحديث 002: سنوات دراسية (أرشيف)، إعدادات الموقع، قوالب شهادات التكريم
-- شغّل هذا الملف كاملاً مرة واحدة في Supabase SQL Editor بعد schema.sql
-- (آمن التنفيذ عدة مرات: يستعمل if not exists / on conflict / create or replace)
-- ============================================================================

-- ---------- 1) جدول السنوات الدراسية (أرشيف قابل للتنقل) ----------
create table if not exists public.school_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique, -- مثال: '2025-2026'
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.school_years is 'أرشيف السنوات الدراسية؛ سنة واحدة فقط تكون is_active = true في نفس الوقت';

-- عند تفعيل سنة، تُعطَّل بقية السنوات تلقائياً (سنة نشطة واحدة فقط)
create or replace function public.enforce_single_active_school_year()
returns trigger
language plpgsql
as $$
begin
  if new.is_active then
    update public.school_years set is_active = false
    where id <> new.id and is_active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_school_years_single_active on public.school_years;
create trigger trg_school_years_single_active
after insert or update on public.school_years
for each row when (new.is_active)
execute function public.enforce_single_active_school_year();

-- بذر السنة الحالية تلقائياً إن كان الجدول فارغاً (نفس منطق الحساب السابق:
-- السنة الدراسية تبدأ في سبتمبر) حتى لا تتأثر بيانات الموقع الحالية
insert into public.school_years (label, is_active)
select
  case
    when extract(month from now()) >= 9
      then extract(year from now())::int || '-' || (extract(year from now())::int + 1)
    else (extract(year from now())::int - 1) || '-' || extract(year from now())::int
  end,
  true
where not exists (select 1 from public.school_years);

-- ---------- 2) جدول إعدادات الموقع (صف واحد فقط دائماً) ----------
create table if not exists public.site_settings (
  id boolean primary key default true check (id), -- يضمن وجود صف واحد فقط
  association_name text not null default 'جمعية لبيك الخيرية',
  logo_path text, -- المسار داخل حاوية التخزين site-assets
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists trg_site_settings_updated on public.site_settings;
create trigger trg_site_settings_updated
before update on public.site_settings
for each row execute function public.touch_updated_at();

-- ---------- 3) جدول قوالب شهادات التكريم ----------
create table if not exists public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'قالب شهادة',
  background_color text not null default '#ffffff',
  background_image_path text, -- مسار اختياري داخل site-assets
  orientation text not null default 'landscape' check (orientation in ('landscape', 'portrait')),
  elements jsonb not null default '[]'::jsonb, -- عناصر النص/الصور بمواقع نسبية (%)
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.certificate_templates is 'قوالب تصميم شهادات التكريم؛ elements = مصفوفة عناصر بمواقع نسبية (نص/شعار/صورة)';

drop trigger if exists trg_certificate_templates_updated on public.certificate_templates;
create trigger trg_certificate_templates_updated
before update on public.certificate_templates
for each row execute function public.touch_updated_at();

-- ---------- 4) تفعيل RLS ----------
alter table public.school_years enable row level security;
alter table public.site_settings enable row level security;
alter table public.certificate_templates enable row level security;

-- school_years: القراءة لكل مستخدم مسجّل دخوله، التعديل للمشرف العام فقط
drop policy if exists "school_years_select" on public.school_years;
create policy "school_years_select" on public.school_years
  for select using (auth.uid() is not null);

drop policy if exists "school_years_write" on public.school_years;
create policy "school_years_write" on public.school_years
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- site_settings: القراءة عامة (الشعار/اسم الجمعية يظهران في الصفحة الرئيسية
-- وصفحات الدخول قبل تسجيل الدخول)، التعديل للمشرف العام فقط
drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings
  for select using (true);

drop policy if exists "site_settings_write" on public.site_settings;
create policy "site_settings_write" on public.site_settings
  for update using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- certificate_templates: القراءة والتعديل للمشرف العام فقط
drop policy if exists "certificate_templates_all" on public.certificate_templates;
create policy "certificate_templates_all" on public.certificate_templates
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ---------- 5) حاوية تخزين عامة لأصول الموقع (الشعار، خلفيات الشهادات) ----------
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- القراءة عامة (تُعرض على أي زائر)، الكتابة للمشرف العام فقط
drop policy if exists "site_assets_select" on storage.objects;
create policy "site_assets_select" on storage.objects
  for select using (bucket_id = 'site-assets');

drop policy if exists "site_assets_insert" on storage.objects;
create policy "site_assets_insert" on storage.objects
  for insert with check (
    bucket_id = 'site-assets' and public.is_super_admin(auth.uid())
  );

drop policy if exists "site_assets_update" on storage.objects;
create policy "site_assets_update" on storage.objects
  for update using (
    bucket_id = 'site-assets' and public.is_super_admin(auth.uid())
  );

drop policy if exists "site_assets_delete" on storage.objects;
create policy "site_assets_delete" on storage.objects
  for delete using (
    bucket_id = 'site-assets' and public.is_super_admin(auth.uid())
  );

-- ============================================================================
-- انتهى. لا حاجة لأي إجراء يدوي إضافي — السنة الدراسية الحالية أُضيفت تلقائياً،
-- وصف إعدادات الموقع الافتراضي أُنشئ تلقائياً بالاسم "جمعية لبيك الخيرية".
-- ============================================================================

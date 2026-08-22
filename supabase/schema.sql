-- ============================================================================
-- موقع جمعية "لبيك" الخيرية - المخطط الكامل لقاعدة البيانات
-- شغّل هذا الملف كاملاً مرة واحدة في Supabase: SQL Editor > New query > Run
-- ============================================================================

-- ---------- 1) جدول الملفات الشخصية (حسابات المشرفين) ----------
-- كل صف يمثل حساب دخول حقيقي (أب أو ابن أكبر أو مشرف عام).
-- parent_supervisor_id يبني هرم الحسابات: الابن مرتبط بحساب أبيه.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'supervisor' check (role in ('super_admin', 'supervisor')),
  parent_supervisor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'حسابات الدخول: مشرف عام (لجنة الجمعية) أو مشرف عائلة (أب / ابن أكبر)';

-- ---------- 2) دالة تتحقق هل المستخدم مشرف عام ----------
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'super_admin'
  );
$$;

-- ---------- 3) دالة تتحقق هل "viewer" هو نفسه أو أحد أسلاف حساب "target" ----------
-- تُستخدم حتى يرى الأب/الجد كل الحسابات الفرعية تحته (هرم متعدد المستويات)
create or replace function public.is_ancestor_or_self(viewer uuid, target uuid)
returns boolean
language sql
security definer
stable
as $$
  with recursive chain as (
    select id, parent_supervisor_id from public.profiles where id = target
    union all
    select p.id, p.parent_supervisor_id
    from public.profiles p
    join chain c on p.id = c.parent_supervisor_id
  )
  select exists (select 1 from chain where id = viewer)
     or viewer = target;
$$;

-- ---------- 4) جدول أفراد العائلة (الأبناء / الإخوة الذين لا يملكون حسابًا مستقلاً) ----------
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  relation text not null default 'ابن/ابنة',
  birth_date date,
  grade_level text, -- المستوى الدراسي، مثال: 'السنة الرابعة ابتدائي'
  is_student boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.family_members is 'الأبناء/الإخوة الذين يديرهم حساب مشرف واحد (owner_id) ولا يملكون حساب دخول خاص بهم';

-- ---------- 5) جدول كشوف النقاط ----------
create table if not exists public.report_cards (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members (id) on delete cascade,
  school_year text not null, -- مثال: '2025-2026'
  trimester smallint not null check (trimester in (1, 2, 3)),
  image_path text, -- المسار داخل Supabase Storage
  extracted_average numeric(5, 2), -- الناتج التلقائي من OCR
  manual_average numeric(5, 2),    -- تعديل/تأكيد المشرف (له الأولوية)
  created_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (family_member_id, school_year, trimester)
);

comment on table public.report_cards is 'صورة كشف النقاط + المعدل لكل فصل دراسي';

-- عمود محسوب: المعدل النهائي المعتمد (اليدوي أولاً، وإلا التلقائي)
create or replace view public.report_cards_final as
select
  r.*,
  coalesce(r.manual_average, r.extracted_average) as final_average
from public.report_cards r;

-- ---------- 6) دالة تحدّث updated_at تلقائياً ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_report_cards_updated on public.report_cards;
create trigger trg_report_cards_updated
before update on public.report_cards
for each row execute function public.touch_updated_at();

-- ---------- 7) تفعيل Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.report_cards enable row level security;

-- --- سياسات profiles ---
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_super_admin(auth.uid())
    or public.is_ancestor_or_self(auth.uid(), id)
  );

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- --- سياسات family_members ---
drop policy if exists "family_select" on public.family_members;
create policy "family_select" on public.family_members
  for select using (
    public.is_super_admin(auth.uid())
    or public.is_ancestor_or_self(auth.uid(), owner_id)
  );

drop policy if exists "family_insert" on public.family_members;
create policy "family_insert" on public.family_members
  for insert with check (owner_id = auth.uid());

drop policy if exists "family_update" on public.family_members;
create policy "family_update" on public.family_members
  for update using (
    owner_id = auth.uid() or public.is_super_admin(auth.uid())
  );

drop policy if exists "family_delete" on public.family_members;
create policy "family_delete" on public.family_members
  for delete using (
    owner_id = auth.uid() or public.is_super_admin(auth.uid())
  );

-- --- سياسات report_cards (عبر التحقق من عائلة family_member) ---
drop policy if exists "reports_select" on public.report_cards;
create policy "reports_select" on public.report_cards
  for select using (
    exists (
      select 1 from public.family_members fm
      where fm.id = family_member_id
        and (
          public.is_super_admin(auth.uid())
          or public.is_ancestor_or_self(auth.uid(), fm.owner_id)
        )
    )
  );

drop policy if exists "reports_insert" on public.report_cards;
create policy "reports_insert" on public.report_cards
  for insert with check (
    exists (
      select 1 from public.family_members fm
      where fm.id = family_member_id and fm.owner_id = auth.uid()
    )
  );

drop policy if exists "reports_update" on public.report_cards;
create policy "reports_update" on public.report_cards
  for update using (
    exists (
      select 1 from public.family_members fm
      where fm.id = family_member_id
        and (fm.owner_id = auth.uid() or public.is_super_admin(auth.uid()))
    )
  );

-- ---------- 8) تخزين الصور (Storage bucket) ----------
insert into storage.buckets (id, name, public)
values ('report-cards', 'report-cards', false)
on conflict (id) do nothing;

-- سياسات Storage: يسمح فقط لصاحب الطفل (أو سلفه أو المشرف العام) بالقراءة/الرفع
-- المسار المتفق عليه هو: {family_member_id}/{school_year}_{trimester}.jpg
drop policy if exists "report_images_select" on storage.objects;
create policy "report_images_select" on storage.objects
  for select using (
    bucket_id = 'report-cards'
    and exists (
      select 1 from public.family_members fm
      where fm.id::text = (storage.foldername(name))[1]
        and (
          public.is_super_admin(auth.uid())
          or public.is_ancestor_or_self(auth.uid(), fm.owner_id)
        )
    )
  );

drop policy if exists "report_images_insert" on storage.objects;
create policy "report_images_insert" on storage.objects
  for insert with check (
    bucket_id = 'report-cards'
    and exists (
      select 1 from public.family_members fm
      where fm.id::text = (storage.foldername(name))[1]
        and fm.owner_id = auth.uid()
    )
  );

drop policy if exists "report_images_update" on storage.objects;
create policy "report_images_update" on storage.objects
  for update using (
    bucket_id = 'report-cards'
    and exists (
      select 1 from public.family_members fm
      where fm.id::text = (storage.foldername(name))[1]
        and fm.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- ملاحظة هامة بعد إنشاء أول حساب مشرف عام (لجنة الجمعية):
-- نفّذ هذا السطر يدوياً (بعد استبدال البريد الإلكتروني) لترقيته إلى مشرف عام:
--
--   update public.profiles set role = 'super_admin'
--   where id = (select id from auth.users where email = 'admin@example.com');
--
-- ============================================================================

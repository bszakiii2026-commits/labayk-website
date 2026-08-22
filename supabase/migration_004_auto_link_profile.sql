-- ============================================================================
-- تحديث 004: حل جذري لمشكلة عدم ربط الحساب الفرعي بالمشرف الصحيح
-- ============================================================================
-- المشكلة: حالياً يعتمد إنشاء صف profiles (وربطه بـ parent_supervisor_id)
-- على كود الواجهة فقط، وينفَّذ فقط إن وصلت قيمة الدعوة (?invite=) سليمة إلى
-- نموذج التسجيل. أي عطل في الطريق (رابط دعوة أُعيد توجيهه، انقطاع الشبكة،
-- خطأ في المتصفح...) ينتج عنه حساب "يتيم" بلا مشرف أب، يحتاج إصلاحاً يدوياً.
--
-- الحل: دالة + trigger على auth.users تُنشئ صف profiles تلقائياً وبشكل
-- مضمون في قاعدة البيانات نفسها لحظة إنشاء أي حساب مصادقة جديد، بقراءة
-- الاسم ومعرّف المشرف الداعي مباشرة من بيانات التسجيل (raw_user_meta_data)
-- التي يرسلها Supabase Auth دائماً بغض النظر عن حالة تأكيد البريد الإلكتروني
-- أو أي عطل لاحق في كود الواجهة. كود الواجهة الحالي يبقى يعمل بلا تغيير
-- (يتجاهل بأمان خطأ "الصف موجود مسبقاً" إن سبقه الـ trigger).
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
begin
  begin
    v_parent := nullif(new.raw_user_meta_data->>'parent_supervisor_id', '')::uuid;
  exception when others then
    v_parent := null;
  end;

  insert into public.profiles (id, full_name, parent_supervisor_id, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'بدون اسم'),
    v_parent,
    'supervisor'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_auto_create_profile on auth.users;
create trigger trg_auto_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- شبكة أمان إضافية: إصلاح فوري لأي حسابات "يتيمة" موجودة حالياً (مشرف بلا
-- مشرف أب، غير المشرف العام نفسه) عبر ربطها تلقائياً بالمشرف العام — نفس ما
-- كان يُصلَح يدوياً بالـ SQL سابقاً، لكن كخطوة تلقائية ضمن هذا التحديث.
-- إن كان لديك أكثر من مشرف عام واحد ينبغي ربط كل حالة يدوياً بدل هذا السطر.
-- ============================================================================
update public.profiles
set parent_supervisor_id = (select id from public.profiles where role = 'super_admin' limit 1)
where role = 'supervisor'
  and parent_supervisor_id is null;

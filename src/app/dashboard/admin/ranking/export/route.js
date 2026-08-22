import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { resolveSchoolYear } from "@/lib/schoolYear";

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const requestedYear = new URL(request.url).searchParams.get("year");
  const { schoolYear } = await resolveSchoolYear(supabase, requestedYear);

  const { data: members } = await supabase
    .from("family_members")
    .select("id, full_name, grade_level, owner_id")
    .eq("is_student", true);

  const { data: owners } = await supabase.from("profiles").select("id, full_name");
  const ownerNameById = Object.fromEntries((owners || []).map((o) => [o.id, o.full_name]));

  const memberIds = (members || []).map((m) => m.id);
  const { data: reportCards } = memberIds.length
    ? await supabase
        .from("report_cards")
        .select("family_member_id, manual_average, extracted_average")
        .eq("school_year", schoolYear)
        .in("family_member_id", memberIds)
    : { data: [] };

  const valuesByMember = {};
  for (const r of reportCards || []) {
    const avg = r.manual_average ?? r.extracted_average;
    if (avg == null) continue;
    valuesByMember[r.family_member_id] ??= [];
    valuesByMember[r.family_member_id].push(Number(avg));
  }

  const rows = (members || [])
    .map((m) => {
      const values = valuesByMember[m.id] || [];
      const annualAverage = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
      return {
        full_name: m.full_name,
        grade_level: m.grade_level || "",
        owner_name: ownerNameById[m.owner_id] || "",
        trimesters_uploaded: values.length,
        annual_average: annualAverage != null ? annualAverage.toFixed(2) : "",
      };
    })
    .filter((r) => r.annual_average !== "")
    .sort((a, b) => {
      if (a.grade_level !== b.grade_level) return a.grade_level.localeCompare(b.grade_level, "ar");
      return Number(b.annual_average) - Number(a.annual_average);
    });

  const header = ["الاسم", "المستوى الدراسي", "العائلة", "عدد الفصول", "المعدل السنوي"];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [r.full_name, r.grade_level, r.owner_name, r.trimesters_uploaded, r.annual_average]
        .map(csvEscape)
        .join(",")
    );
  }
  // BOM حتى يفتح Excel الملف بترميز UTF-8 صحيح مع النصوص العربية
  const csv = "﻿" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ranking-${schoolYear}.csv"`,
    },
  });
}

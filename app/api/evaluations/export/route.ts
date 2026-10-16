
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "researcher") {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: assignments, error: assignmentsError } =
    await supabase
      .from("assignments")
      .select("id, evaluator_id, video_id")
      .eq("status", "completed");

  if (assignmentsError) {
    return new Response("Unable to load assignments", {
      status: 500,
    });
  }

  const questionIds = Array.from(
    { length: 29 },
    (_, i) => i + 1
  );

  const headers = [
    "assignment_id",
    "video_id",
    "evaluator_id",
    ...questionIds.map(id => `Q${id}`),
  ];

  const escapeCsv = (value: unknown) => {
    const str = String(value ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows: string[][] = [];

  for (const assignment of assignments ?? []) {
    const { data: evaluation, error: evaluationError } =
      await supabase
        .from("evaluations")
        .select("id, submitted_at")
        .eq("assignment_id", assignment.id)
        .not("submitted_at", "is", null)
        .maybeSingle();

    if (evaluationError) {
      return new Response("Unable to load evaluation", {
        status: 500,
      });
    }

    if (!evaluation) continue;

    const { data: responses, error: responsesError } =
      await supabase
        .from("evaluation_responses")
        .select("question_id, answer, is_na")
        .eq("evaluation_id", evaluation.id);

    if (responsesError) {
      return new Response("Unable to load responses", {
        status: 500,
      });
    }

    const answerMap = new Map<number, string>();

    for (const response of responses ?? []) {
      answerMap.set(
        response.question_id,
        response.is_na
          ? "N/A"
          : String(response.answer)
      );
    }

    rows.push([
      assignment.id,
      assignment.video_id,
      assignment.evaluator_id,
      ...questionIds.map(id => answerMap.get(id) ?? ""),
    ]);
  }

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map(row => row.map(escapeCsv).join(",")),
  ].join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="annotateiq_evaluations.csv"',
      "Cache-Control": "no-store",
    },
  });
}

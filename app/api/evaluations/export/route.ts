
import { createClient } from "@/lib/supabase/server";

type ExportAssignment = {
  id: string;
  evaluator_id: string;
  video_id: string;
  status: string;
  study_phase: string | null;
};

const testEvaluatorId =
  "b39a147a-1db7-4cec-94bc-71d8834ca180";

const evaluatorLabels: Record<string, string> = {
  "011a7a27-c4e2-4be6-affc-6de92590d297": "Evaluator 1",
  "00ff06f2-1452-40ac-849c-804d52c35201": "Evaluator 2",
  "933d16bd-cf78-460f-8c8c-35fabb4c119f": "Evaluator 3",
  "c49e0056-496d-4a8a-9551-95c4cdf5392d": "Evaluator 4",
  "91f4dbe5-de9b-4396-b05c-ab17efc22abc": "Evaluator 5",
  "01c01f82-75bf-4fb9-9083-20616543413b": "Evaluator 6",
  "b39a147a-1db7-4cec-94bc-71d8834ca180": "Test Evaluator",
};

const evaluatorEmails: Record<string, string> = {
  "011a7a27-c4e2-4be6-affc-6de92590d297": "evaluator01@example.com",
  "00ff06f2-1452-40ac-849c-804d52c35201": "evaluator02@example.com",
  "933d16bd-cf78-460f-8c8c-35fabb4c119f": "evaluator03@example.com",
  "c49e0056-496d-4a8a-9551-95c4cdf5392d": "evaluator04@example.com",
  "91f4dbe5-de9b-4396-b05c-ab17efc22abc": "evaluator05@example.com",
  "01c01f82-75bf-4fb9-9083-20616543413b": "evaluator06@example.com",
  "b39a147a-1db7-4cec-94bc-71d8834ca180": "lenaposhni@gmail.com",
};

const questionIds = Array.from(
  { length: 29 },
  (_, i) => i + 1
);

const headers = [
  "assignment_id",
  "video_id",
  "evaluator_id",
  "evaluator_name",
  "evaluator_email",
  "study_phase",
  "status",
  "Q0_video_accessible",
  ...questionIds.map(id => `Q${id}`),
  "submitted_at",
];

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();

  // 1. Verify authentication.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Restrict exports to researchers.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "researcher") {
    return new Response("Forbidden", { status: 403 });
  }

  // 3. Include test data only when explicitly requested.
  const url = new URL(request.url);
  const includeTest =
    url.searchParams.get("include_test") === "true";

  // 4. Load all resolved assignments with pagination.
  const assignments: ExportAssignment[] = [];
  const pageSize = 500;

  for (let start = 0; ; start += pageSize) {
    let query = supabase
      .from("assignments")
      .select("id, evaluator_id, video_id, status, study_phase")
      .in("status", ["completed", "unavailable"])
      .order("id")
      .range(start, start + pageSize - 1);

    if (!includeTest) {
      query = query.neq("evaluator_id", testEvaluatorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Assignment export failed:", error);
      return new Response("Unable to load assignments", {
        status: 500,
      });
    }

    const page = (data ?? []) as ExportAssignment[];
    assignments.push(...page);

    if (page.length < pageSize) break;
  }

  // 5. Build one CSV row per resolved assignment.
  const rows: string[][] = [];

  for (const assignment of assignments) {
    const { data: evaluation, error: evaluationError } =
      await supabase
        .from("evaluations")
        .select("id, submitted_at, video_accessible")
        .eq("assignment_id", assignment.id)
        .not("submitted_at", "is", null)
        .maybeSingle();

    if (evaluationError) {
      console.error(
        "Unable to load evaluation:",
        assignment.id,
        evaluationError
      );

      return new Response("Unable to load evaluation", {
        status: 500,
      });
    }

    // Stop rather than silently omit missing evaluations.
    if (!evaluation) {
      console.error(
        "Missing submitted evaluation for assignment:",
        assignment.id
      );

      return new Response(
        "Export validation failed: a resolved assignment has no submitted evaluation.",
        { status: 500 }
      );
    }

    const { data: responses, error: responsesError } =
      await supabase
        .from("evaluation_responses")
        .select("question_id, answer, is_na")
        .eq("evaluation_id", evaluation.id);

    if (responsesError) {
      console.error(
        "Unable to load responses:",
        assignment.id,
        responsesError
      );

      return new Response("Unable to load responses", {
        status: 500,
      });
    }

    const answerMap = new Map<number, string>();

    for (const response of responses ?? []) {
      if (answerMap.has(response.question_id)) {
        console.error(
          "Duplicate rubric response:",
          assignment.id,
          response.question_id
        );

        return new Response(
          "Export validation failed: duplicate rubric response.",
          { status: 500 }
        );
      }

      answerMap.set(
        response.question_id,
        response.is_na
          ? "NA"
          : response.answer === null
            ? ""
            : String(response.answer)
      );
    }

    const accessible =
      evaluation.video_accessible === true
        ? "1"
        : evaluation.video_accessible === false
          ? "0"
          : "";

    // Unavailable videos should not contain rubric answers.
    if (
      assignment.status === "unavailable" &&
      answerMap.size > 0
    ) {
      console.error(
        "Unavailable video has rubric responses:",
        assignment.id
      );

      return new Response(
        "Export validation failed: unavailable video has rubric responses.",
        { status: 500 }
      );
    }

    // Check consistency between assignment status and Q0.
    if (
      (assignment.status === "unavailable" && accessible !== "0") ||
      (assignment.status === "completed" && accessible === "0")
    ) {
      console.error(
        "Accessibility/status mismatch:",
        assignment.id
      );

      return new Response(
        "Export validation failed: accessibility/status mismatch.",
        { status: 500 }
      );
    }

    rows.push([
      assignment.id,
      assignment.video_id,
      assignment.evaluator_id,
      evaluatorLabels[assignment.evaluator_id] ?? "Unknown Evaluator",
      evaluatorEmails[assignment.evaluator_id] ?? "",
      assignment.study_phase ?? "",
      assignment.status,
      accessible,
      ...questionIds.map(id => answerMap.get(id) ?? ""),
      evaluation.submitted_at ?? "",
    ]);
  }

  // 6. Ensure every resolved assignment was exported.
  if (rows.length !== assignments.length) {
    console.error("Export row count mismatch:", {
      assignments: assignments.length,
      exportedRows: rows.length,
    });

    return new Response(
      "Export validation failed: row count mismatch.",
      { status: 500 }
    );
  }

  // 7. Generate CSV.
  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map(row => row.map(escapeCsv).join(",")),
  ].join("\r\n");

  return new Response("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="annotateiq_evaluations.csv"',
      "Cache-Control": "no-store",
    },
  });
}


import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Structured Human Annotation",
    description:
      "Evaluate health insurance educational videos using a standardized 29-question rubric across 10 categories.",
  },
  {
    number: "02",
    title: "Video Evaluation Workspace",
    description:
      "Watch educational videos, review transcripts, complete evaluations, and save progress in one workspace.",
  },
  {
    number: "03",
    title: "Researcher Dashboard",
    description:
      "Manage evaluator assignments, monitor completion rates, and export structured evaluation data for analysis.",
  },
  {
    number: "04",
    title: "AI-Assisted Research",
    description:
      "Designed to support future human–LLM agreement analysis, evaluator calibration, and automated video quality assessment.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Collect",
    description:
      "Organize educational video metadata and transcripts.",
  },
  {
    step: "02",
    title: "Annotate",
    description:
      "Gather structured evaluations from human reviewers.",
  },
  {
    step: "03",
    title: "Analyze",
    description:
      "Export evaluation data for reliability and quality analysis.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080d1c] text-white">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
        >
          <span className="text-indigo-400">Annotate</span>IQ
        </Link>

        <Link
          href="/login"
          className="rounded-lg border border-indigo-400/40 px-5 py-2.5 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/10"
        >
          Sign In →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 md:pt-32">
        <div className="max-w-4xl">
          <span className="inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Health Informatics × Human-Centered AI
          </span>

          <h1 className="mt-10 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Better health education starts with{" "}
            <span className="text-indigo-400">
              better evaluation.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300">
            AnnotateIQ is a research platform for evaluating the
            quality and understandability of health insurance
            educational videos through structured human annotation.
          </p>

          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            Built to bridge human judgment and artificial
            intelligence in the pursuit of more accessible,
            understandable healthcare information.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-7 py-4 font-semibold transition hover:bg-indigo-500"
            >
              Access Research Platform →
            </Link>

            <a
              href="#features"
              className="rounded-lg border border-white/20 px-7 py-4 font-semibold text-slate-200 transition hover:bg-white/5"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Research Statistics */}
        <div className="mt-24 grid gap-4 sm:grid-cols-3">
          {[
            { value: "29", label: "Evaluation Questions" },
            { value: "10", label: "Rubric Categories" },
            { value: "6", label: "Planned Human Evaluators" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-[#182136] p-7"
            >
              <p className="text-4xl font-bold text-indigo-300">
                {stat.value}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-white/10 bg-[#0d1425] py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
            Platform Capabilities
          </p>

          <h2 className="mt-4 max-w-2xl text-4xl font-bold">
            Built for rigorous, scalable research.
          </h2>

          <p className="mt-5 max-w-2xl text-slate-400">
            A centralized workspace for collecting, managing,
            and analyzing educational video evaluations.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.number}
                className="rounded-xl border border-white/10 bg-[#182136] p-8 transition hover:border-indigo-500/40"
              >
                <p className="text-sm font-medium text-indigo-400">
                  {feature.number}
                </p>

                <h3 className="mt-5 text-xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Workflow */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
          Research Workflow
        </p>

        <h2 className="mt-4 text-4xl font-bold">
          From video to insight.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {workflow.map((item) => (
            <div
              key={item.step}
              className="border-t border-indigo-500/50 pt-6"
            >
              <p className="text-sm font-semibold text-indigo-400">
                {item.step}
              </p>

              <h3 className="mt-4 text-xl font-semibold">
                {item.title}
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Research Mission */}
      <section className="border-y border-white/10 bg-[#0d1425] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
              The Research
            </p>

            <h2 className="mt-4 text-4xl font-bold">
              Connecting human judgment and AI.
            </h2>

            <p className="mt-6 leading-8 text-slate-400">
              Navigating health insurance can be challenging,
              and educational resources vary in quality.
              AnnotateIQ supports systematic evaluation of
              video-based resources to help researchers understand
              which materials are clear, accurate, and useful.
            </p>

            <p className="mt-5 leading-8 text-slate-400">
              The platform is actively being developed to
              support inter-rater reliability measurement,
              evaluator calibration, and LLM-as-a-judge
              experiments that compare AI-generated assessments
              with human reference labels.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <p className="text-lg font-bold">
            <span className="text-indigo-400">Annotate</span>IQ
          </p>

          <p className="text-sm text-slate-500">
            Health Informatics × Human-Centered AI
          </p>
        </div>
      </footer>
    </main>
  );
}

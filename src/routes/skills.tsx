import { createFileRoute } from "@tanstack/react-router";
import { SkillsView } from "@/components/harness/skills-view";

export const Route = createFileRoute("/skills")({
  validateSearch: (search: Record<string, unknown>): { skill?: string } => ({
    skill: typeof search.skill === "string" ? search.skill : undefined,
  }),
  component: SkillsPage,
});

function SkillsPage() {
  const { skill } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SkillsView
      heading={{
        eyebrow: "Agent Harness / Registry Matrix",
        title: "Agent Skills Engine",
        description:
          "Orchestrate source capabilities mapped via atomic symlinks into IDE harnesses and agents.",
      }}
      inspected={skill}
      onInspect={(id) => void navigate({ search: { skill: id } })}
    />
  );
}

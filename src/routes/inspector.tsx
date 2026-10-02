import { createFileRoute } from "@tanstack/react-router";
import { SkillsView } from "@/components/harness/skills-view";
import { initialSkills } from "@/lib/harness-data";

export const Route = createFileRoute("/inspector")({
  validateSearch: (search: Record<string, unknown>): { skill?: string } => ({
    skill: typeof search.skill === "string" ? search.skill : undefined,
  }),
  component: InspectorPage,
});

function InspectorPage() {
  const { skill = initialSkills[0].id } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SkillsView
      heading={{
        eyebrow: "Filesystem / Link Topology",
        title: "Symlink Inspector",
        description:
          "Inspect source definitions, mounted targets, and the integrity of harness connections.",
      }}
      inspected={skill}
      onInspect={(id) =>
        void (id
          ? navigate({ search: { skill: id } })
          : navigate({ to: "/skills", search: { skill: undefined } }))
      }
    />
  );
}

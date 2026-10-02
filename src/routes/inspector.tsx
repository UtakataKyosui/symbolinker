import { createFileRoute } from "@tanstack/react-router";
import { SkillsView } from "@/components/harness/skills-view";
import { useHarness } from "@/lib/harness-context";

export const Route = createFileRoute("/inspector")({
  validateSearch: (search: Record<string, unknown>): { skill?: string } => ({
    skill: typeof search.skill === "string" ? search.skill : undefined,
  }),
  component: InspectorPage,
});

function InspectorPage() {
  const { overview } = useHarness();
  const { skill } = Route.useSearch();
  const navigate = Route.useNavigate();

  const firstSkill = overview?.library.skills[0];
  const defaultSkill = skill ?? firstSkill;

  return (
    <SkillsView
      heading={{
        eyebrow: "Filesystem / Link Topology",
        title: "Symlink Inspector",
        description:
          "Inspect library items, linked targets, and the integrity of harness connections.",
      }}
      inspected={defaultSkill}
      onInspect={(id) =>
        void (id
          ? navigate({ search: { skill: id } })
          : navigate({ to: "/skills", search: { skill: undefined } }))
      }
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Box,
  Download,
  Grid2X2,
  Link,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeading, Panel, Status } from "@/components/harness/primitives";
import { ProfileCards } from "@/components/harness/profile-cards";
import { downloadJson } from "@/lib/download-json";
import { useHarness } from "@/lib/harness-context";
import { profiles } from "@/lib/harness-data";

export const Route = createFileRoute("/profiles")({
  component: ProfilesPage,
});

function ProfilesPage() {
  const { skills, setSkills, activeProfile, linked, setDialog } = useHarness();
  return (
    <>
      <PageHeading
        eyebrow="Orchestration / Profiles & Rule Matrix"
        title="Profiles & Rule Matrix"
        description="Define bundles of skills, hooks, and rules for your developer persona and workspace."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadJson("harness-matrix.json", { profile: activeProfile.name, skills })
              }
            >
              <Download />
              Export Matrix
            </Button>
            <Button onClick={() => setDialog("apply")}>
              <Link />
              Apply Symlinks
            </Button>
          </>
        }
      />
      <section className="panel live-profile">
        <div className="flex gap-3 items-center">
          <div className="profile-symbol">
            <Terminal />
          </div>
          <div>
            <div className="eyebrow">Live state: Active harness profile</div>
            <h2>
              {activeProfile.name} <Status>Preview</Status>
            </h2>
          </div>
        </div>
        <div className="live-profile-counts">
          <span>
            <Box />
            {linked} Skills
          </span>
          <span>
            <Zap />
            {activeProfile.hooks} Hooks
          </span>
          <span>
            <ShieldCheck />
            Preset
          </span>
        </div>
      </section>
      <div className="profiles-layout">
        <Panel
          title="Capability × Profile Matrix"
          icon={<Grid2X2 />}
          extra={<span className="micro muted">Click toggles to configure preview</span>}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Capability / Extension Target</TableHead>
                {profiles.map((p, index) => (
                  <TableHead
                    key={p.name}
                    className={p.name === activeProfile.name ? "matrix-active" : ""}
                  >
                    {["Frontend", "Tech Lead", "Python", "Fullstack"][index]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <strong className="mono">{s.id}</strong>
                    <p className="row-description">{s.description}</p>
                  </TableCell>
                  {s.matrix.map((checked, index) => (
                    <TableCell
                      key={index}
                      className={profiles[index].name === activeProfile.name ? "matrix-active" : ""}
                    >
                      <Checkbox
                        aria-label={`${s.id} for ${profiles[index].name}`}
                        checked={checked}
                        onCheckedChange={(next) =>
                          setSkills((previous) =>
                            previous.map((skill) =>
                              skill.id === s.id
                                ? {
                                    ...skill,
                                    matrix: skill.matrix.map((value, i) =>
                                      i === index ? next : value,
                                    ),
                                  }
                                : skill,
                            ),
                          )
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="table-footer">
            <span>Matrix version: Preview v1</span>
            <code>.agent/profiles.matrix.json</code>
          </div>
        </Panel>
        <div className="column-stack">
          <Panel title="Preset Switcher" icon={<SlidersHorizontal />}>
            <ProfileCards />
          </Panel>
          <Panel
            title="Dynamic Activation Engine"
            icon={<Zap />}
            extra={<Status tone="amber">Preview Rules</Status>}
          >
            <p className="panel-description">
              Workspace heuristics for automatic profile activation.
            </p>
            {[
              ["Next.js Workspace", 'package.json contains "next"', "Frontend Specialist"],
              ["Release Branching", "git branch matches release/*", "Tech Lead & Code Reviewer"],
              ["Python Environment", "root has pyproject.toml", "Backend Python Engineer"],
            ].map(([title, condition, profile]) => (
              <div className="heuristic" key={title}>
                <strong>{title}</strong>
                <code>{condition}</code>
                <span>
                  <ArrowRight />
                  {profile}
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}

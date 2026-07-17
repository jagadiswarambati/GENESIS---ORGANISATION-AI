"use client";

import { motion as motionElement, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { icons } from "@/lib/icons";
import { slideUp } from "@/lib/motion";

import { Badge, Chip, StatusIndicator } from "./badge";
import { Button } from "./button";
import { Card, Panel } from "./card";
import { CommandPalettePlaceholder } from "./command-palette";
import { Dialog, DialogFooter } from "./dialog";
import { DnaSlider } from "./dna-slider";
import { EmptyState, ErrorState, LoadingIndicator, NotificationToast, Skeleton } from "./feedback";
import { PageContainer, SectionHeader, SidebarContainer, TopNavigation } from "./layout";
import {
  DepartmentCard,
  MetricCard,
  MissionCard,
  OrganizationCard,
  OrganizationGenerationPlaceholder,
  RoleCard,
  TimelineCard,
  WorkerCard,
} from "./organization";
import { ProgressBar } from "./progress";
import { SearchInput } from "./search-input";
import { ThemeToggle } from "../theme/theme-toggle";

function GuideSection({
  children,
  description,
  title,
}: Readonly<{
  children: React.ReactNode;
  description?: string;
  title: string;
}>): React.JSX.Element {
  return (
    <section className="border-border border-t py-10 first:border-t-0 first:pt-0">
      <SectionHeader description={description} title={title} />
      <div className="mt-6">{children}</div>
    </section>
  );
}

const swatches = [
  { name: "background", className: "bg-background" },
  { name: "surface", className: "bg-surface" },
  { name: "panel", className: "bg-panel" },
  { name: "border", className: "bg-border" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
  { name: "info", className: "bg-info" },
] as const;

export function StyleGuide(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dnaValue, setDnaValue] = useState(68);
  const reduceMotion = useReducedMotion();
  const BrandIcon = icons.organization;

  return (
    <div className="bg-background min-h-screen">
      <TopNavigation>
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <BrandIcon aria-hidden="true" size={15} />
          </span>
          <span className="text-title">Genesis</span>
          <Badge tone="neutral">Development</Badge>
        </div>
        <ThemeToggle />
      </TopNavigation>
      <PageContainer>
        <motionElement.div
          animate="visible"
          initial="hidden"
          variants={reduceMotion ? undefined : slideUp}
        >
          <p className="text-label text-muted">Design system</p>
          <h1 className="text-display mt-2">Calm infrastructure for ambitious organizations.</h1>
          <p className="max-w-reading text-subtitle text-secondary mt-4">
            A development-only reference for Genesis primitives. It establishes a premium
            operating-system language without implementing a product workflow.
          </p>
        </motionElement.div>

        <GuideSection
          description="Semantic colors resolve from tokens and adapt automatically to the active theme."
          title="Color system"
        >
          <div className="grid-auto-fit grid gap-3">
            {swatches.map((swatch) => (
              <Card className="overflow-hidden" key={swatch.name}>
                <div className={`h-16 ${swatch.className}`} />
                <p className="text-caption text-secondary p-3 capitalize">{swatch.name}</p>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="bg-glass text-caption text-secondary ring-border rounded-md px-3 py-2 ring-1">
              Glass surface
            </span>
            <span className="bg-overlay text-caption text-foreground rounded-md px-3 py-2">
              Overlay
            </span>
            <span className="border-focus text-caption text-secondary rounded-md border-2 px-3 py-2">
              Focus
            </span>
            <span className="bg-selection text-caption text-foreground rounded-md px-3 py-2">
              Selection
            </span>
          </div>
        </GuideSection>

        <GuideSection
          description="A compact hierarchy designed for clarity at the speed of operating work."
          title="Typography"
        >
          <div className="space-y-5">
            <p className="text-display">Display — Design. Operate. Learn. Evolve.</p>
            <p className="text-heading">Heading — Organizational intelligence, made operational.</p>
            <p className="text-title">Title — Department performance</p>
            <p className="text-subtitle text-secondary">
              Subtitle — Context that supports the decision without competing with it.
            </p>
            <p className="text-body text-secondary">
              Body — Genesis uses readable, restrained body copy for information-dense workspaces.
            </p>
            <p className="text-caption text-muted">Caption — Updated a moment ago</p>
            <p className="text-label text-muted">Label — Mission status</p>
            <p className="text-caption text-secondary font-mono">Mono — genesis.run_0184</p>
          </div>
        </GuideSection>

        <GuideSection
          description="A small, consistent action vocabulary with visible focus and predictable density."
          title="Buttons, search, and command primitives"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SearchInput placeholder="Search the organization" />
            <CommandPalettePlaceholder />
          </div>
        </GuideSection>

        <GuideSection
          description="Status should communicate meaning with text and shape, not color alone."
          title="Badges and status"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">Primary</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <Badge tone="info">Info</Badge>
            <Chip>Product strategy</Chip>
            <StatusIndicator status="active" />
            <StatusIndicator status="processing" />
            <StatusIndicator status="blocked" />
          </div>
        </GuideSection>

        <GuideSection
          description="Reusable surfaces establish information hierarchy without visual noise."
          title="Surfaces, elevation, and progress"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <p className="text-title">Card</p>
              <p className="text-body text-secondary mt-2">
                Low-elevation, durable information surface.
              </p>
            </Card>
            <Panel className="p-5">
              <p className="text-title">Panel</p>
              <p className="text-body text-secondary mt-2">
                A grouped work area with quiet separation.
              </p>
            </Panel>
            <div className="surface-glass border-border shadow-floating rounded-xl border p-5">
              <p className="text-title">Glass surface</p>
              <p className="text-body text-secondary mt-2">
                Reserved for layered or floating controls.
              </p>
            </div>
          </div>
          <ProgressBar
            className="max-w-reading mt-6"
            label="Documenting the design system"
            value={74}
          />
        </GuideSection>

        <GuideSection
          description="These are visual primitives for future organization surfaces—not a dashboard."
          title="Organization primitives"
        >
          <div className="grid-auto-fit grid gap-4">
            <OrganizationCard
              description="A durable organizational unit."
              meta="3 departments"
              name="Genesis Labs"
              status="active"
            />
            <DepartmentCard
              description="Functional ownership and intent."
              meta="4 active roles"
              name="Research"
              status="processing"
            />
            <RoleCard
              description="A stable responsibility definition."
              meta="Capacity: 2 workers"
              name="Systems Analyst"
              status="active"
            />
            <WorkerCard
              description="An execution capacity for a role."
              meta="Last active: now"
              name="Worker 01"
              status="idle"
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <MissionCard
              description="Static component sample for an outcome-oriented work unit."
              progress={58}
              status="processing"
              title="Explore a new market"
            />
            <Card className="p-5">
              <TimelineCard timestamp="09:42" title="Research brief prepared">
                A source-aware brief is ready for review.
              </TimelineCard>
              <TimelineCard timestamp="10:08" title="Review requested" tone="warning">
                A human decision is needed before continuing.
              </TimelineCard>
              <TimelineCard timestamp="10:11" title="Structure updated" tone="success">
                The organization graph has been refreshed.
              </TimelineCard>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <MetricCard change="+12%" label="Completion rate" value="94%" />
            <MetricCard label="Average cycle" value="18 min" />
            <OrganizationGenerationPlaceholder />
          </div>
        </GuideSection>

        <GuideSection
          description="Interactive controls use native semantics wherever possible and remain keyboard reachable."
          title="Controls and feedback"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <DnaSlider
                description="A generic system control shown only as a component sample."
                label="Quality emphasis"
                onValueChange={setDnaValue}
                value={dnaValue}
              />
            </Card>
            <div className="space-y-4">
              <LoadingIndicator label="Preparing workspace" />
              <div className="flex gap-3">
                <Skeleton className="h-16 w-16" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <NotificationToast
                message="Reference component rendered successfully."
                tone="success"
              />
            </div>
          </div>
        </GuideSection>

        <GuideSection
          description="State components are intentionally neutral and can be composed into any future surface."
          title="States and dialog"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <EmptyState
              description="When a future surface has no content, make the next step understandable."
              title="Nothing to show yet"
            />
            <ErrorState
              description="Errors should explain what happened and provide a clear recovery action when available."
              title="Unable to load this view"
            />
          </div>
          <Button className="mt-5" onClick={() => setDialogOpen(true)} variant="secondary">
            Open dialog primitive
          </Button>
          <Dialog
            description="A native dialog with focus containment, escape handling, and an accessible label."
            onOpenChange={setDialogOpen}
            open={dialogOpen}
            title="A calm interruption"
          >
            <p className="text-body text-secondary">
              Dialogs should be reserved for decisions that need focused attention.
            </p>
            <DialogFooter>
              <Button onClick={() => setDialogOpen(false)} variant="ghost">
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            </DialogFooter>
          </Dialog>
        </GuideSection>

        <GuideSection
          description="Layout primitives provide consistent framing while leaving future product composition unconstrained."
          title="Layout and icon conventions"
        >
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="flex h-40">
              <SidebarContainer className="w-48 shrink-0 p-4">
                <p className="text-label text-muted">Sidebar container</p>
              </SidebarContainer>
              <div className="bg-panel flex min-w-0 flex-1 items-center justify-center p-4">
                <p className="text-body text-secondary">Responsive workspace area</p>
              </div>
            </div>
          </div>
          <div className="text-secondary mt-5 flex flex-wrap gap-4">
            {(
              ["organization", "department", "team", "activity", "notification", "search"] as const
            ).map((name) => {
              const Icon = icons[name];
              return (
                <span className="text-caption inline-flex items-center gap-2" key={name}>
                  <Icon aria-hidden="true" size={16} />
                  {name}
                </span>
              );
            })}
          </div>
        </GuideSection>
      </PageContainer>
    </div>
  );
}

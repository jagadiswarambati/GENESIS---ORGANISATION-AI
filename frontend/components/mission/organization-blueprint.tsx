"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { motion as motionElement, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

import { Button } from "@/components/design-system/button";
import { icons } from "@/lib/icons";
import { organizationGeneration, slideUp } from "@/lib/motion";

type BlueprintKind = "organization" | "department" | "role" | "worker";
type BlueprintData = { kind: BlueprintKind; label: string };
type BlueprintNode = Node<BlueprintData, "blueprint">;

function BlueprintNodeComponent({ data }: NodeProps<BlueprintNode>): React.JSX.Element {
  return (
    <div className="blueprint-node" data-kind={data.kind}>
      <Handle className="!opacity-0" position={Position.Top} type="target" />
      <p className="text-label capitalize opacity-70">{data.kind}</p>
      <p className="text-caption mt-1 font-medium">{data.label}</p>
      <Handle className="!opacity-0" position={Position.Bottom} type="source" />
    </div>
  );
}

const nodeTypes = { blueprint: BlueprintNodeComponent };

const blueprintEdges: Edge[] = [
  ["organization", "research"],
  ["organization", "strategy"],
  ["organization", "creative"],
  ["research", "research-role"],
  ["strategy", "strategy-role"],
  ["creative", "creative-role"],
  ["research-role", "research-worker"],
  ["strategy-role", "strategy-worker"],
  ["creative-role", "creative-worker"],
].map(([source, target]) => ({ id: `${source}-${target}`, source, target, type: "smoothstep" }));

export function OrganizationBlueprint({
  onBack,
  onContinue,
}: Readonly<{ onBack: () => void; onContinue: () => void }>): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const nodes = useMemo<BlueprintNode[]>(
    () => [
      {
        id: "organization",
        type: "blueprint",
        position: { x: 310, y: 0 },
        data: { kind: "organization", label: "Genesis Organization" },
      },
      {
        id: "research",
        type: "blueprint",
        position: { x: 40, y: 110 },
        data: { kind: "department", label: "Research" },
      },
      {
        id: "strategy",
        type: "blueprint",
        position: { x: 310, y: 110 },
        data: { kind: "department", label: "Strategy" },
      },
      {
        id: "creative",
        type: "blueprint",
        position: { x: 580, y: 110 },
        data: { kind: "department", label: "Creative" },
      },
      {
        id: "research-role",
        type: "blueprint",
        position: { x: 40, y: 220 },
        data: { kind: "role", label: "Research Lead" },
      },
      {
        id: "strategy-role",
        type: "blueprint",
        position: { x: 310, y: 220 },
        data: { kind: "role", label: "Mission Strategist" },
      },
      {
        id: "creative-role",
        type: "blueprint",
        position: { x: 580, y: 220 },
        data: { kind: "role", label: "Creative Lead" },
      },
      {
        id: "research-worker",
        type: "blueprint",
        position: { x: 40, y: 330 },
        data: { kind: "worker", label: "Research Worker" },
      },
      {
        id: "strategy-worker",
        type: "blueprint",
        position: { x: 310, y: 330 },
        data: { kind: "worker", label: "Strategy Worker" },
      },
      {
        id: "creative-worker",
        type: "blueprint",
        position: { x: 580, y: 330 },
        data: { kind: "worker", label: "Creative Worker" },
      },
    ],
    [],
  );

  const NetworkIcon = icons.network;
  return (
    <section aria-labelledby="blueprint-title" className="max-w-workspace mx-auto">
      <div className="max-w-reading mx-auto text-center">
        <motionElement.span
          animate="thinking"
          className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl"
          initial="idle"
          variants={reduceMotion ? undefined : organizationGeneration}
        >
          <NetworkIcon aria-hidden="true" size={21} />
        </motionElement.span>
        <p className="text-label text-muted mt-5">Organization Blueprint</p>
        <h1 className="text-heading mt-2" id="blueprint-title">
          A structure designed around the mission.
        </h1>
        <p className="text-body text-secondary mt-3">
          A visual starting point for departments, roles, and worker capacity.
        </p>
      </div>
      <motionElement.div
        animate="visible"
        className="border-border bg-panel shadow-soft mt-8 h-[30rem] overflow-hidden rounded-xl border"
        initial="hidden"
        variants={reduceMotion ? undefined : slideUp}
      >
        <ReactFlow
          edges={blueprintEdges}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          maxZoom={1.25}
          minZoom={0.5}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          panOnDrag
        >
          <Background className="opacity-30" gap={20} size={1} />
        </ReactFlow>
      </motionElement.div>
      <div className="mt-7 flex items-center justify-between">
        <Button onClick={onBack} variant="ghost">
          <icons.back aria-hidden="true" size={16} />
          Back
        </Button>
        <Button onClick={onContinue}>
          Review Organization DNA
          <icons.continue aria-hidden="true" size={16} />
        </Button>
      </div>
    </section>
  );
}

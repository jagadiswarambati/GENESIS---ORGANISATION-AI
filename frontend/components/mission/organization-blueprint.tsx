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
import type { OrganizationBlueprint as OrganizationBlueprintResponse } from "@/lib/api/architect";
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

export function OrganizationBlueprint({
  blueprint,
  onBack,
  onContinue,
}: Readonly<{
  blueprint: OrganizationBlueprintResponse;
  onBack: () => void;
  onContinue: () => void;
}>): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const { edges, nodes } = useMemo(() => {
    const visibleDepartments = blueprint.departments.slice(0, 4);
    const columnWidth = 230;
    const organizationPosition = ((visibleDepartments.length - 1) * columnWidth) / 2;
    const organizationNode: BlueprintNode = {
      id: "organization",
      type: "blueprint",
      position: { x: organizationPosition, y: 0 },
      data: { kind: "organization", label: blueprint.organization_name },
    };
    const departmentNodes: BlueprintNode[] = [];
    const roleNodes: BlueprintNode[] = [];
    const workerNodes: BlueprintNode[] = [];
    const flowEdges: Edge[] = [];

    visibleDepartments.forEach((department, index) => {
      const departmentId = `department-${index}`;
      const roleId = `role-${index}`;
      const workerId = `worker-${index}`;
      const position = { x: index * columnWidth, y: 110 };
      const primaryRole = department.roles[0];
      const workerCount = department.roles.reduce((count, role) => count + role.worker_count, 0);

      departmentNodes.push({
        id: departmentId,
        type: "blueprint",
        position,
        data: { kind: "department", label: department.name },
      });
      roleNodes.push({
        id: roleId,
        type: "blueprint",
        position: { x: position.x, y: 220 },
        data: { kind: "role", label: primaryRole?.name ?? "Specialist role" },
      });
      workerNodes.push({
        id: workerId,
        type: "blueprint",
        position: { x: position.x, y: 330 },
        data: {
          kind: "worker",
          label: `${workerCount || 1} ${workerCount === 1 ? "worker" : "workers"}`,
        },
      });
      flowEdges.push(
        {
          id: `organization-${departmentId}`,
          source: "organization",
          target: departmentId,
          type: "smoothstep",
        },
        {
          id: `${departmentId}-${roleId}`,
          source: departmentId,
          target: roleId,
          type: "smoothstep",
        },
        { id: `${roleId}-${workerId}`, source: roleId, target: workerId, type: "smoothstep" },
      );
    });

    return {
      edges: flowEdges,
      nodes: [organizationNode, ...departmentNodes, ...roleNodes, ...workerNodes],
    };
  }, [blueprint.departments, blueprint.organization_name]);

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
          edges={edges}
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

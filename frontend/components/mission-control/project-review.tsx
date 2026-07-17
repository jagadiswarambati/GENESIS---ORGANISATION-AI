"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card } from "@/components/design-system/card";
import { LoadingIndicator, NotificationToast } from "@/components/design-system/feedback";
import type {
  ProjectRefinementResult,
  ProjectReview,
  RefinementRequest,
  ReviewSuggestion,
} from "@/lib/api/project-review";
import { formatMissionControlTime } from "@/lib/mission-control-session";

const severityTone = {
  critical: "danger",
  error: "danger",
  warning: "warning",
} as const;

function scoreTone(score: number): "success" | "info" | "warning" {
  if (score >= 90) return "success";
  if (score >= 70) return "info";
  return "warning";
}

function SuggestionRow({
  isSelected,
  onToggle,
  suggestion,
}: Readonly<{
  isSelected: boolean;
  onToggle: (suggestionId: string) => void;
  suggestion: ReviewSuggestion;
}>): React.JSX.Element {
  const isResolved = suggestion.status === "resolved";
  const isRefinable = Boolean(suggestion.related_file);

  return (
    <li className="border-border bg-surface rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <input
          aria-label={`Select ${suggestion.description}`}
          checked={isSelected}
          className="accent-primary mt-1 size-4"
          disabled={isResolved || !isRefinable}
          onChange={() => onToggle(suggestion.suggestion_id)}
          type="checkbox"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize" tone={severityTone[suggestion.severity]}>
              {suggestion.severity}
            </Badge>
            <span className="text-label text-muted">
              {suggestion.category.replaceAll("_", " ")}
            </span>
            <Badge tone={isResolved ? "success" : "info"}>{suggestion.status}</Badge>
          </div>
          <p className="text-body mt-3 font-medium">{suggestion.description}</p>
          <p className="text-caption text-secondary mt-2">{suggestion.suggested_improvement}</p>
          {suggestion.related_file ? (
            <p className="text-caption text-muted mt-3">Related file: {suggestion.related_file}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ReviewList({
  items,
  title,
}: Readonly<{ items: string[]; title: string }>): React.JSX.Element | null {
  if (!items.length) return null;

  return (
    <Card className="p-5">
      <p className="text-title">{title}</p>
      <ul className="text-body text-secondary mt-4 space-y-2">
        {items.map((item) => (
          <li className="border-border border-t pt-2 first:border-t-0 first:pt-0" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ProjectReviewPanel({
  canRefine,
  canReview,
  error,
  isRefining,
  isReviewing,
  onRefine,
  onReview,
  refinementRequests,
  review,
}: Readonly<{
  canRefine: boolean;
  canReview: boolean;
  error?: string | null;
  isRefining: boolean;
  isReviewing: boolean;
  onRefine: (suggestionIds: string[]) => Promise<ProjectRefinementResult | null>;
  onReview: () => Promise<ProjectReview | null>;
  refinementRequests?: RefinementRequest[];
  review?: ProjectReview;
}>): React.JSX.Element {
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const pendingSuggestionCount = useMemo(
    () => review?.suggestions.filter((suggestion) => suggestion.status === "pending").length ?? 0,
    [review],
  );
  const resolvedSuggestionCount = useMemo(
    () => review?.suggestions.filter((suggestion) => suggestion.status === "resolved").length ?? 0,
    [review],
  );

  useEffect(() => {
    setSelectedSuggestionIds([]);
  }, [review?.review_id]);

  function toggleSuggestion(suggestionId: string): void {
    setSelectedSuggestionIds((current) =>
      current.includes(suggestionId)
        ? current.filter((id) => id !== suggestionId)
        : [...current, suggestionId],
    );
  }

  async function refineSelectedArtifacts(): Promise<void> {
    const result = await onRefine(selectedSuggestionIds);
    if (result) setSelectedSuggestionIds([]);
  }

  if (!review) {
    return (
      <div className="border-border bg-surface flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <div>
          {isReviewing ? (
            <LoadingIndicator label="Reviewing generated project" />
          ) : (
            <>
              <p className="text-body text-secondary">
                Project Review is ready to assess the current workspace and quality signals.
              </p>
              {canReview ? (
                <Button
                  className="mt-4"
                  onClick={() => void onReview()}
                  size="sm"
                  variant="secondary"
                >
                  Review Project
                </Button>
              ) : null}
            </>
          )}
          {error ? <NotificationToast message={error} tone="danger" /> : null}
        </div>
      </div>
    );
  }

  const latestRequest = refinementRequests?.at(-1);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-label text-muted">Overall review score</p>
          <Badge className="mt-2" tone={scoreTone(review.overall_score)}>
            {review.overall_score}%
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Suggestions</p>
          <p className="text-title mt-2">{review.suggestions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Pending</p>
          <p className="text-title mt-2">{pendingSuggestionCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-muted">Resolved</p>
          <p className="text-title mt-2">{resolvedSuggestionCount}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-title">Project Review</p>
            <p className="text-caption text-secondary mt-1">
              {review.reviewer_name} reviewed this workspace on{" "}
              {formatMissionControlTime(review.created_at)}.
            </p>
          </div>
          <Button
            disabled={isReviewing}
            onClick={() => void onReview()}
            size="sm"
            variant="secondary"
          >
            {isReviewing ? "Reviewing" : "Run Review Again"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <ReviewList items={review.strengths} title="Strengths" />
        <ReviewList items={review.weaknesses} title="Weaknesses" />
        <ReviewList items={review.improvement_opportunities} title="Improvement Opportunities" />
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-title">Suggestions</p>
            <p className="text-caption text-secondary mt-1">
              Select suggestions to regenerate only their linked artifacts.
            </p>
          </div>
          <Button
            disabled={!canRefine || isRefining || selectedSuggestionIds.length === 0 || isReviewing}
            onClick={() => void refineSelectedArtifacts()}
            size="sm"
          >
            {isRefining ? "Refining Artifacts" : "Generate Refinement Request"}
          </Button>
        </div>
        {!canRefine ? (
          <p className="text-caption text-warning mt-4">
            This review belongs to an earlier workspace revision. Run a new review before refining.
          </p>
        ) : null}
        {review.suggestions.length ? (
          <ol className="mt-5 space-y-3">
            {review.suggestions.map((suggestion) => (
              <SuggestionRow
                isSelected={selectedSuggestionIds.includes(suggestion.suggestion_id)}
                key={suggestion.suggestion_id}
                onToggle={toggleSuggestion}
                suggestion={suggestion}
              />
            ))}
          </ol>
        ) : (
          <p className="text-body text-secondary mt-5">
            No targeted artifact improvements are required by this review.
          </p>
        )}
      </Card>

      {latestRequest ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-title">Latest Refinement Request</p>
              <p className="text-caption text-secondary mt-1">{latestRequest.summary}</p>
              <p className="text-caption text-muted mt-2">
                {latestRequest.affected_artifact_ids.length} artifact(s) affected on{" "}
                {formatMissionControlTime(latestRequest.created_at)}
              </p>
            </div>
            <Badge tone={latestRequest.status === "applied" ? "success" : "info"}>
              {latestRequest.status}
            </Badge>
          </div>
        </Card>
      ) : null}
      {error ? <NotificationToast message={error} tone="danger" /> : null}
    </div>
  );
}

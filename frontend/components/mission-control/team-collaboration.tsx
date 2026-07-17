import { Badge } from "@/components/design-system/badge";
import { Card } from "@/components/design-system/card";
import type { CollaborationSession, ConversationMessageType } from "@/lib/api/collaboration";
import type { WorkerAssignmentResult } from "@/lib/api/worker-assignment";
import { formatMissionControlTime } from "@/lib/mission-control-session";

const messageTone: Record<
  ConversationMessageType,
  "accent" | "danger" | "info" | "success" | "warning"
> = {
  answer: "success",
  decision: "accent",
  information: "info",
  question: "warning",
  review_request: "warning",
  review_response: "success",
  suggestion: "accent",
  warning: "danger",
};

export function TeamCollaboration({
  collaborationSession,
  workerAssignmentResult,
}: Readonly<{
  collaborationSession?: CollaborationSession;
  workerAssignmentResult?: WorkerAssignmentResult;
}>): React.JSX.Element {
  const conversations = collaborationSession?.conversations ?? [];
  const workerName = (workerId: string): string =>
    workerAssignmentResult?.workers.find((worker) => worker.worker_id === workerId)?.worker_name ??
    workerId;

  if (!conversations.length) {
    return (
      <div className="border-border bg-surface mt-6 flex min-h-32 items-center justify-center rounded-lg border border-dashed">
        <span className="text-body text-secondary">No collaboration messages yet.</span>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {[...conversations]
        .sort((left, right) => left.phase_id - right.phase_id)
        .map((conversation) => (
          <section
            aria-labelledby={conversation.conversation_id}
            key={conversation.conversation_id}
          >
            <p className="text-label text-muted" id={conversation.conversation_id}>
              Phase {conversation.phase_id} · {conversation.phase_name}
            </p>
            <ol className="mt-3 space-y-3">
              {[...conversation.messages]
                .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
                .map((message) => (
                  <li key={message.message_id}>
                    <Card className="bg-surface p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-body font-medium">
                            {workerName(message.sender_worker_id)}
                            {message.receiver_worker_id
                              ? ` → ${workerName(message.receiver_worker_id)}`
                              : " → Organization"}
                          </p>
                          <p className="text-caption text-secondary mt-1">
                            {message.sender_department} ·{" "}
                            {formatMissionControlTime(message.timestamp)}
                          </p>
                        </div>
                        <Badge className="capitalize" tone={messageTone[message.message_type]}>
                          {message.message_type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-body text-secondary mt-3">{message.content}</p>
                    </Card>
                  </li>
                ))}
            </ol>
          </section>
        ))}
    </div>
  );
}

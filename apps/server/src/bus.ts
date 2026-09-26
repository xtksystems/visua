import { EventEmitter } from "node:events";

export type VisuaEventType =
  | "workspace.updated"
  | "state.updated"
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "evidence.created"
  | "evidence.updated"
  | "policy.created"
  | "policy.updated"
  | "risk.updated"
  | "check.completed"
  | "agent.run.created"
  | "agent.run.updated"
  | "agent.step"
  | "proposal.created"
  | "proposal.updated"
  | "activity";

export interface VisuaEvent {
  type: VisuaEventType;
  workspaceId: string;
  at: string;
  data: unknown;
}

/** In-process pub/sub, one channel per workspace, consumed by the SSE endpoint. */
export class EventBus {
  private readonly emitter = new EventEmitter();
  private seq = 0;

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  publish(workspaceId: string, type: VisuaEventType, data: unknown): VisuaEvent & { id: number } {
    const event = { id: ++this.seq, type, workspaceId, at: new Date().toISOString(), data };
    this.emitter.emit(workspaceId, event);
    return event;
  }

  subscribe(workspaceId: string, listener: (event: VisuaEvent & { id: number }) => void): () => void {
    this.emitter.on(workspaceId, listener);
    return () => this.emitter.off(workspaceId, listener);
  }
}

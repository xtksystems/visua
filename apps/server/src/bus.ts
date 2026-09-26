import { randomUUID } from "node:crypto";
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
  /** Set when a large event crossed instances with only its identifying fields. */
  partial?: boolean;
}

/** Forwards events to other server instances (see storage/events.ts). */
export interface BusRelay {
  send(event: VisuaEvent): void;
}

/** In-process pub/sub, one channel per workspace, consumed by the SSE endpoint. */
export class EventBus {
  readonly instanceId = randomUUID();
  private readonly emitter = new EventEmitter();
  private relay?: BusRelay;
  private seq = 0;

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  attachRelay(relay: BusRelay): void {
    this.relay = relay;
  }

  publish(workspaceId: string, type: VisuaEventType, data: unknown): VisuaEvent & { id: number } {
    const event = { id: ++this.seq, type, workspaceId, at: new Date().toISOString(), data };
    this.emitter.emit(workspaceId, event);
    this.relay?.send(event);
    return event;
  }

  /** Deliver an event published by another instance to this instance's subscribers. */
  deliver(event: VisuaEvent): void {
    this.emitter.emit(event.workspaceId, { ...event, id: ++this.seq });
  }

  subscribe(workspaceId: string, listener: (event: VisuaEvent & { id: number }) => void): () => void {
    this.emitter.on(workspaceId, listener);
    return () => this.emitter.off(workspaceId, listener);
  }
}

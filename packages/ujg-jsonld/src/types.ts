export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | JsonObject;

export interface JsonObject {
  readonly [property: string]: JsonValue;
}

export interface UjgNode {
  readonly "@id": string;
  readonly "@type"?: string | readonly string[];
  readonly extensions?: Readonly<Record<string, JsonObject>>;
  readonly [property: string]: JsonValue | undefined;
}

export interface UjgDocument {
  readonly "@context": string | readonly string[];
  readonly "@id": string;
  readonly "@type": "UJGDocument" | readonly string[];
  readonly nodes?: readonly UjgNode[];
  readonly imports?: readonly string[];
  readonly extensions?: Readonly<Record<string, JsonObject>>;
  readonly [property: string]: JsonValue | readonly UjgNode[] | undefined;
}

export interface UjgJourney extends UjgNode {
  readonly "@type": "Journey" | readonly string[];
  readonly label?: string;
  readonly tags?: readonly string[];
  readonly entryRefs: readonly string[];
  readonly stateRefs: readonly string[];
  readonly defaultEntryRef?: string;
  readonly transitionRefs?: readonly string[];
  readonly exitRefs?: readonly string[];
  readonly outgoingTransitionGroupRefs?: readonly string[];
}

export interface UjgJourneyEntryIndex extends UjgNode {
  readonly "@type": "JourneyEntryIndex" | readonly string[];
  readonly label?: string;
  readonly entryRefs: readonly string[];
}

export interface UjgJourneyEntry extends UjgNode {
  readonly "@type": "JourneyEntry" | readonly string[];
  readonly label?: string;
  readonly tags?: readonly string[];
  readonly stateRef: string;
}

export interface UjgState extends UjgNode {
  readonly "@type": "State" | readonly string[];
  readonly label: string;
  readonly tags?: readonly string[];
  readonly multiInstance?: boolean;
  readonly outgoingTransitionRefs?: readonly string[];
}

export interface UjgCompositeState extends UjgNode {
  readonly "@type": "CompositeState" | readonly string[];
  readonly label: string;
  readonly tags?: readonly string[];
  readonly multiInstance?: boolean;
  readonly subjourneyRefs: readonly string[];
}

export interface UjgJourneyExit extends UjgNode {
  readonly "@type": "JourneyExit" | readonly string[];
  readonly label?: string;
  readonly tags?: readonly string[];
}

export interface UjgTransition extends UjgNode {
  readonly "@type": "Transition" | readonly string[];
  readonly label?: string;
  readonly tags?: readonly string[];
  readonly from: string;
  readonly to: string;
  readonly toEntryRef?: string;
  readonly fromExitRef?: string;
  readonly commandRef?: string;
}

export interface UjgCommand extends UjgNode {
  readonly "@type": "Command" | readonly string[];
  readonly label?: string;
  readonly tags?: readonly string[];
}

export interface UjgOutgoingTransition extends UjgNode {
  readonly "@type": "OutgoingTransition" | readonly string[];
  readonly label?: string;
  readonly tags?: readonly string[];
  readonly to?: string;
  readonly toCurrentState?: boolean;
  readonly commandRef?: string;
}

export interface UjgOutgoingTransitionGroup extends UjgNode {
  readonly "@type": "OutgoingTransitionGroup" | readonly string[];
  readonly label?: string;
  readonly outgoingTransitionRefs: readonly string[];
}

export interface UjgSurface extends UjgNode {
  readonly "@type": "Surface" | readonly string[];
  readonly graphNodeRef: string;
}

export interface UjgSurfaceInstance extends UjgNode {
  readonly "@type": "SurfaceInstance" | readonly string[];
  readonly surfaceRef: string;
}

export interface UjgTouchpoint extends UjgNode {
  readonly "@type": "Touchpoint" | readonly string[];
  readonly label: string;
  readonly channel?: string;
  readonly journeyRefs?: readonly string[];
}

export interface UjgPersona extends UjgNode {
  readonly "@type": "Persona" | readonly string[];
  readonly label?: string;
  readonly tags?: readonly string[];
  readonly touchpointRefs?: readonly string[];
}

export interface UjgNodeTypes {
  readonly Journey: UjgJourney;
  readonly JourneyEntryIndex: UjgJourneyEntryIndex;
  readonly JourneyEntry: UjgJourneyEntry;
  readonly State: UjgState;
  readonly CompositeState: UjgCompositeState;
  readonly JourneyExit: UjgJourneyExit;
  readonly Transition: UjgTransition;
  readonly Command: UjgCommand;
  readonly OutgoingTransition: UjgOutgoingTransition;
  readonly OutgoingTransitionGroup: UjgOutgoingTransitionGroup;
  readonly Surface: UjgSurface;
  readonly SurfaceInstance: UjgSurfaceInstance;
  readonly Touchpoint: UjgTouchpoint;
  readonly Persona: UjgPersona;
}

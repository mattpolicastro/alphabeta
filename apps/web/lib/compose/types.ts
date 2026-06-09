export type Altitude = "vague" | "goal" | "bet" | "ready";

export type FieldStatus = "found" | "present" | "missing";

export type ExtractionField = {
  value: string;
  status: FieldStatus;
};

export type Extraction = {
  change?: ExtractionField;
  direction?: ExtractionField;
  metric?: ExtractionField;
  magnitude?: ExtractionField;
  mechanism?: ExtractionField;
  confidence?: ExtractionField;
  foldIf?: ExtractionField;
  instrument?: ExtractionField;
  winAction?: ExtractionField;
  lossAction?: ExtractionField;
  inconAction?: ExtractionField;
};

export type ReplyChip = {
  id: string;
  label: string;
};

export type RouteAction =
  | { kind: "bet"; label: string; extractions?: Extraction }
  | { kind: "sequence"; label: string; depType: "chain" | "fanin" | "parallel"; subBets: { question: string; instrument: string }[] }
  | { kind: "navigate"; label: string; href: string };

export type ChatMessage = {
  id: string;
  role: "user" | "system";
  text: string;
  extractions?: Extraction;
  altitude?: Altitude;
  classify?: { icon: string; label: string; colorClass: string };
  chips?: ReplyChip[];
  routeTo?: RouteAction;
};

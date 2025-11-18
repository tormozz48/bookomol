export enum CondensingLevel {
  light = "light",
  medium = "medium",
  heavy = "heavy",
}

export interface CondensingOptions {
  level: CondensingLevel;
  preserveCodeExamples?: boolean;
}

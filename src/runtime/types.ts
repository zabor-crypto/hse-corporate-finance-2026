import type {TeachingPath} from "../pedagogy/types";
import type { ReactNode } from "react";
import type { RegistryContent, CurriculumRegistry } from "../curriculum/types";
import type { SeminarCompetency } from "../content/types";
export interface ModuleConfig {
  id: string;
  title: string;
  primaryLessonId: string;
  defaultPracticeId: string;
  nextAction: { label: string; route: string };
  blueprintIds: string[];
  currentTopic: { title: string; summary?: string };
  nearestAssessment: {
    title: string;
    date: string | null;
    dateStatus: "UNKNOWN" | "OWNER_CONFIRMED";
    note?: string;
    blueprintId?: string;
  };
  teachingPaths?:Record<string,TeachingPath>;
  lessonEnhancements?: Record<
    string,
    { beforeSections?: ReactNode; afterSections?: ReactNode }
  >;
  learningPaths?: Record<
    string,
    { nextLessonId?: string; practiceIds?: string[] }
  >;
  examPresets?: {
    buttonLabel?:string;
    id: string;
    title: string;
    description: string;
    problemIds: string[];
  }[];
  freshPaper?: { familyIds: string[]; fixedProblemIds: string[] };
}
export interface ModulePack {
  id: string;
  content: RegistryContent & {
    seminarMap?: SeminarCompetency[];
    sampleExamIds?: string[];
  };
  registry: CurriculumRegistry;
  config: ModuleConfig;
}
export interface ModuleManifest {
  id: string;
  title: string;
  primaryLessonId: string;
  problemPrefix: string;
  formulaPrefix: string;
}

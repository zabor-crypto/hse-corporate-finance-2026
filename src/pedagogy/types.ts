/** A versioned reading projection. Canonical lessons and question passports stay unchanged. */
export interface TeachingExampleRef {
  lessonId: string;
  sectionId: string;
  /** Absent selects section.example; a number selects section.examples[index]. */
  index?: number;
}

export interface TeachingUnit {
  id: string;
  title: string;
  question: string;
  mechanism: string[];
  formulaIds: string[];
  exampleRef?: TeachingExampleRef;
  practiceIds: string[];
  recall?: { question: string; answer: string };
}

export interface TeachingPath {
  id: string;
  version: string;
  lessonId: string;
  question: string;
  units: TeachingUnit[];
  nextLessonId?: string;
  /** Every historical section anchor remains addressable in the full reference layer. */
  referenceSectionIds: string[];
}

export type TeachingPaths = Record<string, TeachingPath>;

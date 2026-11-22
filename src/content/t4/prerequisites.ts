import { t4ProblemSkills } from './metadata';

/** First explicit instruction in the sequential reading route, not an assertion of mastery. */
export const t4SkillIntroducedLesson: Record<string, string> = {
  'T4-timeline': 'T4-01',
  'T4-incremental': 'T4-01',
  'T4-provider': 'T4-01',
  'T4-npv': 'T4-02',
  'T4-pi': 'T4-02',
  'T4-payback': 'T4-02',
  'T4-perpetuity': 'T4-02',
  'T4-irr-domain': 'T4-03',
  'T4-irr-investment': 'T4-03',
  'T4-irr-borrowing': 'T4-03',
  'T4-irr-mixed': 'T4-03',
  'T4-mirr': 'T4-03',
  'T4-fisher': 'T4-04',
  'T4-scale': 'T4-04',
  'T4-repeat-eaa': 'T4-04',
  'T4-replacement': 'T4-04',
  'T4-inflation': 'T4-05',
  'T4-inflation-rate': 'T4-05',
  'T4-financing': 'T4-05',
  'T4-tax-da': 'T4-05',
  'T4-nwc-terminal': 'T4-05',
};

/** Required skills for the task's independent outputs. Reading a page does not mark them learned. */
export const t4ProblemRequires: Record<string, string[]> = {
  ...t4ProblemSkills,
  // A12 gives constant real prices and a matching real rate; no inflation conversion is required.
  'T4-A12': ['T4-repeat-eaa', 'T4-replacement'],
};

/** Stage-specific edges prevent a general task tag from misclassifying a particular error. */
export const t4StageSkillIds: Record<string, Record<string, string[]>> = {
  'T4-C01': { selection: ['T4-incremental', 'T4-provider'] },
  'T4-C02': { selection: ['T4-irr-borrowing', 'T4-provider', 'T4-npv'] },
  'T4-A03': {
    'nominal-rate': ['T4-inflation-rate'],
    npv: ['T4-npv', 'T4-inflation'],
    'loan-payment': ['T4-financing'],
    'initial-equity': ['T4-financing', 'T4-provider'],
    'min-after-debt': ['T4-financing', 'T4-provider'],
  },
  'T4-A12': {
    'eac-efficient': ['T4-repeat-eaa', 'T4-replacement'],
    'eac-basic': ['T4-repeat-eaa', 'T4-replacement'],
    saving: ['T4-repeat-eaa', 'T4-replacement'],
  },
  'T4-A04': {
    'incremental-cash': ['T4-incremental'],
    npv: ['T4-incremental', 'T4-perpetuity', 'T4-npv'],
    // This historical Study-only stage follows IRR instruction in T4-03.
    // The independent task after T4-02 asks for NPV only.
    irr: ['T4-irr-investment'],
  },
  'T4-L2-01': {
    cf0: ['T4-incremental', 'T4-timeline', 'T4-provider'],
    cf1: ['T4-incremental'],
    cf2: ['T4-timeline', 'T4-incremental'],
  },
  'T4-L2-02': {
    'pv-investments': ['T4-timeline', 'T4-npv'],
    'pv-inflows': ['T4-timeline', 'T4-npv'],
    npv: ['T4-npv'],
    pi: ['T4-pi'],
  },
};

export const t4LearningPaths: Record<string, { nextLessonId?: string; practiceIds: string[] }> = {
  'T4-01': { nextLessonId: 'T4-02', practiceIds: ['T4-L2-01', 'T4-C01'] },
  'T4-02': { nextLessonId: 'T4-03', practiceIds: ['T4-L2-02', 'T4-A04', 'T4-A05'] },
  'T4-03': { nextLessonId: 'T4-04', practiceIds: ['T4-C02', 'T4-C03', 'T4-A01', 'T4-A02'] },
  'T4-04': { nextLessonId: 'T4-05', practiceIds: ['T4-C04', 'T4-A09', 'T4-A10', 'T4-A12'] },
  'T4-05': { practiceIds: ['T4-A06', 'T4-A03', 'T4-A07', 'T4-A08', 'T4-A11'] },
};

/** Existing section/formula identifiers for a concrete next reading step after an error. */
export const t4StageTheoryIds: Record<string, Record<string, string[]>> = {
  'T4-C01': { selection: ['T4-01/incremental-flow'] },
  'T4-A03': {
    'nominal-rate': ['T4-F-INFLATION'],
    npv: ['T4-F-NPV'],
    'loan-payment': ['T4-F-LOAN'],
    'initial-equity': ['T4-F-LOAN'],
    'min-after-debt': ['T4-F-LOAN'],
  },
};

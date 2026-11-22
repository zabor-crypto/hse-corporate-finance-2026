import type { ExamBlueprint } from '../../curriculum/types';

// Original author draft: independent acceptance pending.
export const t4DecisionsBlueprint: ExamBlueprint = {
  "id": "T4-MOCK-DECISIONS",
  "version": "1.0.0",
  "title": "Пробная работа · сравнение и целостная модель",
  "moduleIds": [
    "T4"
  ],
  "minutes": 45,
  "unseenPolicy": "prefer",
  "reviewStatus": "DRAFT",
  "competencyWeights": {
    "T4-irr-mixed": 1,
    "T4-fisher": 1,
    "T4-financing": 1,
    "T4-nwc-terminal": 1,
    "T4-repeat-eaa": 1,
    "T4-inflation": 1
  },
  "difficultyWeights": {
    "L3": 1
  },
  "sourceWeights": {
    "LECTURE_T4_2026_11_16": 1,
    "SEMINAR4_2026_11_09": 1,
    "ORIGINAL_T4_V1": 1
  },
  "slots": [
    {
      "id": "t4-c03",
      "competencyIds": [
        "T4-irr-mixed"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-C03"
      ]
    },
    {
      "id": "t4-c04",
      "competencyIds": [
        "T4-fisher"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-C04"
      ]
    },
    {
      "id": "t4-a03",
      "competencyIds": [
        "T4-financing"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A03"
      ]
    },
    {
      "id": "t4-a08",
      "competencyIds": [
        "T4-nwc-terminal"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A08"
      ]
    },
    {
      "id": "t4-a09",
      "competencyIds": [
        "T4-repeat-eaa"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A09"
      ]
    },
    {
      "id": "t4-a11",
      "competencyIds": [
        "T4-inflation"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A11"
      ]
    }
  ],
  "eligiblePool": [
    {
      "problemId": "T4-C03",
      "version": "1.0.0"
    },
    {
      "problemId": "T4-C04",
      "version": "1.0.0"
    },
    {
      "problemId": "T4-A03",
      "version": "1.0.0"
    },
    {
      "problemId": "T4-A08",
      "version": "1.0.0"
    },
    {
      "problemId": "T4-A09",
      "version": "1.0.0"
    },
    {
      "problemId": "T4-A11",
      "version": "1.0.0"
    }
  ]
};

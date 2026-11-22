import type { ExamBlueprint } from '../../curriculum/types';

// Original author draft. Independent acceptance is pending.
export const t4CoreBlueprint: ExamBlueprint = {
  "id": "T4-MOCK-CORE",
  "version": "1.0.1",
  "title": "Пробная работа · инвестиционные решения",
  "moduleIds": [
    "T4"
  ],
  "minutes": 25,
  "unseenPolicy": "prefer",
  "reviewStatus": "DRAFT",
  "competencyWeights": {
    "T4-incremental": 1,
    "T4-npv": 1,
    "T4-pi": 1,
    "T4-perpetuity": 1,
    "T4-tax-da": 1,
    "T4-irr-borrowing": 1
  },
  "difficultyWeights": {
    "L2": 1,
    "L3": 1
  },
  "sourceWeights": {
    "LECTURE_T4_2026_11_16": 1,
    "SEMINAR4_2026_11_09": 1,
    "ORIGINAL_T4_V1": 1
  },
  "slots": [
    {
      "id": "t4-c01",
      "competencyIds": [
        "T4-incremental"
      ],
      "difficulties": [
        "L2"
      ],
      "problemIds": [
        "T4-C01"
      ]
    },
    {
      "id": "t4-a01",
      "competencyIds": [
        "T4-pi"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A01"
      ]
    },
    {
      "id": "t4-a02",
      "competencyIds": [
        "T4-perpetuity"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A02"
      ]
    },
    {
      "id": "t4-a04",
      "competencyIds": [
        "T4-incremental"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A04"
      ]
    },
    {
      "id": "t4-a06",
      "competencyIds": [
        "T4-tax-da"
      ],
      "difficulties": [
        "L3"
      ],
      "problemIds": [
        "T4-A06"
      ]
    },
    {
      "id": "t4-c02",
      "competencyIds": [
        "T4-irr-borrowing"
      ],
      "difficulties": [
        "L2"
      ],
      "problemIds": [
        "T4-C02"
      ]
    }
  ],
  "eligiblePool": [
    {
      "problemId": "T4-A01",
      "version": "1.0.1"
    },
    {
      "problemId": "T4-A02",
      "version": "1.0.1"
    },
    {
      "problemId": "T4-A04",
      "version": "1.0.1"
    },
    {
      "problemId": "T4-A06",
      "version": "1.0.1"
    },
    {
      "problemId": "T4-C01",
      "version": "1.0.0"
    },
    {
      "problemId": "T4-C02",
      "version": "1.0.0"
    }
  ]
};

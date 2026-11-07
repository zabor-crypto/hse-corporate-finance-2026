import type { ExamBlueprint } from "./types";

/** Six fixed original-data tasks. The time is an application setting, not a calibrated control-paper tempo. */
export const c3RatiosFocusBlueprint: ExamBlueprint = {
  id: "C3-SHORT-RATIOS",
  version: "1.0.0",
  title: "Короткая практика · коэффициенты и взаимосвязи",
  moduleIds: ["T3"],
  minutes: 30,
  unseenPolicy: "prefer",
  // Internal content acceptance only; this is not public deployment authorization.
  reviewStatus: "PUBLISHED",
  competencyWeights: {
    "T3-05:core": 2,
    "T3-06:core": 2,
    "T3-07:core": 2,
    "T3-08:core": 2,
    "T3-09:core": 1,
  },
  difficultyWeights: { L2: 1, L3: 2 },
  sourceWeights: { "original-cflos-v1": 2 },
  slots: [
    {
      id: "returns",
      competencyIds: ["T3-08:core"],
      difficulties: ["L3"],
      kinds: ["steps"],
      problemIds: ["C3-RF01"],
    },
    {
      id: "capital",
      competencyIds: ["T3-06:core"],
      difficulties: ["L3"],
      kinds: ["steps"],
      problemIds: ["C3-RF02"],
    },
    {
      id: "liquidity",
      competencyIds: ["T3-07:core"],
      difficulties: ["L3"],
      kinds: ["steps"],
      problemIds: ["C3-RF03"],
    },
    {
      id: "valuation",
      competencyIds: ["T3-09:core"],
      difficulties: ["L3"],
      kinds: ["steps"],
      problemIds: ["C3-RF04"],
    },
    {
      id: "comparability",
      competencyIds: ["T3-05:core"],
      difficulties: ["L2"],
      kinds: ["single"],
      problemIds: ["C3-RF05"],
    },
    {
      id: "shareholder",
      competencyIds: ["T3-09:core"],
      difficulties: ["L2"],
      kinds: ["multi"],
      problemIds: ["C3-RF06"],
    },
  ],
  eligiblePool: [
    "C3-RF01",
    "C3-RF02",
    "C3-RF03",
    "C3-RF04",
    "C3-RF05",
    "C3-RF06",
  ].map((problemId) => ({ problemId, version: "1.0.0" })),
};

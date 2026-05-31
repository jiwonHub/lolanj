import { HIGH_TIERS, TIER_SCORES } from "./constants";

export const hasTierDivision = (tier: string) => {
  return tier !== "언랭" && !HIGH_TIERS.includes(tier);
};

export const hasTierPoint = (tier: string) => {
  return HIGH_TIERS.includes(tier);
};

export const getTierText = (tier: string, value: string) => {
  if (tier === "언랭") {
    return "언랭";
  }

  if (hasTierPoint(tier)) {
    return `${tier} ${value || "0"}점`;
  }

  return `${tier} ${value}`;
};

export const getTierBaseName = (tierText: string) => {
  return tierText.split(" ")[0];
};

export const getTierExtraNumber = (tierText: string) => {
  const value = tierText.split(" ")[1];

  if (!value) {
    return 0;
  }

  const numberValue = Number(value.replace("점", ""));

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
};

export const getTierDivisionScore = (tierText: string) => {
  const baseTier = getTierBaseName(tierText);
  const extraNumber = getTierExtraNumber(tierText);

  if (baseTier === "언랭") {
    return 0;
  }

  if (hasTierPoint(baseTier)) {
    return Math.round(extraNumber * 0.3);
  }

  if (!extraNumber) {
    return 0;
  }

  return (4 - extraNumber) * 50;
};

export const getTierScore = (tierText: string) => {
  const baseTier = getTierBaseName(tierText);
  const baseScore = TIER_SCORES[baseTier] ?? 0;

  return baseScore + getTierDivisionScore(tierText);
};

export const parseTierText = (tierText: string) => {
  const [tier, value] = tierText.split(" ");

  return {
    tier: tier || "골드",
    division: value ? value.replace("점", "") : "4",
  };
};

export const getCurrentTierScore = (
  currentTierText: string,
  highestTierText: string
) => {
  if (getTierBaseName(currentTierText) === "언랭") {
    return getTierScore(highestTierText);
  }

  return getTierScore(currentTierText);
};
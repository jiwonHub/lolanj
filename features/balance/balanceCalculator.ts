import { LINES } from "../../shared/constants";
import type { CanyonTeamSlots, LineKey, Member } from "../../shared/types";
import { getCurrentTierScore, getTierScore } from "../../shared/tier";

export const calculateMemberScore = (member: Member | null, line: LineKey) => {
  if (!member) {
    return 0;
  }

  const currentTierScore = getCurrentTierScore(
    member.current_tier,
    member.highest_tier
  );
  const highestTierScore = getTierScore(member.highest_tier);

  let lineBonus = -100;

  if (member.main_line === "상관없음") {
    lineBonus = 0;
  } else if (member.main_line === line) {
    lineBonus = 120;
  } else if (member.sub_line === "상관없음") {
    lineBonus = 0;
  } else if (member.sub_line === line) {
    lineBonus = 60;
  }

  return Math.round(
    currentTierScore * 0.7 + highestTierScore * 0.2 + lineBonus
  );
};

export const calculateAramMemberScore = (member: Member | null) => {
  if (!member) {
    return 0;
  }

  const currentTierScore = getCurrentTierScore(
    member.current_tier,
    member.highest_tier
  );
  const highestTierScore = getTierScore(member.highest_tier);

  return Math.round(currentTierScore * 0.75 + highestTierScore * 0.25);
};

const getCombinations = <T,>(items: T[], count: number) => {
  const result: T[][] = [];

  const pick = (startIndex: number, selected: T[]) => {
    if (selected.length === count) {
      result.push(selected);
      return;
    }

    for (let i = startIndex; i < items.length; i += 1) {
      pick(i + 1, [...selected, items[i]]);
    }
  };

  pick(0, []);

  return result;
};

const getPermutations = <T,>(items: T[]) => {
  const result: T[][] = [];

  const pick = (rest: T[], selected: T[]) => {
    if (rest.length === 0) {
      result.push(selected);
      return;
    }

    rest.forEach((item, index) => {
      pick(
        rest.filter((_, restIndex) => restIndex !== index),
        [...selected, item]
      );
    });
  };

  pick(items, []);

  return result;
};

const buildTeamSlotsFromMembers = (teamMembers: Member[]) => {
  const slots = {} as Record<LineKey, string>;

  LINES.forEach((line, index) => {
    slots[line] = teamMembers[index].name;
  });

  return slots;
};

const getTeamScoreByMembers = (teamMembers: Member[]) => {
  return LINES.reduce((total, line, index) => {
    return total + calculateMemberScore(teamMembers[index], line);
  }, 0);
};

const getLinePreferencePenalty = (member: Member, line: LineKey) => {
  if (member.main_line === "상관없음") {
    return 0;
  }

  if (member.main_line === line) {
    return 0;
  }

  if (member.sub_line === "상관없음") {
    return 30;
  }

  if (member.sub_line === line) {
    return 10;
  }

  return 100;
};

const getTeamLinePreferencePenalty = (teamMembers: Member[]) => {
  return LINES.reduce((total, line, index) => {
    return total + getLinePreferencePenalty(teamMembers[index], line);
  }, 0);
};

const getBestLineupForTeam = (teamMembers: Member[]) => {
  let bestLineup: Member[] | null = null;
  let bestScore = Number.MIN_SAFE_INTEGER;
  let bestPenalty = Number.MAX_SAFE_INTEGER;

  getPermutations(teamMembers).forEach((lineup) => {
    const score = getTeamScoreByMembers(lineup);
    const penalty = getTeamLinePreferencePenalty(lineup);

    if (score > bestScore || (score === bestScore && penalty < bestPenalty)) {
      bestScore = score;
      bestPenalty = penalty;
      bestLineup = lineup;
    }
  });

  return bestLineup ?? teamMembers;
};

const getLineDiffTotalByMembers = (
  team1Members: Member[],
  team2Members: Member[]
) => {
  return LINES.reduce((total, line, index) => {
    const team1Score = calculateMemberScore(team1Members[index], line);
    const team2Score = calculateMemberScore(team2Members[index], line);

    return total + Math.abs(team1Score - team2Score);
  }, 0);
};

const getMaxLineDiffByMembers = (
  team1Members: Member[],
  team2Members: Member[]
) => {
  return Math.max(
    ...LINES.map((line, index) => {
      const team1Score = calculateMemberScore(team1Members[index], line);
      const team2Score = calculateMemberScore(team2Members[index], line);

      return Math.abs(team1Score - team2Score);
    })
  );
};

export const calculateAutoBalancedTeamSlots = (targetMembers: Member[]) => {
  let bestTeam1: Member[] | null = null;
  let bestTeam2: Member[] | null = null;
  let bestBalanceScore = Number.MAX_SAFE_INTEGER;

  const combinations = getCombinations(targetMembers, 5);

  combinations.forEach((team1BaseMembers) => {
    const team2BaseMembers = targetMembers.filter(
      (member) =>
        !team1BaseMembers.some((team1Member) => team1Member.id === member.id)
    );

    const team1Members = getBestLineupForTeam(team1BaseMembers);
    const team2Members = getBestLineupForTeam(team2BaseMembers);

    const team1Score = getTeamScoreByMembers(team1Members);
    const team2Score = getTeamScoreByMembers(team2Members);
    const teamDiff = Math.abs(team1Score - team2Score);
    const totalLineDiff = getLineDiffTotalByMembers(team1Members, team2Members);
    const maxLineDiff = getMaxLineDiffByMembers(team1Members, team2Members);
    const preferencePenalty =
      getTeamLinePreferencePenalty(team1Members) +
      getTeamLinePreferencePenalty(team2Members);

    const balanceScore =
      teamDiff * 10 + totalLineDiff + maxLineDiff * 2 + preferencePenalty;

    if (balanceScore < bestBalanceScore) {
      bestBalanceScore = balanceScore;
      bestTeam1 = team1Members;
      bestTeam2 = team2Members;
    }
  });

  if (!bestTeam1 || !bestTeam2) {
    return null;
  }

  const result: CanyonTeamSlots = {
    team1: buildTeamSlotsFromMembers(bestTeam1),
    team2: buildTeamSlotsFromMembers(bestTeam2),
  };

  return result;
};
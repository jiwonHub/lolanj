import { LINES } from "../../shared/constants";
import type {
  AramMatchRecord,
  AramPlayerStat,
  LineKey,
  MatchRecord,
  PlayerStat,
  StatCount,
  TeamKey,
} from "../../shared/types";

export const createEmptyStatCount = (): StatCount => ({
  games: 0,
  wins: 0,
  losses: 0,
});

export const addStatCount = (
  target: Record<string, StatCount>,
  key: string,
  isWin: boolean
) => {
  if (!key.trim()) {
    return;
  }

  if (!target[key]) {
    target[key] = createEmptyStatCount();
  }

  target[key].games += 1;

  if (isWin) {
    target[key].wins += 1;
  } else {
    target[key].losses += 1;
  }
};

export const getWinRate = (wins: number, games: number) => {
  if (games === 0) {
    return "0.0";
  }

  return ((wins / games) * 100).toFixed(1);
};

export const buildMemberStats = (matchRecords: MatchRecord[]) => {
  const statMap: Record<string, PlayerStat> = {};

  const getOrCreatePlayerStat = (playerName: string) => {
    if (!statMap[playerName]) {
      statMap[playerName] = {
        name: playerName,
        games: 0,
        wins: 0,
        losses: 0,
        championStats: {},
        lineStats: {},
        opponentStats: {},
      };
    }

    return statMap[playerName];
  };

  matchRecords.forEach((record) => {
    const team1Players = LINES.map((line) => ({
      team: "team1" as TeamKey,
      line,
      player: record.team1[line].player,
      champion: record.team1[line].champion,
    })).filter((item) => item.player.trim());

    const team2Players = LINES.map((line) => ({
      team: "team2" as TeamKey,
      line,
      player: record.team2[line].player,
      champion: record.team2[line].champion,
    })).filter((item) => item.player.trim());

    const allPlayers = [...team1Players, ...team2Players];

    allPlayers.forEach((item) => {
      const isWin = record.match_result === item.team;
      const playerStat = getOrCreatePlayerStat(item.player);

      playerStat.games += 1;

      if (isWin) {
        playerStat.wins += 1;
      } else {
        playerStat.losses += 1;
      }

      addStatCount(playerStat.championStats, item.champion, isWin);

      const currentLineStat =
        playerStat.lineStats[item.line] ?? createEmptyStatCount();

      currentLineStat.games += 1;

      if (isWin) {
        currentLineStat.wins += 1;
      } else {
        currentLineStat.losses += 1;
      }

      playerStat.lineStats[item.line] = currentLineStat;

      const opponentPlayers = item.team === "team1" ? team2Players : team1Players;

      opponentPlayers.forEach((opponent) => {
        addStatCount(playerStat.opponentStats, opponent.player, isWin);
      });
    });
  });

  return Object.values(statMap).sort((a, b) => {
    const bRate = b.games === 0 ? 0 : b.wins / b.games;
    const aRate = a.games === 0 ? 0 : a.wins / a.games;

    if (b.games !== a.games) {
      return b.games - a.games;
    }

    if (bRate !== aRate) {
      return bRate - aRate;
    }

    return a.name.localeCompare(b.name, "ko-KR");
  });
};

export const getMostPickedChampionText = (matchRecords: MatchRecord[]) => {
  const championCounts: Record<string, number> = {};

  matchRecords.forEach((record) => {
    LINES.forEach((line) => {
      const team1Champion = record.team1[line].champion;
      const team2Champion = record.team2[line].champion;

      if (team1Champion) {
        championCounts[team1Champion] = (championCounts[team1Champion] ?? 0) + 1;
      }

      if (team2Champion) {
        championCounts[team2Champion] = (championCounts[team2Champion] ?? 0) + 1;
      }
    });
  });

  const mostPickedChampion = Object.entries(championCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (!mostPickedChampion) {
    return "없음";
  }

  return `${mostPickedChampion[0]} (${mostPickedChampion[1]}회)`;
};

export const getBestWinRatePlayerText = (playerStats: PlayerStat[]) => {
  const bestPlayer = [...playerStats]
    .filter((stat) => stat.games > 0)
    .sort((a, b) => {
      const bRate = b.wins / b.games;
      const aRate = a.wins / a.games;

      if (bRate !== aRate) {
        return bRate - aRate;
      }

      return b.games - a.games;
    })[0];

  if (!bestPlayer) {
    return "없음";
  }

  return `${bestPlayer.name} · ${bestPlayer.games}전 ${bestPlayer.wins}승 ${bestPlayer.losses}패 · 승률 ${getWinRate(bestPlayer.wins, bestPlayer.games)}%`;
};

export const getAramMostPickedChampionText = (
  aramMatchRecords: AramMatchRecord[]
) => {
  const championCounts: Record<string, number> = {};

  aramMatchRecords.forEach((record) => {
    record.team1.forEach((slot) => {
      if (slot.champion) {
        championCounts[slot.champion] = (championCounts[slot.champion] ?? 0) + 1;
      }
    });

    record.team2.forEach((slot) => {
      if (slot.champion) {
        championCounts[slot.champion] = (championCounts[slot.champion] ?? 0) + 1;
      }
    });
  });

  const mostPickedChampion = Object.entries(championCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (!mostPickedChampion) {
    return "없음";
  }

  return `${mostPickedChampion[0]} (${mostPickedChampion[1]}회)`;
};

export const getAramBestWinRatePlayerText = (
  aramStats: Record<string, AramPlayerStat>
) => {
  const bestPlayer = Object.entries(aramStats)
    .filter(([, stat]) => stat.games > 0)
    .sort((a, b) => {
      const bRate = b[1].wins / b[1].games;
      const aRate = a[1].wins / a[1].games;

      if (bRate !== aRate) {
        return bRate - aRate;
      }

      return b[1].games - a[1].games;
    })[0];

  if (!bestPlayer) {
    return "없음";
  }

  return `${bestPlayer[0]} · ${bestPlayer[1].games}전 ${bestPlayer[1].wins}승 ${bestPlayer[1].losses}패 · 승률 ${getWinRate(bestPlayer[1].wins, bestPlayer[1].games)}%`;
};

export const buildAramMemberStats = (
  aramMatchRecords: AramMatchRecord[]
) => {
  const statMap: Record<string, AramPlayerStat> = {};

  const getOrCreateAramStat = (playerName: string) => {
    if (!statMap[playerName]) {
      statMap[playerName] = {
        games: 0,
        wins: 0,
        losses: 0,
        championStats: {},
      };
    }

    return statMap[playerName];
  };

  const addAramPlayerResult = (
    playerName: string,
    champion: string,
    isWin: boolean
  ) => {
    if (!playerName.trim()) {
      return;
    }

    const stat = getOrCreateAramStat(playerName);

    stat.games += 1;

    if (isWin) {
      stat.wins += 1;
    } else {
      stat.losses += 1;
    }

    addStatCount(stat.championStats, champion, isWin);
  };

  aramMatchRecords.forEach((record) => {
    record.team1.forEach((slot) => {
      addAramPlayerResult(
        slot.player,
        slot.champion,
        record.match_result === "team1"
      );
    });

    record.team2.forEach((slot) => {
      addAramPlayerResult(
        slot.player,
        slot.champion,
        record.match_result === "team2"
      );
    });
  });

  return statMap;
};

export const buildTotalMemberStats = (
  memberStats: PlayerStat[],
  aramMemberStats: Record<string, AramPlayerStat>
) => {
  const totalStatMap: Record<string, PlayerStat> = {};

  const getOrCreateTotalStat = (playerName: string) => {
    if (!totalStatMap[playerName]) {
      totalStatMap[playerName] = {
        name: playerName,
        games: 0,
        wins: 0,
        losses: 0,
        championStats: {},
        lineStats: {},
        opponentStats: {},
      };
    }

    return totalStatMap[playerName];
  };

  memberStats.forEach((stat) => {
    const totalStat = getOrCreateTotalStat(stat.name);

    totalStat.games += stat.games;
    totalStat.wins += stat.wins;
    totalStat.losses += stat.losses;

    Object.entries(stat.championStats).forEach(([champion, championStat]) => {
      if (!totalStat.championStats[champion]) {
        totalStat.championStats[champion] = createEmptyStatCount();
      }

      totalStat.championStats[champion].games += championStat.games;
      totalStat.championStats[champion].wins += championStat.wins;
      totalStat.championStats[champion].losses += championStat.losses;
    });

    Object.entries(stat.lineStats).forEach(([line, lineStat]) => {
      if (!lineStat) {
        return;
      }

      const lineKey = line as LineKey;

      if (!totalStat.lineStats[lineKey]) {
        totalStat.lineStats[lineKey] = createEmptyStatCount();
      }

      totalStat.lineStats[lineKey]!.games += lineStat.games;
      totalStat.lineStats[lineKey]!.wins += lineStat.wins;
      totalStat.lineStats[lineKey]!.losses += lineStat.losses;
    });

    Object.entries(stat.opponentStats).forEach(([opponent, opponentStat]) => {
      if (!totalStat.opponentStats[opponent]) {
        totalStat.opponentStats[opponent] = createEmptyStatCount();
      }

      totalStat.opponentStats[opponent].games += opponentStat.games;
      totalStat.opponentStats[opponent].wins += opponentStat.wins;
      totalStat.opponentStats[opponent].losses += opponentStat.losses;
    });
  });

  Object.entries(aramMemberStats).forEach(([playerName, aramStat]) => {
    const totalStat = getOrCreateTotalStat(playerName);

    totalStat.games += aramStat.games;
    totalStat.wins += aramStat.wins;
    totalStat.losses += aramStat.losses;

    Object.entries(aramStat.championStats).forEach(([champion, championStat]) => {
      if (!totalStat.championStats[champion]) {
        totalStat.championStats[champion] = createEmptyStatCount();
      }

      totalStat.championStats[champion].games += championStat.games;
      totalStat.championStats[champion].wins += championStat.wins;
      totalStat.championStats[champion].losses += championStat.losses;
    });
  });

  return Object.values(totalStatMap).sort((a, b) => {
    const bRate = b.games === 0 ? 0 : b.wins / b.games;
    const aRate = a.games === 0 ? 0 : a.wins / a.games;

    if (b.games !== a.games) {
      return b.games - a.games;
    }

    if (bRate !== aRate) {
      return bRate - aRate;
    }

    return a.name.localeCompare(b.name, "ko-KR");
  });
};

export const getAramParticipantsCount = (
  aramMatchRecords: AramMatchRecord[]
) => {
  const playerSet = new Set<string>();

  aramMatchRecords.forEach((record) => {
    record.team1.forEach((slot) => {
      if (slot.player.trim()) {
        playerSet.add(slot.player);
      }
    });

    record.team2.forEach((slot) => {
      if (slot.player.trim()) {
        playerSet.add(slot.player);
      }
    });
  });

  return playerSet.size;
};
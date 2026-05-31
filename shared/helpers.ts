export const getMemberGameTypes = (value: string | null) => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item);
};

export const toggleMemberGameType = (value: string, gameType: string) => {
  const gameTypes = getMemberGameTypes(value);

  if (gameTypes.includes(gameType)) {
    return gameTypes.filter((item) => item !== gameType).join(",");
  }

  return [...gameTypes, gameType].join(",");
};

export const getChampionImageUrl = (version: string, image: string) => {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${image}`;
};

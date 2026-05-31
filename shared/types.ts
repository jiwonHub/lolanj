export type Member = {
  id: string;
  name: string;
  nickname: string;
  highest_tier: string;
  current_tier: string;
  main_line: string;
  sub_line: string | null;
  memo: string | null;
  is_active: boolean;
  member_role: string | null;
};

export type LineKey = "탑" | "정글" | "미드" | "원딜" | "서폿";
export type TeamKey = "team1" | "team2";
export type ResultKey = "team1" | "team2" | "";

export type Champion = {
  id: string;
  name: string;
  image: string;
};

export type MatchRecord = {
  id: string;
  title: string | null;
  team1: Record<LineKey, { player: string; champion: string }>;
  team2: Record<LineKey, { player: string; champion: string }>;
  line_results: Record<LineKey, ResultKey>;
  match_result: ResultKey;
  created_at: string;
};

export type AramMatchRecord = {
  id: string;
  title: string | null;
  team1: { player: string; champion: string }[];
  team2: { player: string; champion: string }[];
  match_result: ResultKey;
  created_at: string;
};

export type StatCount = {
  games: number;
  wins: number;
  losses: number;
};

export type PlayerStat = {
  name: string;
  games: number;
  wins: number;
  losses: number;
  championStats: Record<string, StatCount>;
  lineStats: Partial<Record<LineKey, StatCount>>;
  opponentStats: Record<string, StatCount>;
};

export type AramPlayerStat = StatCount & {
  championStats: Record<string, StatCount>;
};

export type CanyonTeamSlots = Record<TeamKey, Record<LineKey, string>>;

export type AramTeamSlots = Record<TeamKey, string[]>;

export type CanyonRecordSlots = Record<
  TeamKey,
  Record<LineKey, { player: string; champion: string }>
>;

export type AramRecordSlots = Record<
  TeamKey,
  { player: string; champion: string }[]
>;

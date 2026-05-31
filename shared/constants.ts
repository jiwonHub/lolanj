import type { LineKey, TeamKey } from "./types.js";

export const LINES: LineKey[] = ["탑", "정글", "미드", "원딜", "서폿"];

export const MEMBER_LINE_OPTIONS = ["상관없음", ...LINES];

export const MEMBER_GAME_TYPES = ["협곡", "칼바람", "롤체"];

export const TIER_SCORES: Record<string, number> = {
  언랭: 0,
  아이언: 1000,
  브론즈: 1200,
  실버: 1400,
  골드: 1600,
  플레티넘: 1800,
  에메랄드: 2000,
  다이아몬드: 2300,
  마스터: 2600,
  그랜드마스터: 2900,
  챌린저: 3200,
};

export const TIER_NAMES = [
  "언랭",
  "아이언",
  "브론즈",
  "실버",
  "골드",
  "플레티넘",
  "에메랄드",
  "다이아몬드",
  "마스터",
  "그랜드마스터",
  "챌린저",
];

export const TIER_DIVISIONS = ["4", "3", "2", "1"];

export const HIGH_TIERS = ["마스터", "그랜드마스터", "챌린저"];

export const championPositions: Record<TeamKey, Record<LineKey, string>> = {
  team1: {
    탑: "left-[10%] top-[24%]",
    정글: "left-[30%] top-[40%]",
    미드: "left-[45%] top-[57%]",
    원딜: "left-[80%] top-[90%]",
    서폿: "left-[65%] top-[90%]",
  },
  team2: {
    탑: "left-[25%] top-[10%]",
    정글: "left-[70%] top-[67%]",
    미드: "left-[58%] top-[44%]",
    원딜: "left-[90%] top-[76%]",
    서폿: "left-[90%] top-[60%]",
  },
};

export const aramChampionPositions: Record<TeamKey, string[]> = {
  team1: [
    "left-[40%] top-[72%]",
    "left-[28%] top-[64%]",
    "left-[40%] top-[60%]",
    "left-[40%] top-[48%]",
    "left-[52%] top-[55%]",
  ],
  team2: [
    "left-[68%] top-[25%]",
    "left-[66%] top-[50%]",
    "left-[53%] top-[40%]",
    "left-[65%] top-[38%]",
    "left-[78%] top-[34%]",
  ],
};

export const LOGIN_SESSION_COOKIE_NAME = "lolanj_login_session";

export const REMEMBER_LOGIN_STORAGE_KEY = "lolanj_remember_login";

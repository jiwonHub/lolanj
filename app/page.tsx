"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Member = {
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

type LineKey = "탑" | "정글" | "미드" | "원딜" | "서폿";
type TeamKey = "team1" | "team2";
type ResultKey = "team1" | "team2" | "";

type Champion = {
  id: string;
  name: string;
  image: string;
};

type MatchRecord = {
  id: string;
  title: string | null;
  team1: Record<LineKey, { player: string; champion: string }>;
  team2: Record<LineKey, { player: string; champion: string }>;
  line_results: Record<LineKey, ResultKey>;
  match_result: ResultKey;
  created_at: string;
};

type AramMatchRecord = {
  id: string;
  title: string | null;
  team1: { player: string; champion: string }[];
  team2: { player: string; champion: string }[];
  match_result: ResultKey;
  created_at: string;
};

type StatCount = {
  games: number;
  wins: number;
  losses: number;
};

type PlayerStat = {
  name: string;
  games: number;
  wins: number;
  losses: number;
  championStats: Record<string, StatCount>;
  lineStats: Partial<Record<LineKey, StatCount>>;
  opponentStats: Record<string, StatCount>;
};

type AramPlayerStat = StatCount & {
  championStats: Record<string, StatCount>;
};

const LINES: LineKey[] = ["탑", "정글", "미드", "원딜", "서폿"];

const tierScores: Record<string, number> = {
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

const TIER_NAMES = [
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

const TIER_DIVISIONS = ["4", "3", "2", "1"];

const hasTierDivision = (tier: string) => {
  return !["마스터", "그랜드마스터", "챌린저"].includes(tier);
};

const getTierText = (tier: string, division: string) => {
  if (!hasTierDivision(tier)) {
    return tier;
  }

  return `${tier} ${division}`;
};

const getTierBaseName = (tierText: string) => {
  return tierText.split(" ")[0];
};

const getTierDivisionScore = (tierText: string) => {
  const parts = tierText.split(" ");
  const division = parts[1];

  if (!division) {
    return 0;
  }

  const divisionNumber = Number(division);

  if (Number.isNaN(divisionNumber)) {
    return 0;
  }

  return (4 - divisionNumber) * 50;
};

const getTierScore = (tierText: string) => {
  const baseTier = getTierBaseName(tierText);
  const baseScore = tierScores[baseTier] ?? 0;

  return baseScore + getTierDivisionScore(tierText);
};

const getChampionImageUrl = (version: string, image: string) => {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${image}`;
};

const championPositions: Record<TeamKey, Record<LineKey, string>> = {
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

const aramChampionPositions: Record<TeamKey, string[]> = {
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

const LOGIN_SESSION_COOKIE_NAME = "lolanj_login_session";
const REMEMBER_LOGIN_STORAGE_KEY = "lolanj_remember_login";

const setLoginSessionCookie = (id: string, role: string) => {
  const value = encodeURIComponent(JSON.stringify({ id, role }));
  document.cookie = `${LOGIN_SESSION_COOKIE_NAME}=${value}; path=/; SameSite=Lax`;
};

const getLoginSessionCookie = () => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOGIN_SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookie.split("=")[1])) as {
      id: string;
      role: string;
    };
  } catch {
    return null;
  }
};

const clearLoginSessionCookie = () => {
  document.cookie = `${LOGIN_SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginUserRole, setLoginUserRole] = useState("");
  const [isRememberLogin, setIsRememberLogin] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [tag, setTag] = useState("");
  const [highestTier, setHighestTier] = useState("플레티넘");
  const [highestTierDivision, setHighestTierDivision] = useState("4");
  const [currentTier, setCurrentTier] = useState("골드");
  const [currentTierDivision, setCurrentTierDivision] = useState("4");
  const [mainLine, setMainLine] = useState("미드");
  const [subLine, setSubLine] = useState("탑");
  const [memo, setMemo] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    "members" | "balance" | "record" | "aramBalance" | "aramRecord" | "stats"
  >("members");
  const [champions, setChampions] = useState<Champion[]>([]);
  const [ddragonVersion, setDdragonVersion] = useState("");
  const [memberStatsSearchName, setMemberStatsSearchName] = useState("");
  const [memberListSearchName, setMemberListSearchName] = useState("");

  const [teamSlots, setTeamSlots] = useState<
    Record<TeamKey, Record<LineKey, string>>
  >({
    team1: {
      탑: "",
      정글: "",
      미드: "",
      원딜: "",
      서폿: "",
    },
    team2: {
      탑: "",
      정글: "",
      미드: "",
      원딜: "",
      서폿: "",
    },
  });

  const [aramTeamSlots, setAramTeamSlots] = useState<
    Record<TeamKey, string[]>
  >({
    team1: ["", "", "", "", ""],
    team2: ["", "", "", "", ""],
  });

  const [aramAces, setAramAces] = useState<Record<TeamKey, number | null>>({
    team1: null,
    team2: null,
  });

  const [recordSlots, setRecordSlots] = useState<
  Record<TeamKey, Record<LineKey, { player: string; champion: string }>>
  >({
    team1: {
      탑: { player: "", champion: "" },
      정글: { player: "", champion: "" },
      미드: { player: "", champion: "" },
      원딜: { player: "", champion: "" },
      서폿: { player: "", champion: "" },
    },
    team2: {
      탑: { player: "", champion: "" },
      정글: { player: "", champion: "" },
      미드: { player: "", champion: "" },
      원딜: { player: "", champion: "" },
      서폿: { player: "", champion: "" },
    },
  });

  const [lineResults, setLineResults] = useState<Record<LineKey, ResultKey>>({
    탑: "",
    정글: "",
    미드: "",
    원딜: "",
    서폿: "",
  });

  const [aramRecordSlots, setAramRecordSlots] = useState<
    Record<TeamKey, { player: string; champion: string }[]>
  >({
    team1: [
      { player: "", champion: "" },
      { player: "", champion: "" },
      { player: "", champion: "" },
      { player: "", champion: "" },
      { player: "", champion: "" },
    ],
    team2: [
      { player: "", champion: "" },
      { player: "", champion: "" },
      { player: "", champion: "" },
      { player: "", champion: "" },
      { player: "", champion: "" },
    ],
  });

const [aramMatchResult, setAramMatchResult] = useState<ResultKey>("");
  
  const [matchResult, setMatchResult] = useState<ResultKey>("");
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([]);
  const [aramMatchRecords, setAramMatchRecords] = useState<AramMatchRecord[]>([]);
  const [statsView, setStatsView] = useState<"records" | "aramRecords" | "members">("records");
  const [expandedMemberName, setExpandedMemberName] = useState("");

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("members 조회 실패:", error);
      return;
    }

    setMembers(data ?? []);
  };

  const fetchChampions = async () => {
    try {
      const versionsResponse = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json"
      );
      const versions: string[] = await versionsResponse.json();
      const latestVersion = versions[0];
  
      const championsResponse = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/ko_KR/champion.json`
      );
      const championsJson = await championsResponse.json();
  
      const championList: Champion[] = Object.values(championsJson.data)
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (champion: any) => ({
            id: champion.id,
            name: champion.name,
            image: champion.image.full,
          })
        )
        .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));

      setDdragonVersion(latestVersion);
      setChampions(championList);
  
      setDdragonVersion(latestVersion);
      setChampions(championList);
    } catch (error) {
      console.error("챔피언 목록 조회 실패:", error);
    }
  };

  const addMember = async () => {
    if (!name.trim() || !nickname.trim() || !tag.trim()) {
      alert("이름, 닉네임, 태그는 필수입니다.");
      return;
    }

    const fullNickname = `${nickname.trim()}#${tag.trim()}`;

    const { error } = await supabase.from("members").insert({
      name: name.trim(),
      nickname: fullNickname,
      highest_tier: getTierText(highestTier, highestTierDivision),
      current_tier: getTierText(currentTier, currentTierDivision),
      main_line: mainLine,
      sub_line: subLine,
      memo: memo.trim(),
      is_active: true,
      member_role: null,
    });

    if (error) {
      console.error("members 저장 실패:", error);
      alert("저장 실패");
      return;
    }

    alert("모임원 등록 완료");

    setName("");
    setNickname("");
    setTag("");
    setMemo("");
    setHighestTier("플레티넘");
    setHighestTierDivision("4");
    setCurrentTier("골드");
    setCurrentTierDivision("4");
    setMainLine("미드");
    setSubLine("탑");

    await fetchMembers();
  };

  const deleteMember = async (memberId: string) => {
    const isConfirmed = confirm("이 모임원을 삭제할까요?");
  
    if (!isConfirmed) {
      return;
    }
  
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);
  
    if (error) {
      console.error("모임원 삭제 실패:", error);
      alert("모임원 삭제 실패");
      return;
    }
  
    await fetchMembers();
  };

  const updateMemberRole = async (memberId: string, memberRole: string) => {
    const targetMember = members.find((member) => member.id === memberId);

    if (!targetMember) {
      return;
    }

    if (targetMember.member_role === "모임장" && memberRole !== "모임장") {
      alert("모임장은 반드시 한 명이어야 합니다. 다른 모임원에게 모임장을 양도해주세요.");
      return;
    }

    if (memberRole === "모임장") {
      if (targetMember.member_role === "모임장") {
        return;
      }

      const isConfirmed = confirm(`${targetMember.name}님에게 모임장을 양도할까요?`);

      if (!isConfirmed) {
        return;
      }

      const { error: clearOwnerError } = await supabase
        .from("members")
        .update({
          member_role: null,
        })
        .eq("member_role", "모임장");

      if (clearOwnerError) {
        console.error("기존 모임장 해제 실패:", clearOwnerError);
        alert("기존 모임장 해제 실패");
        return;
      }

      const { error: setOwnerError } = await supabase
        .from("members")
        .update({
          member_role: "모임장",
        })
        .eq("id", memberId);

      if (setOwnerError) {
        console.error("모임장 양도 실패:", setOwnerError);
        alert("모임장 양도 실패");
        return;
      }

      await fetchMembers();
      return;
    }

    const { error } = await supabase
      .from("members")
      .update({
        member_role: memberRole || null,
      })
      .eq("id", memberId);

    if (error) {
      console.error("모임원 태그 변경 실패:", error);
      alert("모임원 태그 변경 실패");
      return;
    }

    await fetchMembers();
  };

  const findMemberByInput = (value: string) => {
    const keyword = value.trim().toLowerCase();
  
    if (!keyword) {
      return null;
    }
  
    return (
      members.find((member) => member.name.toLowerCase() === keyword) ?? null
    );
  };
  
  const isUnknownMemberName = (value: string) => {
    return value.trim() !== "" && !findMemberByInput(value);
  };

  const calculateMemberScore = (member: Member | null, line: LineKey) => {
    if (!member) {
      return 0;
    }

    const currentTierScore = getTierScore(member.current_tier);
    const highestTierScore = getTierScore(member.highest_tier);

    let lineBonus = -100;

    if (member.main_line === line) {
      lineBonus = 120;
    } else if (member.sub_line === line) {
      lineBonus = 60;
    }

    return Math.round(
      currentTierScore * 0.7 + highestTierScore * 0.2 + lineBonus
    );
  };

  const calculateAramMemberScore = (member: Member | null) => {
  if (!member) {
    return 0;
  }

  const currentTierScore = tierScores[member.current_tier] ?? 0;
  const highestTierScore = tierScores[member.highest_tier] ?? 0;

  return Math.round(currentTierScore * 0.75 + highestTierScore * 0.25);
};

  const getAramSlotMember = (team: TeamKey, index: number) => {
    return findMemberByInput(aramTeamSlots[team][index]);
  };

  const getAramSlotScore = (team: TeamKey, index: number) => {
    return calculateAramMemberScore(getAramSlotMember(team, index));
  };

  const getAutoAramAceIndex = (team: TeamKey) => {
    const filledMembers = aramTeamSlots[team]
      .map((value, index) => ({
        index,
        member: findMemberByInput(value),
      }))
      .filter((item) => item.member !== null);

    if (filledMembers.length < 3) {
      return null;
    }

    const ace = filledMembers.sort((a, b) => {
      const aHighestScore = tierScores[a.member!.highest_tier] ?? 0;
      const bHighestScore = tierScores[b.member!.highest_tier] ?? 0;

      const aCurrentScore = tierScores[a.member!.current_tier] ?? 0;
      const bCurrentScore = tierScores[b.member!.current_tier] ?? 0;

      if (bHighestScore !== aHighestScore) {
        return bHighestScore - aHighestScore;
      }

      return bCurrentScore - aCurrentScore;
    })[0];

    return ace?.index ?? null;
  };

  const getAramAceIndex = (team: TeamKey) => {
    return aramAces[team] ?? getAutoAramAceIndex(team);
  };

  const setAramAce = (team: TeamKey, index: number) => {
    const member = getAramSlotMember(team, index);

    if (!member) {
      return;
    }

    setAramAces({
      ...aramAces,
      [team]: aramAces[team] === index ? null : index,
    });
  };

  const getAramTeamTotalScore = (team: TeamKey) => {
    return aramTeamSlots[team].reduce(
      (total, _, index) => total + getAramSlotScore(team, index),
      0
    );
  };

  const getAramTeamResultText = () => {
    const team1Score = getAramTeamTotalScore("team1");
    const team2Score = getAramTeamTotalScore("team2");
    const diff = Math.abs(team1Score - team2Score);

    if (team1Score === team2Score) {
      return "완전 동률";
    }

    return team1Score > team2Score
      ? `1팀 우세 +${diff}`
      : `2팀 우세 +${diff}`;
  };

  const updateAramSlot = (team: TeamKey, index: number, value: string) => {
    const nextSlots = [...aramTeamSlots[team]];
    nextSlots[index] = value;

    setAramTeamSlots({
      ...aramTeamSlots,
      [team]: nextSlots,
    });

    if (aramAces[team] === index) {
      setAramAces({
        ...aramAces,
        [team]: null,
      });
    }
  };

  const swapAramTeams = () => {
    setAramTeamSlots({
      team1: aramTeamSlots.team2,
      team2: aramTeamSlots.team1,
    });

    setAramAces({
      team1: aramAces.team2,
      team2: aramAces.team1,
    });
  };

  const getSlotMember = (team: TeamKey, line: LineKey) => {
    return findMemberByInput(teamSlots[team][line]);
  };

  const getSlotScore = (team: TeamKey, line: LineKey) => {
    return calculateMemberScore(getSlotMember(team, line), line);
  };

  const getTeamTotalScore = (team: TeamKey) => {
    return LINES.reduce((total, line) => total + getSlotScore(team, line), 0);
  };

  const getLineDiff = (line: LineKey) => {
    return getSlotScore("team1", line) - getSlotScore("team2", line);
  };

  const getTeamResultText = () => {
    const team1Score = getTeamTotalScore("team1");
    const team2Score = getTeamTotalScore("team2");
    const diff = Math.abs(team1Score - team2Score);

    if (team1Score === team2Score) {
      return "완전 동률";
    }

    return team1Score > team2Score
      ? `1팀 우세 +${diff}`
      : `2팀 우세 +${diff}`;
  };

  const importBalanceToRecord = () => {
    const isConfirmed = confirm("내전 밸런스 정보를 가져오시겠습니까?");

    if (!isConfirmed) {
      return;
    }

    setRecordSlots({
      team1: {
        탑: { player: teamSlots.team1.탑, champion: "" },
        정글: { player: teamSlots.team1.정글, champion: "" },
        미드: { player: teamSlots.team1.미드, champion: "" },
        원딜: { player: teamSlots.team1.원딜, champion: "" },
        서폿: { player: teamSlots.team1.서폿, champion: "" },
      },
      team2: {
        탑: { player: teamSlots.team2.탑, champion: "" },
        정글: { player: teamSlots.team2.정글, champion: "" },
        미드: { player: teamSlots.team2.미드, champion: "" },
        원딜: { player: teamSlots.team2.원딜, champion: "" },
        서폿: { player: teamSlots.team2.서폿, champion: "" },
      },
    });
  };

  const importAramBalanceToRecord = () => {
  const isConfirmed = confirm("증바람 내전 밸런스 정보를 가져오시겠습니까?");

  if (!isConfirmed) {
    return;
  }

  setAramRecordSlots({
      team1: aramTeamSlots.team1.map((player) => ({
        player,
        champion: "",
      })),
      team2: aramTeamSlots.team2.map((player) => ({
        player,
        champion: "",
      })),
    });
  };

  const updateAramRecordPlayer = (
    team: TeamKey,
    index: number,
    value: string
  ) => {
    const nextSlots = [...aramRecordSlots[team]];
    nextSlots[index] = {
      ...nextSlots[index],
      player: value,
    };

    setAramRecordSlots({
      ...aramRecordSlots,
      [team]: nextSlots,
    });
  };

  const updateAramRecordChampion = (
    team: TeamKey,
    index: number,
    value: string
  ) => {
    const nextSlots = [...aramRecordSlots[team]];
    nextSlots[index] = {
      ...nextSlots[index],
      champion: value,
    };

    setAramRecordSlots({
      ...aramRecordSlots,
      [team]: nextSlots,
    });
  };

  const swapAramRecordTeams = () => {
    setAramRecordSlots({
      team1: aramRecordSlots.team2,
      team2: aramRecordSlots.team1,
    });
  };

  const swapBalanceTeams = () => {
    setTeamSlots({
      team1: teamSlots.team2,
      team2: teamSlots.team1,
    });
  };

  const swapRecordTeams = () => {
    setRecordSlots({
      team1: recordSlots.team2,
      team2: recordSlots.team1,
    });
  };
  
  const updateRecordPlayer = (team: TeamKey, line: LineKey, value: string) => {
    setRecordSlots({
      ...recordSlots,
      [team]: {
        ...recordSlots[team],
        [line]: {
          ...recordSlots[team][line],
          player: value,
        },
      },
    });
  };
  
  const updateRecordChampion = (team: TeamKey, line: LineKey, value: string) => {
    setRecordSlots({
      ...recordSlots,
      [team]: {
        ...recordSlots[team],
        [line]: {
          ...recordSlots[team][line],
          champion: value,
        },
      },
    });
  };
  
  const getChampionByName = (name: string) => {
    return champions.find((champion) => champion.name === name) ?? null;
  };

  const getChampionImageSrc = (name: string) => {
    const champion = getChampionByName(name);

    if (!champion || !ddragonVersion) {
      return "";
    }

    return getChampionImageUrl(ddragonVersion, champion.image);
  };

  useEffect(() => {
    const savedSession = getLoginSessionCookie();

    if (savedSession) {
      setIsLoggedIn(true);
      setLoginUserRole(savedSession.role);
    }

    const rememberedLogin = localStorage.getItem(REMEMBER_LOGIN_STORAGE_KEY);

    if (rememberedLogin) {
      try {
        const parsedLogin = JSON.parse(rememberedLogin) as {
          id: string;
          password: string;
        };

        setLoginId(parsedLogin.id);
        setLoginPassword(parsedLogin.password);
        setIsRememberLogin(true);
      } catch {
        localStorage.removeItem(REMEMBER_LOGIN_STORAGE_KEY);
      }
    }

    fetchMembers();
    fetchChampions();
  }, []);

const login = async () => {
  if (!loginId.trim() || !loginPassword.trim()) {
    alert("아이디와 비밀번호를 입력해야 합니다.");
    return;
  }

  const { data, error } = await supabase
    .from("login_accounts")
    .select("*")
    .eq("id", loginId.trim())
    .eq("password", loginPassword)
    .single();

  if (error || !data) {
    console.error("로그인 실패:", error);
    alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    return;
  }

  setLoginSessionCookie(data.id, data.role);

  if (isRememberLogin) {
    localStorage.setItem(
      REMEMBER_LOGIN_STORAGE_KEY,
      JSON.stringify({
        id: loginId.trim(),
        password: loginPassword,
      })
    );
  } else {
    localStorage.removeItem(REMEMBER_LOGIN_STORAGE_KEY);
  }

  setIsLoggedIn(true);
  setLoginUserRole(data.role);

  if (!isRememberLogin) {
    setLoginId("");
    setLoginPassword("");
  }
};

const logout = () => {
  clearLoginSessionCookie();
  setIsLoggedIn(false);
  setLoginUserRole("");
  setActiveMenu("members");
};

  const getResultLabel = (result: ResultKey) => {
    if (result === "team1") {
      return "1팀 우세";
    }
  
    if (result === "team2") {
      return "2팀 우세";
    }
  
    return "동등";
  };
  
  const getMatchResultLabel = (result: ResultKey) => {
    if (result === "team1") {
      return "1팀 승리";
    }
  
    if (result === "team2") {
      return "2팀 승리";
    }
  
    return "미설정";
  };
  
  const getResultClassName = (result: ResultKey) => {
    if (result === "team1") {
      return "border-blue-500 bg-blue-900/40 text-blue-200";
    }
  
    if (result === "team2") {
      return "border-red-500 bg-red-900/40 text-red-200";
    }
  
    return "border-slate-700 bg-[#07101f] text-slate-400";
  };

  const saveMatchRecord = async () => {
    if (!matchResult) {
      alert("최종 승리팀을 선택해야 합니다.");
      return;
    }

    const hasEmptyPlayerOrChampion = LINES.some((line) => {
      return (
        !recordSlots.team1[line].player.trim() ||
        !recordSlots.team1[line].champion.trim() ||
        !recordSlots.team2[line].player.trim() ||
        !recordSlots.team2[line].champion.trim()
      );
    });

    if (hasEmptyPlayerOrChampion) {
      alert("모든 라인의 이름과 챔피언을 입력해야 합니다.");
      return;
    }

    const title = prompt("내전 기록 제목을 입력하세요.");

    if (title === null) {
      return;
    }

    if (!title.trim()) {
      alert("내전 기록 제목을 입력해야 합니다.");
      return;
    }

    const { error } = await supabase.from("match_records").insert({
      title: title.trim(),
      team1: recordSlots.team1,
      team2: recordSlots.team2,
      line_results: lineResults,
      match_result: matchResult,
    });

    if (error) {
      console.error("내전 기록 저장 실패:", error);
      alert("내전 기록 저장 실패");
      return;
    }

    alert("내전 기록 저장 완료");
    await fetchMatchRecords();
  };

  const fetchMatchRecords = async () => {
    const { data, error } = await supabase
      .from("match_records")
      .select("*")
      .order("created_at", { ascending: false });
  
    if (error) {
      console.error("내전 기록 조회 실패:", error);
      alert("내전 기록 조회 실패");
      return;
    }
  
    setMatchRecords((data ?? []) as MatchRecord[]);
  };

  const saveAramMatchRecord = async () => {
  if (!aramMatchResult) {
    alert("최종 승리팀을 선택해야 합니다.");
    return;
  }

  const hasEmptyPlayerOrChampion = aramRecordSlots.team1.some((slot) => {
    return !slot.player.trim() || !slot.champion.trim();
  }) || aramRecordSlots.team2.some((slot) => {
    return !slot.player.trim() || !slot.champion.trim();
  });

  if (hasEmptyPlayerOrChampion) {
    alert("모든 이름과 챔피언을 입력해야 합니다.");
    return;
  }

  const title = prompt("증바 내전 기록 제목을 입력하세요.");

  if (title === null) {
    return;
  }

  if (!title.trim()) {
    alert("증바 내전 기록 제목을 입력해야 합니다.");
    return;
  }

  const { error } = await supabase.from("aram_match_records").insert({
    title: title.trim(),
    team1: aramRecordSlots.team1,
    team2: aramRecordSlots.team2,
    match_result: aramMatchResult,
  });

  if (error) {
    console.error("증바 내전 기록 저장 실패:", error);
    alert("증바 내전 기록 저장 실패");
    return;
  }

  alert("증바 내전 기록 저장 완료");
  await fetchAramMatchRecords();
};

  const fetchAramMatchRecords = async () => {
    const { data, error } = await supabase
      .from("aram_match_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("증바 내전 기록 조회 실패:", error);
      alert("증바 내전 기록 조회 실패");
      return;
    }

    setAramMatchRecords((data ?? []) as AramMatchRecord[]);
  };

  const deleteAramMatchRecord = async (recordId: string) => {
    const isConfirmed = confirm("이 증바 내전 기록을 삭제할까요?");

    if (!isConfirmed) {
      return;
    }

    const { error } = await supabase
      .from("aram_match_records")
      .delete()
      .eq("id", recordId);

    if (error) {
      console.error("증바 내전 기록 삭제 실패:", error);
      alert("증바 내전 기록 삭제 실패");
      return;
    }

    await fetchAramMatchRecords();
  };

  const deleteMatchRecord = async (recordId: string) => {
    const isConfirmed = confirm("이 내전 기록을 삭제할까요?");
  
    if (!isConfirmed) {
      return;
    }
  
    const { error } = await supabase
      .from("match_records")
      .delete()
      .eq("id", recordId);
  
    if (error) {
      console.error("내전 기록 삭제 실패:", error);
      alert("내전 기록 삭제 실패");
      return;
    }
  
    await fetchMatchRecords();
  };

  const createEmptyStatCount = (): StatCount => ({
  games: 0,
  wins: 0,
  losses: 0,
});

const addStatCount = (
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

const getWinRate = (wins: number, games: number) => {
  if (games === 0) {
    return "0.0";
  }

  return ((wins / games) * 100).toFixed(1);
};

const buildMemberStats = () => {
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

const getMostPickedChampionText = () => {
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

const getBestWinRatePlayerText = (playerStats: PlayerStat[]) => {
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

const getAramMostPickedChampionText = () => {
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

const getAramBestWinRatePlayerText = (
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

const buildAramMemberStats = () => {
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

const getAramParticipantsCount = () => {
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

const memberStats = buildMemberStats();
const mostPickedChampionText = getMostPickedChampionText();
const bestWinRatePlayerText = getBestWinRatePlayerText(memberStats);

const aramMemberStats = buildAramMemberStats();
const aramMostPickedChampionText = getAramMostPickedChampionText();
const aramBestWinRatePlayerText = getAramBestWinRatePlayerText(aramMemberStats);
const aramParticipantsCount = getAramParticipantsCount();

const filteredMemberStats = memberStats.filter((stat) => {
  const keyword = memberStatsSearchName.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return stat.name.toLowerCase().includes(keyword);
});

const filteredMembers = members.filter((member) => {
  const keyword = memberListSearchName.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return (
    member.name.toLowerCase().includes(keyword) ||
    member.nickname.toLowerCase().includes(keyword) ||
    member.current_tier.toLowerCase().includes(keyword) ||
    member.highest_tier.toLowerCase().includes(keyword) ||
    member.main_line.toLowerCase().includes(keyword) ||
    (member.sub_line ?? "").toLowerCase().includes(keyword)
  );
});

const canDeleteMember = loginUserRole === "모임장" || loginUserRole === "운영진";
const canSetMemberRole = loginUserRole === "모임장";

if (!isLoggedIn) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050b14] px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0b1424] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">롤면 뭐하니</h1>
          <p className="mt-2 text-sm text-slate-400">
            아이디와 비밀번호를 입력하세요.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              아이디
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
              placeholder="아이디"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  login();
                }
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              비밀번호
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
              placeholder="비밀번호"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  login();
                }
              }}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isRememberLogin}
              onChange={(e) => setIsRememberLogin(e.target.checked)}
              className="h-4 w-4"
            />
            아이디 / 비밀번호 기억하기
          </label>

          <button
            onClick={login}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
          >
            로그인
          </button>
        </div>
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-[#050b14] text-white">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-slate-800 bg-[#08111f] p-6">
              <h1 className="text-2xl font-bold">롤면 뭐하니</h1>
              <p className="mt-1 text-sm text-slate-400">모임원 관리</p>

              <div className="mt-5 rounded-xl border border-slate-800 bg-[#0b1424] p-3">
                <p className="text-xs text-slate-400">권한 등급</p>
                <p className="mt-1 text-sm font-semibold text-slate-200">
                  {loginUserRole}
                </p>

                <button
                  onClick={logout}
                  className="mt-3 w-full rounded-lg bg-red-900 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-800"
                >
                  로그아웃
                </button>
              </div>

              <nav className="mt-10 space-y-3 text-sm">
            <button
              onClick={() => setActiveMenu("members")}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activeMenu === "members"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300"
              }`}
            >
              모임원 리스트
            </button>

            <button
              onClick={() => setActiveMenu("balance")}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activeMenu === "balance"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300"
              }`}
            >
              협곡 내전 밸런스
            </button>

            <button
              onClick={() => setActiveMenu("record")}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activeMenu === "record"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300"
              }`}
            >
              협곡 내전 기록
            </button>
            <button
              onClick={() => setActiveMenu("aramBalance")}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activeMenu === "aramBalance"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300"
              }`}
            >
              증바람 내전 밸런스
            </button>

            <button
              onClick={() => setActiveMenu("aramRecord")}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activeMenu === "aramRecord"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300"
              }`}
            >
              증바람 내전 기록
            </button>
            <button
              onClick={() => {
                setActiveMenu("stats");
                fetchMatchRecords();
                fetchAramMatchRecords();
              }}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activeMenu === "stats"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300"
              }`}
            >
              통계
            </button>
          </nav>
        </aside>

        <section className="flex-1 p-8">
          {activeMenu === "members" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">모임원 리스트</h2>
                  <p className="mt-2 text-slate-400">
                    롤면 뭐하니 모임원 관리 화면
                  </p>
                </div>

                <button
                  onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
                >
                  {isAddFormOpen ? "닫기" : "모임원 추가"}
                </button>
              </div>

              <div
                className={`overflow-hidden transition-all duration-500 ${
                  isAddFormOpen
                    ? "mt-8 max-h-[900px] opacity-100"
                    : "mt-0 max-h-0 opacity-0"
                }`}
              >
                <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
                  <h3 className="mb-5 text-xl font-semibold">모임원 등록</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        이름
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                        placeholder="이름"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        닉네임
                      </label>

                      <div className="flex items-center gap-3">
                        <input
                          className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                          placeholder="닉네임"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                        />

                        <span className="text-lg font-bold text-slate-400">
                          #
                        </span>

                        <input
                          className="w-80 rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                          placeholder="태그"
                          value={tag}
                          onChange={(e) => setTag(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        최고티어
                      </label>

                      <div className="grid grid-cols-[1fr_120px] gap-3">
                        <select
                          className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                          value={highestTier}
                          onChange={(e) => {
                            setHighestTier(e.target.value);

                            if (!hasTierDivision(e.target.value)) {
                              setHighestTierDivision("4");
                            }
                          }}
                        >
                          {TIER_NAMES.map((tier) => (
                            <option key={`highest-${tier}`}>{tier}</option>
                          ))}
                        </select>

                        <select
                          className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none disabled:opacity-40"
                          value={highestTierDivision}
                          disabled={!hasTierDivision(highestTier)}
                          onChange={(e) => setHighestTierDivision(e.target.value)}
                        >
                          {TIER_DIVISIONS.map((division) => (
                            <option key={`highest-division-${division}`} value={division}>
                              {division}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        최고티어
                      </label>

                      <div className="grid grid-cols-[1fr_120px] gap-3">
                        <select
                          className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                          value={highestTier}
                          onChange={(e) => {
                            setHighestTier(e.target.value);

                            if (!hasTierDivision(e.target.value)) {
                              setHighestTierDivision("4");
                            }
                          }}
                        >
                          {TIER_NAMES.map((tier) => (
                            <option key={`highest-${tier}`}>{tier}</option>
                          ))}
                        </select>

                        <select
                          className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none disabled:opacity-40"
                          value={highestTierDivision}
                          disabled={!hasTierDivision(highestTier)}
                          onChange={(e) => setHighestTierDivision(e.target.value)}
                        >
                          {TIER_DIVISIONS.map((division) => (
                            <option key={`highest-division-${division}`} value={division}>
                              {division}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        주라인
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                        value={mainLine}
                        onChange={(e) => setMainLine(e.target.value)}
                      >
                        <option>탑</option>
                        <option>정글</option>
                        <option>미드</option>
                        <option>원딜</option>
                        <option>서폿</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        부라인
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                        value={subLine}
                        onChange={(e) => setSubLine(e.target.value)}
                      >
                        <option>탑</option>
                        <option>정글</option>
                        <option>미드</option>
                        <option>원딜</option>
                        <option>서폿</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        메모
                      </label>
                      <textarea
                        className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                        placeholder="메모"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={addMember}
                      className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
                    >
                      등록하기
                    </button>
                  </div>
                </div>
              </div>

                <div className="mt-8 rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold">모임원 리스트</h3>

                    <input
                      className="w-80 rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                      placeholder="이름 / 닉네임 / 티어 / 라인 검색"
                      value={memberListSearchName}
                      onChange={(e) => setMemberListSearchName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl border border-slate-800 bg-[#111c2e] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-slate-400">
                            {member.nickname}
                          </p>
                        </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {canSetMemberRole ? (
                              <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-[#07101f] p-1">
                                <button
                                  onClick={() => updateMemberRole(member.id, "")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    !member.member_role
                                      ? "bg-slate-600 text-white shadow"
                                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                  }`}
                                >
                                  없음
                                </button>

                                <button
                                  onClick={() => updateMemberRole(member.id, "모임장")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    member.member_role === "모임장"
                                      ? "bg-yellow-400 text-black shadow"
                                      : "text-yellow-300 hover:bg-yellow-900/40"
                                  }`}
                                >
                                  👑 모임장
                                </button>

                                <button
                                  onClick={() => updateMemberRole(member.id, "운영진")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                                    member.member_role === "운영진"
                                      ? "bg-blue-500 text-white shadow"
                                      : "text-blue-300 hover:bg-blue-900/40"
                                  }`}
                                >
                                  🛡 운영진
                                </button>
                              </div>
                            ) : (
                              member.member_role && (
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-black shadow-sm ${
                                    member.member_role === "모임장"
                                      ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                                      : "border-blue-400 bg-blue-500/15 text-blue-300"
                                  }`}
                                >
                                  {member.member_role === "모임장" ? "👑 모임장" : "🛡 운영진"}
                                </span>
                              )
                            )}

                            {canDeleteMember && member.member_role !== "모임장" && (
                              <button
                                onClick={() => deleteMember(member.id)}
                                className="rounded-full bg-red-900 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-800"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-300">
                        <p>현재 티어: {member.current_tier}</p>
                        <p>최고 티어: {member.highest_tier}</p>
                        <p>주 라인: {member.main_line}</p>
                        <p>부 라인: {member.sub_line}</p>
                      </div>

                      {member.memo && (
                        <p className="mt-3 text-sm text-slate-400">
                          메모: {member.memo}
                        </p>
                      )}
                    </div>
                  ))}

                  {filteredMembers.length === 0 && memberListSearchName.trim() && (
                    <p className="text-slate-400">
                      검색된 모임원이 없습니다.
                    </p>
                  )}

                  {members.length === 0 && !memberListSearchName.trim() && (
                    <p className="text-slate-400">
                      등록된 모임원이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeMenu === "balance" && (
            <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">협곡 내전 밸런스</h2>
                  <p className="mt-2 text-slate-400">
                    이름 또는 닉네임을 입력하면 티어/라인 기반 점수가
                    계산됩니다.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-[#111c2e] px-5 py-3 text-right">
                  <p className="text-xs text-slate-400">밸런스 결과</p>
                  <p
                    className={`mt-1 text-lg font-bold ${
                      getTeamTotalScore("team1") === getTeamTotalScore("team2")
                        ? "text-slate-200"
                        : getTeamTotalScore("team1") >
                          getTeamTotalScore("team2")
                        ? "text-blue-400"
                        : "text-red-400"
                    }`}
                  >
                    {getTeamResultText()}
                  </p>
                </div>
              </div>

              <datalist id="member-list">
                {members.map((member) => (
                  <option key={member.id} value={member.name} />
                ))}
              </datalist>

              <div className="mt-6 grid grid-cols-[1fr_90px_1fr] gap-4">
                <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <h4 className="text-lg font-bold text-blue-300">1팀</h4>
                    <span className="rounded-full bg-blue-900 px-4 py-1 text-sm font-semibold text-blue-200">
                      총점 {getTeamTotalScore("team1")}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {LINES.map((line) => {
                      const member = getSlotMember("team1", line);
                      const score = getSlotScore("team1", line);
                      const diff = getLineDiff(line);

                      return (
                        <div
                          key={`team1-${line}`}
                          className={`rounded-xl border p-4 ${
                            diff > 0
                              ? "border-blue-500/60 bg-blue-900/30"
                              : "border-slate-800 bg-[#111c2e]"
                          }`}
                        >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                                  {line}
                                </span>

                                {member && (
                                  <span className="text-base font-bold text-blue-300">
                                    {member.nickname}
                                  </span>
                                )}
                              </div>

                              <span className="text-sm font-semibold text-blue-300">
                                {score}점
                              </span>
                            </div>
                          <input
                            list="member-list"
                            className={`w-full rounded-lg border bg-[#07101f] px-3 py-2 outline-none ${
                              isUnknownMemberName(teamSlots.team1[line])
                                ? "border-red-500 text-red-300"
                                : "border-slate-700"
                            }`}
                            placeholder={`${line} 이름 입력`}
                            value={teamSlots.team1[line]}
                            onChange={(e) =>
                              setTeamSlots({
                                ...teamSlots,
                                team1: {
                                  ...teamSlots.team1,
                                  [line]: e.target.value,
                                },
                              })
                            }
                          />
                          <div className="mt-2 min-h-6 text-sm">
                            {isUnknownMemberName(teamSlots.team1[line]) && (
                              <p className="font-semibold text-red-400">
                                모임원 리스트에 없는 이름입니다.
                              </p>
                            )}

                            {member && (
                              <p className="font-medium text-slate-300">
                                현재 {member.current_tier} · 최고 {member.highest_tier} · 주{" "}
                                {member.main_line} · 부 {member.sub_line}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-3">
                  <button
                    onClick={swapBalanceTeams}
                    className="mb-2 rounded-xl border border-slate-700 bg-[#07101f] px-4 py-3 text-xl font-bold text-slate-200 hover:bg-slate-800"
                    title="1팀과 2팀 위치 바꾸기"
                  >
                    ⇄
                  </button>

                  {LINES.map((line) => {
                    const diff = getLineDiff(line);

                    return (
                      <div
                        key={`diff-${line}`}
                        className="flex h-[86px] w-full flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#111c2e]"
                      >
                        <p className="text-xs text-slate-400">{line}</p>
                        <p
                          className={`mt-1 text-sm font-bold ${
                            diff === 0
                              ? "text-slate-300"
                              : diff > 0
                              ? "text-blue-400"
                              : "text-red-400"
                          }`}
                        >
                          {diff === 0
                            ? "동률"
                            : diff > 0
                            ? `1팀 +${Math.abs(diff)}`
                            : `2팀 +${Math.abs(diff)}`}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <h4 className="text-lg font-bold text-red-300">2팀</h4>
                    <span className="rounded-full bg-red-900 px-4 py-1 text-sm font-semibold text-red-200">
                      총점 {getTeamTotalScore("team2")}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {LINES.map((line) => {
                      const member = getSlotMember("team2", line);
                      const score = getSlotScore("team2", line);
                      const diff = getLineDiff(line);

                      return (
                        <div
                          key={`team2-${line}`}
                          className={`rounded-xl border p-4 ${
                            diff < 0
                              ? "border-red-500/60 bg-red-900/30"
                              : "border-slate-800 bg-[#111c2e]"
                          }`}
                        >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                                  {line}
                                </span>

                                {member && (
                                  <span className="text-base font-bold text-red-300">
                                    {member.nickname}
                                  </span>
                                )}
                              </div>

                              <span className="text-sm font-semibold text-red-300">
                                {score}점
                              </span>
                            </div>

                          <input
                            list="member-list"
                            className={`w-full rounded-lg border bg-[#07101f] px-3 py-2 outline-none ${
                              isUnknownMemberName(teamSlots.team2[line])
                                ? "border-red-500 text-red-300"
                                : "border-slate-700"
                            }`}
                            placeholder={`${line} 이름 입력`}
                            value={teamSlots.team2[line]}
                            onChange={(e) =>
                              setTeamSlots({
                                ...teamSlots,
                                team2: {
                                  ...teamSlots.team2,
                                  [line]: e.target.value,
                                },
                              })
                            }
                          />

                          <div className="mt-2 min-h-6 text-sm">
                            {isUnknownMemberName(teamSlots.team2[line]) && (
                              <p className="font-semibold text-red-400">
                                모임원 리스트에 없는 이름입니다.
                              </p>
                            )}

                            {member && (
                              <p className="font-medium text-slate-300">
                                현재 {member.current_tier} · 최고 {member.highest_tier} · 주{" "}
                                {member.main_line} · 부 {member.sub_line}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeMenu === "record" && (
  <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">협곡 내전 기록</h2>
        <p className="mt-2 text-slate-400">
          협곡 내전 밸런스 정보를 가져와 챔피언과 라인을 기록합니다.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={importBalanceToRecord}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
        >
          협곡 내전 밸런스 정보 가져오기
        </button>

        <button
          onClick={saveMatchRecord}
          className="rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-500"
        >
          저장하기
        </button>
      </div>

      <datalist id="record-member-list">
        {members.map((member) => (
          <option key={member.id} value={member.name} />
        ))}
      </datalist>

      <datalist id="champion-list">
        {champions.map((champion) => (
          <option key={champion.id} value={champion.name} />
        ))}
      </datalist>
    </div>

    <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-bold">결과 설정</h3>
      <p className="mt-1 text-sm text-slate-400">
        라인별 우세와 최종 승리팀을 기록합니다. (라인별 우세는 선택사항)
      </p>
    </div>

    <div
      className={`rounded-xl border px-5 py-3 text-right ${getResultClassName(
        matchResult
      )}`}
    >
      <p className="text-xs">최종 결과</p>
      <p className="mt-1 text-lg font-bold">
        {getMatchResultLabel(matchResult)}
      </p>
    </div>
  </div>

  <div className="mt-5 grid grid-cols-5 gap-3">
    {LINES.map((line) => (
      <div
        key={`line-result-${line}`}
        className={`rounded-xl border p-4 ${getResultClassName(
          lineResults[line]
        )}`}
      >
        <p className="mb-3 text-sm font-bold">{line} 라인전</p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() =>
              setLineResults({
                ...lineResults,
                [line]: lineResults[line] === "team1" ? "" : "team1",
              })
            }
            className={`rounded-lg border px-2 py-2 ${
              lineResults[line] === "team1"
                ? "border-blue-400 bg-blue-600 text-white"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            1팀 우세
          </button>

          <button
            onClick={() =>
              setLineResults({
                ...lineResults,
                [line]: lineResults[line] === "team2" ? "" : "team2",
              })
            }
            className={`rounded-lg border px-2 py-2 ${
              lineResults[line] === "team2"
                ? "border-red-400 bg-red-600 text-white"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            2팀 우세
          </button>
        </div>

        <p className="mt-3 text-xs font-semibold">
          {getResultLabel(lineResults[line])}
        </p>
      </div>
    ))}
  </div>

  <div className="mt-5 grid grid-cols-2 gap-3">
    <button
      onClick={() => setMatchResult("team1")}
      className={`rounded-xl border px-4 py-3 font-bold ${
        matchResult === "team1"
          ? "border-blue-400 bg-blue-600 text-white"
          : "border-slate-700 bg-[#07101f] text-slate-300"
      }`}
    >
      1팀 승리
    </button>

    <button
      onClick={() => setMatchResult("team2")}
      className={`rounded-xl border px-4 py-3 font-bold ${
        matchResult === "team2"
          ? "border-red-400 bg-red-600 text-white"
          : "border-slate-700 bg-[#07101f] text-slate-300"
      }`}
    >
      2팀 승리
    </button>
  </div>
</div>

<div className="mt-8 grid grid-cols-[1fr_520px_1fr] gap-6">
      <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-blue-300">1팀</h3>
          <span className="rounded-full bg-blue-900 px-4 py-1 text-sm font-semibold text-blue-200">
            Blue Side
          </span>
        </div>

        <div className="space-y-3">
          {LINES.map((line) => (
            <div
              key={`record-team1-${line}`}
              className="rounded-xl border border-slate-800 bg-[#111c2e] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                  {line}
                </span>
                <span className="text-xs text-blue-300">1팀</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  list="record-member-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="이름 검색"
                  value={recordSlots.team1[line].player}
                  onChange={(e) =>
                    updateRecordPlayer("team1", line, e.target.value)
                  }
                />

                <input
                  list="champion-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="챔피언 검색"
                  value={recordSlots.team1[line].champion}
                  onChange={(e) =>
                    updateRecordChampion("team1", line, e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold">소환사의 협곡 배치도</h3>
          <p className="mt-1 text-xs text-slate-400">
            선택한 챔피언이 라인 위치에 표시됩니다.
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-visible rounded-2xl border border-slate-700 bg-slate-950">
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <img
              src="https://ddragon.leagueoflegends.com/cdn/15.10.1/img/map/map11.png"
              alt="소환사의 협곡"
              className="h-full w-full object-contain opacity-70"
            />
          </div>

          {LINES.map((line) => {
            const team1Champion = getChampionByName(
              recordSlots.team1[line].champion
            );
            const team2Champion = getChampionByName(
              recordSlots.team2[line].champion
            );

            return (
              <div key={`map-${line}`}>
                {team1Champion && (
                  <div
                    className={`absolute ${championPositions.team1[line]} z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-950 p-1 shadow-lg shadow-blue-900/50">
                      <img
                        src={getChampionImageUrl(ddragonVersion, team1Champion.image)}
                        alt={team1Champion.name}
                        className="block h-12 w-12 min-h-12 min-w-12 shrink-0 rounded-full object-cover"
                      />
                    </div>
                    <p className="mt-1 whitespace-nowrap text-center text-[10px] font-bold text-blue-300">
                      {recordSlots.team1[line].player}
                    </p>
                  </div>
                )}

                {team2Champion && (
                  <div
                    className={`absolute ${championPositions.team2[line]} z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-red-400 bg-red-950 p-1 shadow-lg shadow-red-900/50">
                      <img
                        src={getChampionImageUrl(ddragonVersion, team2Champion.image)}
                        alt={team2Champion.name}
                        className="block h-12 w-12 min-h-12 min-w-12 shrink-0 rounded-full object-cover"
                      />
                    </div>
                    <p className="mt-1 whitespace-nowrap text-center text-[10px] font-bold text-red-300">
                      {recordSlots.team2[line].player}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center">
          <button
            onClick={swapRecordTeams}
            className="rounded-xl border border-slate-700 bg-[#07101f] px-6 py-3 text-xl font-bold text-slate-200 hover:bg-slate-800"
            title="1팀과 2팀 위치 바꾸기"
          >
            ⇄
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-red-300">2팀</h3>
          <span className="rounded-full bg-red-900 px-4 py-1 text-sm font-semibold text-red-200">
            Red Side
          </span>
        </div>

        <div className="space-y-3">
          {LINES.map((line) => (
            <div
              key={`record-team2-${line}`}
              className="rounded-xl border border-slate-800 bg-[#111c2e] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                  {line}
                </span>
                <span className="text-xs text-red-300">2팀</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  list="record-member-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="이름 검색"
                  value={recordSlots.team2[line].player}
                  onChange={(e) =>
                    updateRecordPlayer("team2", line, e.target.value)
                  }
                />

                <input
                  list="champion-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="챔피언 검색"
                  value={recordSlots.team2[line].champion}
                  onChange={(e) =>
                    updateRecordChampion("team2", line, e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}

{activeMenu === "aramBalance" && (
  <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">증바람 내전 밸런스</h2>
        <p className="mt-2 text-slate-400">
          라인 구분 없이 5대5 팀 밸런스를 계산하고, 팀별 에이스를 지정합니다.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-[#111c2e] px-5 py-3 text-right">
        <p className="text-xs text-slate-400">밸런스 결과</p>
        <p
          className={`mt-1 text-lg font-bold ${
            getAramTeamTotalScore("team1") === getAramTeamTotalScore("team2")
              ? "text-slate-200"
              : getAramTeamTotalScore("team1") >
                getAramTeamTotalScore("team2")
              ? "text-blue-400"
              : "text-red-400"
          }`}
        >
          {getAramTeamResultText()}
        </p>
      </div>
    </div>

    <datalist id="aram-member-list">
      {members.map((member) => (
        <option key={member.id} value={member.name} />
      ))}
    </datalist>

    <div className="mt-6 grid grid-cols-[1fr_90px_1fr] gap-4">
      <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h4 className="text-lg font-bold text-blue-300">1팀</h4>
          <span className="rounded-full bg-blue-900 px-4 py-1 text-sm font-semibold text-blue-200">
            총점 {getAramTeamTotalScore("team1")}
          </span>
        </div>

        <div className="space-y-3">
          {aramTeamSlots.team1.map((value, index) => {
            const member = getAramSlotMember("team1", index);
            const score = getAramSlotScore("team1", index);
            const isAce = getAramAceIndex("team1") === index;

            return (
              <div
                key={`aram-team1-${index}`}
                className={`rounded-xl border p-4 ${
                  isAce
                    ? "border-yellow-400 bg-yellow-900/20 shadow-lg shadow-yellow-900/30"
                    : "border-slate-800 bg-[#111c2e]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                      {index + 1}번
                    </span>

                    {isAce && (
                      <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-black text-black">
                        ACE
                      </span>
                    )}

                    {member && (
                      <span className="text-base font-bold text-blue-300">
                        {member.nickname}
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-semibold text-blue-300">
                    {score}점
                  </span>
                </div>

                <input
                  list="aram-member-list"
                  className={`w-full rounded-lg border bg-[#07101f] px-3 py-2 outline-none ${
                    isUnknownMemberName(value)
                      ? "border-red-500 text-red-300"
                      : "border-slate-700"
                  }`}
                  placeholder="이름 입력"
                  value={value}
                  onChange={(e) =>
                    updateAramSlot("team1", index, e.target.value)
                  }
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-h-6 text-sm">
                    {isUnknownMemberName(value) && (
                      <p className="font-semibold text-red-400">
                        모임원 리스트에 없는 이름입니다.
                      </p>
                    )}

                    {member && (
                      <p className="font-medium text-slate-300">
                        현재 {member.current_tier} · 최고 {member.highest_tier}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setAramAce("team1", index)}
                    disabled={!member}
                    className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold ${
                      !member
                        ? "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
                        : isAce
                        ? "border-yellow-400 bg-yellow-500 text-black"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {isAce ? "에이스 해제" : "에이스 지정"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3">
        <button
          onClick={swapAramTeams}
          className="mb-2 rounded-xl border border-slate-700 bg-[#07101f] px-4 py-3 text-xl font-bold text-slate-200 hover:bg-slate-800"
          title="1팀과 2팀 위치 바꾸기"
        >
          ⇄
        </button>

        <div className="flex h-[120px] w-full flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#111c2e]">
          <p className="text-xs text-slate-400">점수 차이</p>
          <p
            className={`mt-1 text-sm font-bold ${
              getAramTeamTotalScore("team1") === getAramTeamTotalScore("team2")
                ? "text-slate-300"
                : getAramTeamTotalScore("team1") >
                  getAramTeamTotalScore("team2")
                ? "text-blue-400"
                : "text-red-400"
            }`}
          >
            {Math.abs(
              getAramTeamTotalScore("team1") - getAramTeamTotalScore("team2")
            )}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h4 className="text-lg font-bold text-red-300">2팀</h4>
          <span className="rounded-full bg-red-900 px-4 py-1 text-sm font-semibold text-red-200">
            총점 {getAramTeamTotalScore("team2")}
          </span>
        </div>

        <div className="space-y-3">
          {aramTeamSlots.team2.map((value, index) => {
            const member = getAramSlotMember("team2", index);
            const score = getAramSlotScore("team2", index);
            const isAce = getAramAceIndex("team2") === index;

            return (
              <div
                key={`aram-team2-${index}`}
                className={`rounded-xl border p-4 ${
                  isAce
                    ? "border-yellow-400 bg-yellow-900/20 shadow-lg shadow-yellow-900/30"
                    : "border-slate-800 bg-[#111c2e]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                      {index + 1}번
                    </span>

                    {isAce && (
                      <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-black text-black">
                        ACE
                      </span>
                    )}

                    {member && (
                      <span className="text-base font-bold text-red-300">
                        {member.nickname}
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-semibold text-red-300">
                    {score}점
                  </span>
                </div>

                <input
                  list="aram-member-list"
                  className={`w-full rounded-lg border bg-[#07101f] px-3 py-2 outline-none ${
                    isUnknownMemberName(value)
                      ? "border-red-500 text-red-300"
                      : "border-slate-700"
                  }`}
                  placeholder="이름 입력"
                  value={value}
                  onChange={(e) =>
                    updateAramSlot("team2", index, e.target.value)
                  }
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-h-6 text-sm">
                    {isUnknownMemberName(value) && (
                      <p className="font-semibold text-red-400">
                        모임원 리스트에 없는 이름입니다.
                      </p>
                    )}

                    {member && (
                      <p className="font-medium text-slate-300">
                        현재 {member.current_tier} · 최고 {member.highest_tier}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setAramAce("team2", index)}
                    disabled={!member}
                    className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold ${
                      !member
                        ? "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600"
                        : isAce
                        ? "border-yellow-400 bg-yellow-500 text-black"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {isAce ? "에이스 해제" : "에이스 지정"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
)}
{activeMenu === "aramRecord" && (
  <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">증바람 내전 기록</h2>
        <p className="mt-2 text-slate-400">
          증바람 내전 밸런스 정보를 가져와 챔피언과 승패를 기록합니다.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={importAramBalanceToRecord}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
        >
          증바람 밸런스 정보 가져오기
        </button>

        <button
          onClick={saveAramMatchRecord}
          className="rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-500"
        >
          저장하기
        </button>
      </div>

      <datalist id="aram-record-member-list">
        {members.map((member) => (
          <option key={member.id} value={member.name} />
        ))}
      </datalist>

      <datalist id="aram-champion-list">
        {champions.map((champion) => (
          <option key={champion.id} value={champion.name} />
        ))}
      </datalist>
    </div>

    <div className="mt-8 rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">결과 설정</h3>
          <p className="mt-1 text-sm text-slate-400">
            증바람은 라인전 우세 없이 최종 승리팀만 기록합니다.
          </p>
        </div>

        <div
          className={`rounded-xl border px-5 py-3 text-right ${getResultClassName(
            aramMatchResult
          )}`}
        >
          <p className="text-xs">최종 결과</p>
          <p className="mt-1 text-lg font-bold">
            {getMatchResultLabel(aramMatchResult)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setAramMatchResult("team1")}
          className={`rounded-xl border px-4 py-3 font-bold ${
            aramMatchResult === "team1"
              ? "border-blue-400 bg-blue-600 text-white"
              : "border-slate-700 bg-[#07101f] text-slate-300"
          }`}
        >
          1팀 승리
        </button>

        <button
          onClick={() => setAramMatchResult("team2")}
          className={`rounded-xl border px-4 py-3 font-bold ${
            aramMatchResult === "team2"
              ? "border-red-400 bg-red-600 text-white"
              : "border-slate-700 bg-[#07101f] text-slate-300"
          }`}
        >
          2팀 승리
        </button>
      </div>
    </div>

    <div className="mt-8 grid grid-cols-[1fr_520px_1fr] gap-6">
      <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-blue-300">1팀</h3>
          <span className="rounded-full bg-blue-900 px-4 py-1 text-sm font-semibold text-blue-200">
            Blue Side
          </span>
        </div>

        <div className="space-y-3">
          {aramRecordSlots.team1.map((slot, index) => (
            <div
              key={`aram-record-team1-${index}`}
              className="rounded-xl border border-slate-800 bg-[#111c2e] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                  {index + 1}번
                </span>
                <span className="text-xs text-blue-300">1팀</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  list="aram-record-member-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="이름 검색"
                  value={slot.player}
                  onChange={(e) =>
                    updateAramRecordPlayer("team1", index, e.target.value)
                  }
                />

                <input
                  list="aram-champion-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="챔피언 검색"
                  value={slot.champion}
                  onChange={(e) =>
                    updateAramRecordChampion("team1", index, e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold">칼바람 나락 배치도</h3>
          <p className="mt-1 text-xs text-slate-400">
            선택한 챔피언이 칼바람 위치에 표시됩니다.
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-visible rounded-2xl border border-slate-700 bg-slate-950">
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <img
              src="https://ddragon.leagueoflegends.com/cdn/15.10.1/img/map/map12.png"
              alt="칼바람 나락"
              className="h-full w-full object-contain opacity-70"
            />
          </div>

          {aramRecordSlots.team1.map((slot, index) => {
            const champion = getChampionByName(slot.champion);

            if (!champion) {
              return null;
            }

            return (
              <div
                key={`aram-map-team1-${index}`}
                className={`absolute ${aramChampionPositions.team1[index]} z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center`}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-950 p-1 shadow-lg shadow-blue-900/50">
                  <img
                    src={getChampionImageUrl(ddragonVersion, champion.image)}
                    alt={champion.name}
                    className="block h-12 w-12 min-h-12 min-w-12 shrink-0 rounded-full object-cover"
                  />
                </div>
                <p className="mt-1 whitespace-nowrap text-center text-[10px] font-bold text-blue-300">
                  {slot.player}
                </p>
              </div>
            );
          })}

          {aramRecordSlots.team2.map((slot, index) => {
            const champion = getChampionByName(slot.champion);

            if (!champion) {
              return null;
            }

            return (
              <div
                key={`aram-map-team2-${index}`}
                className={`absolute ${aramChampionPositions.team2[index]} z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center`}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-red-400 bg-red-950 p-1 shadow-lg shadow-red-900/50">
                  <img
                    src={getChampionImageUrl(ddragonVersion, champion.image)}
                    alt={champion.name}
                    className="block h-12 w-12 min-h-12 min-w-12 shrink-0 rounded-full object-cover"
                  />
                </div>
                <p className="mt-1 whitespace-nowrap text-center text-[10px] font-bold text-red-300">
                  {slot.player}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={swapAramRecordTeams}
            className="rounded-xl border border-slate-700 bg-[#07101f] px-6 py-3 text-xl font-bold text-slate-200 hover:bg-slate-800"
            title="1팀과 2팀 위치 바꾸기"
          >
            ⇄
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-red-300">2팀</h3>
          <span className="rounded-full bg-red-900 px-4 py-1 text-sm font-semibold text-red-200">
            Red Side
          </span>
        </div>

        <div className="space-y-3">
          {aramRecordSlots.team2.map((slot, index) => (
            <div
              key={`aram-record-team2-${index}`}
              className="rounded-xl border border-slate-800 bg-[#111c2e] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                  {index + 1}번
                </span>
                <span className="text-xs text-red-300">2팀</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  list="aram-record-member-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="이름 검색"
                  value={slot.player}
                  onChange={(e) =>
                    updateAramRecordPlayer("team2", index, e.target.value)
                  }
                />

                <input
                  list="aram-champion-list"
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="챔피언 검색"
                  value={slot.champion}
                  onChange={(e) =>
                    updateAramRecordChampion("team2", index, e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
{activeMenu === "stats" && (
  <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">통계</h2>
        <p className="mt-2 text-slate-400">
          내전 기록과 모임원별 승률을 확인합니다.
        </p>
      </div>

      <button
        onClick={() => {
          fetchMatchRecords();
          fetchAramMatchRecords();
        }}
        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
      >
        새로고침
      </button>
    </div>

    <div className="mt-8 grid grid-cols-4 gap-4">
      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <p className="text-sm text-slate-400">총 협곡 내전 수</p>
        <p className="mt-2 text-3xl font-bold">{matchRecords.length}</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <p className="text-sm text-slate-400">협곡 내전 참여 모임원</p>
        <p className="mt-2 text-3xl font-bold">{memberStats.length}</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <p className="text-sm text-slate-400">협곡 내전 최다 픽 챔피언</p>
        <p className="mt-2 text-lg font-bold">{mostPickedChampionText}</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <p className="text-sm text-slate-400">협곡 내전 최고 승률 모임원</p>
        <p className="mt-2 text-xl font-bold leading-7">
          {bestWinRatePlayerText}
        </p>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-4 gap-4">
      <div className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-5">
        <p className="text-sm text-purple-300">총 증바 내전 수</p>
        <p className="mt-2 text-3xl font-bold">{aramMatchRecords.length}</p>
      </div>

      <div className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-5">
        <p className="text-sm text-purple-300">증바 내전 참여 모임원</p>
        <p className="mt-2 text-3xl font-bold">{aramParticipantsCount}</p>
      </div>

      <div className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-5">
        <p className="text-sm text-purple-300">증바 내전 최다 픽 챔피언</p>
        <p className="mt-2 text-lg font-bold">{aramMostPickedChampionText}</p>
      </div>

      <div className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-5">
        <p className="text-sm text-purple-300">증바 내전 최고 승률 모임원</p>
        <p className="mt-2 text-lg font-bold leading-7">
          {aramBestWinRatePlayerText}
        </p>
      </div>
    </div>

    <div className="mt-8 flex gap-3">
      <button
        onClick={() => setStatsView("records")}
        className={`rounded-xl border px-5 py-3 font-bold ${
          statsView === "records"
            ? "border-blue-500 bg-blue-600 text-white"
            : "border-slate-700 bg-[#07101f] text-slate-300"
        }`}
      >
        내전 기록 리스트
      </button>

      <button
        onClick={() => setStatsView("aramRecords")}
        className={`rounded-xl border px-5 py-3 font-bold ${
          statsView === "aramRecords"
            ? "border-purple-500 bg-purple-600 text-white"
            : "border-slate-700 bg-[#07101f] text-slate-300"
        }`}
      >
        증바 내전 기록 리스트
      </button>

      <button
        onClick={() => setStatsView("members")}
        className={`rounded-xl border px-5 py-3 font-bold ${
          statsView === "members"
            ? "border-blue-500 bg-blue-600 text-white"
            : "border-slate-700 bg-[#07101f] text-slate-300"
        }`}
      >
        모임원별 통계
      </button>
    </div>

    {statsView === "records" && (
      <div className="mt-8 space-y-5">
        {matchRecords.map((record, index) => (
          <div
            key={record.id}
            className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {record.title || `내전 기록 #${matchRecords.length - index}`}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {new Date(record.created_at).toLocaleString("ko-KR")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl border px-5 py-3 text-right ${
                    record.match_result === "team1"
                      ? "border-blue-500 bg-blue-900/40 text-blue-200"
                      : "border-red-500 bg-red-900/40 text-red-200"
                  }`}
                >
                  <p className="text-xs">최종 결과</p>
                  <p className="mt-1 text-lg font-bold">
                    {record.match_result === "team1" ? "1팀 승리" : "2팀 승리"}
                  </p>
                </div>

                {canDeleteMember && (
                  <button
                    onClick={() => deleteMatchRecord(record.id)}
                    className="rounded-xl bg-red-900 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-800"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {LINES.map((line) => (
                <div
                  key={`${record.id}-${line}`}
                  className={`rounded-xl border p-4 ${
                    record.line_results[line] === "team1"
                      ? "border-blue-500 bg-blue-900/40 text-blue-200"
                      : record.line_results[line] === "team2"
                      ? "border-red-500 bg-red-900/40 text-red-200"
                      : "border-slate-700 bg-[#07101f] text-slate-300"
                  }`}
                >
                  <p className="mb-3 text-sm font-bold">{line} 라인전</p>

                  <p className="text-xs font-semibold">
                    {record.line_results[line] === "team1"
                      ? "1팀 우세"
                      : record.line_results[line] === "team2"
                      ? "2팀 우세"
                      : "동등"}
                  </p>

                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-lg border border-blue-900/50 bg-blue-950/30 p-3">
                      <div>
                        <p className="font-bold text-blue-300">1팀</p>
                        <p className="mt-1 text-slate-200">
                          {record.team1[line].player}
                        </p>
                        <p className="text-slate-400">
                          {record.team1[line].champion}
                        </p>
                      </div>

                      {getChampionImageSrc(record.team1[line].champion) && (
                        <img
                          src={getChampionImageSrc(record.team1[line].champion)}
                          alt={record.team1[line].champion}
                          className="h-10 w-10 shrink-0 rounded-full border border-blue-400 object-cover"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-red-900/50 bg-red-950/30 p-3">
                      <div>
                        <p className="font-bold text-red-300">2팀</p>
                        <p className="mt-1 text-slate-200">
                          {record.team2[line].player}
                        </p>
                        <p className="text-slate-400">
                          {record.team2[line].champion}
                        </p>
                      </div>

                      {getChampionImageSrc(record.team2[line].champion) && (
                        <img
                          src={getChampionImageSrc(record.team2[line].champion)}
                          alt={record.team2[line].champion}
                          className="h-10 w-10 shrink-0 rounded-full border border-red-400 object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {matchRecords.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-8 text-center text-slate-400">
            저장된 내전 기록이 없습니다.
          </div>
        )}
      </div>
    )}

    {statsView === "aramRecords" && (
  <div className="mt-8 space-y-5">
    {aramMatchRecords.map((record, index) => (
      <div
        key={record.id}
        className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-5"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">
              {record.title || `증바 내전 기록 #${aramMatchRecords.length - index}`}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {new Date(record.created_at).toLocaleString("ko-KR")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl border px-5 py-3 text-right ${
                record.match_result === "team1"
                  ? "border-blue-500 bg-blue-900/40 text-blue-200"
                  : "border-red-500 bg-red-900/40 text-red-200"
              }`}
            >
              <p className="text-xs">최종 결과</p>
              <p className="mt-1 text-lg font-bold">
                {record.match_result === "team1" ? "1팀 승리" : "2팀 승리"}
              </p>
            </div>

            {canDeleteMember && (
              <button
                onClick={() => deleteAramMatchRecord(record.id)}
                className="rounded-xl bg-red-900 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-800"
              >
                삭제
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-4">
            <h4 className="mb-4 font-bold text-blue-300">1팀</h4>

            <div className="grid grid-cols-5 gap-3">
              {record.team1.map((slot, slotIndex) => (
                <div
                  key={`${record.id}-team1-${slotIndex}`}
                  className="flex items-center justify-between rounded-lg border border-blue-900/50 bg-blue-950/30 p-3"
                >
                  <div>
                    <p className="font-bold text-blue-300">{slot.player}</p>
                    <p className="text-sm text-slate-400">{slot.champion}</p>
                  </div>

                  {getChampionImageSrc(slot.champion) && (
                    <img
                      src={getChampionImageSrc(slot.champion)}
                      alt={slot.champion}
                      className="h-10 w-10 shrink-0 rounded-full border border-blue-400 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
            <h4 className="mb-4 font-bold text-red-300">2팀</h4>

            <div className="grid grid-cols-5 gap-3">
              {record.team2.map((slot, slotIndex) => (
                <div
                  key={`${record.id}-team2-${slotIndex}`}
                  className="flex items-center justify-between rounded-lg border border-red-900/50 bg-red-950/30 p-3"
                >
                  <div>
                    <p className="font-bold text-red-300">{slot.player}</p>
                    <p className="text-sm text-slate-400">{slot.champion}</p>
                  </div>

                  {getChampionImageSrc(slot.champion) && (
                    <img
                      src={getChampionImageSrc(slot.champion)}
                      alt={slot.champion}
                      className="h-10 w-10 shrink-0 rounded-full border border-red-400 object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ))}

    {aramMatchRecords.length === 0 && (
      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-8 text-center text-slate-400">
        저장된 증바 내전 기록이 없습니다.
      </div>
    )}
  </div>
)}

{statsView === "members" && (
  <div className="mt-8 space-y-4">
    <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">모임원별 통계</h3>
          <p className="mt-1 text-sm text-slate-400">
            이름 검색 시 해당 모임원만 필터링합니다.
          </p>
        </div>

        <div className="w-80">
          <input
            list="member-stats-list"
            className="w-full rounded-lg border border-slate-700 bg-[#07101f] px-4 py-3 outline-none"
            placeholder="모임원 이름 검색"
            value={memberStatsSearchName}
            onChange={(e) => setMemberStatsSearchName(e.target.value)}
          />

          <datalist id="member-stats-list">
            {memberStats.map((stat) => (
              <option key={stat.name} value={stat.name} />
            ))}
          </datalist>
        </div>
      </div>
    </div>

    {filteredMemberStats.map((stat) => {
      const isExpanded = expandedMemberName === stat.name;

      return (
        <div
          key={stat.name}
          className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{stat.name}</h3>

              <div className="mt-3 flex items-center gap-3">
                <span className="rounded-lg bg-slate-900 px-4 py-2 text-lg font-bold text-slate-100">
                  협곡 {stat.games}전
                </span>

                <span className="rounded-lg bg-blue-900/50 px-4 py-2 text-lg font-bold text-blue-200">
                  {stat.wins}승
                </span>

                <span className="rounded-lg bg-red-900/50 px-4 py-2 text-lg font-bold text-red-200">
                  {stat.losses}패
                </span>

                <span className="rounded-lg bg-emerald-900/40 px-4 py-2 text-lg font-bold text-emerald-200">
                  승률 {getWinRate(stat.wins, stat.games)}%
                </span>
              </div>

              {aramMemberStats[stat.name] && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="rounded-lg bg-purple-950 px-4 py-2 text-lg font-bold text-purple-200">
                    증바 {aramMemberStats[stat.name].games}전
                  </span>

                  <span className="rounded-lg bg-blue-900/50 px-4 py-2 text-lg font-bold text-blue-200">
                    {aramMemberStats[stat.name].wins}승
                  </span>

                  <span className="rounded-lg bg-red-900/50 px-4 py-2 text-lg font-bold text-red-200">
                    {aramMemberStats[stat.name].losses}패
                  </span>

                  <span className="rounded-lg bg-emerald-900/40 px-4 py-2 text-lg font-bold text-emerald-200">
                    승률 {getWinRate(aramMemberStats[stat.name].wins, aramMemberStats[stat.name].games)}%
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() =>
                setExpandedMemberName(isExpanded ? "" : stat.name)
              }
              className="rounded-xl border border-slate-700 bg-[#07101f] px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              {isExpanded ? "닫기" : "자세히 보기"}
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-500 ${
              isExpanded
                ? "mt-5 max-h-[2200px] opacity-100"
                : "mt-0 max-h-0 opacity-0"
            }`}
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-800 bg-[#07101f] p-4">
                <h4 className="mb-4 font-bold">협곡 챔피언별 전적</h4>

                <div className="space-y-3">
                  {Object.entries(stat.championStats)
                    .sort((a, b) => b[1].games - a[1].games)
                    .map(([champion, championStat]) => (
                      <div
                        key={`${stat.name}-${champion}`}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#111c2e] p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold">{champion}</p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold text-slate-100">
                              {championStat.games}전
                            </span>

                            <span className="rounded-md bg-blue-900/50 px-3 py-1 text-sm font-bold text-blue-200">
                              {championStat.wins}승
                            </span>

                            <span className="rounded-md bg-red-900/50 px-3 py-1 text-sm font-bold text-red-200">
                              {championStat.losses}패
                            </span>

                            <span className="rounded-md bg-emerald-900/40 px-3 py-1 text-sm font-bold text-emerald-200">
                              {getWinRate(championStat.wins, championStat.games)}%
                            </span>
                          </div>
                        </div>

                        {getChampionImageSrc(champion) && (
                          <img
                            src={getChampionImageSrc(champion)}
                            alt={champion}
                            className="h-10 w-10 shrink-0 rounded-full border border-slate-600 object-cover"
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#07101f] p-4">
                <h4 className="mb-4 font-bold">라인별 성적</h4>

                <div className="space-y-3">
                  {Object.entries(stat.lineStats)
                    .sort((a, b) => b[1].games - a[1].games)
                    .map(([line, lineStat]) => (
                      <div
                        key={`${stat.name}-${line}`}
                        className="rounded-lg border border-slate-800 bg-[#111c2e] p-3"
                      >
                        <p className="text-base font-bold">{line}</p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold text-slate-100">
                            {lineStat.games}전
                          </span>

                          <span className="rounded-md bg-blue-900/50 px-3 py-1 text-sm font-bold text-blue-200">
                            {lineStat.wins}승
                          </span>

                          <span className="rounded-md bg-red-900/50 px-3 py-1 text-sm font-bold text-red-200">
                            {lineStat.losses}패
                          </span>

                          <span className="rounded-md bg-emerald-900/40 px-3 py-1 text-sm font-bold text-emerald-200">
                            {getWinRate(lineStat.wins, lineStat.games)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#07101f] p-4">
                <h4 className="mb-4 font-bold">상대별 전적</h4>

                <div className="space-y-3">
                  {Object.entries(stat.opponentStats)
                    .sort((a, b) => b[1].games - a[1].games)
                    .map(([opponent, opponentStat]) => (
                      <div
                        key={`${stat.name}-${opponent}`}
                        className="rounded-lg border border-slate-800 bg-[#111c2e] p-3"
                      >
                        <p className="text-base font-bold">vs {opponent}</p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold text-slate-100">
                            {opponentStat.games}전
                          </span>

                          <span className="rounded-md bg-blue-900/50 px-3 py-1 text-sm font-bold text-blue-200">
                            {opponentStat.wins}승
                          </span>

                          <span className="rounded-md bg-red-900/50 px-3 py-1 text-sm font-bold text-red-200">
                            {opponentStat.losses}패
                          </span>

                          <span className="rounded-md bg-emerald-900/40 px-3 py-1 text-sm font-bold text-emerald-200">
                            {getWinRate(opponentStat.wins, opponentStat.games)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            {aramMemberStats[stat.name] && (
  <div className="mt-4 rounded-xl border border-purple-900/60 bg-purple-950/20 p-4">
    <h4 className="mb-4 font-bold text-purple-200">
      증바 챔피언별 전적
    </h4>

    <div className="grid grid-cols-3 gap-3">
      {Object.entries(aramMemberStats[stat.name].championStats)
        .sort((a, b) => b[1].games - a[1].games)
        .map(([champion, championStat]) => (
          <div
            key={`${stat.name}-aram-${champion}`}
            className="flex items-center justify-between rounded-lg border border-purple-900/50 bg-[#111c2e] p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-purple-100">
                {champion}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold text-slate-100">
                  {championStat.games}전
                </span>

                <span className="rounded-md bg-blue-900/50 px-3 py-1 text-sm font-bold text-blue-200">
                  {championStat.wins}승
                </span>

                <span className="rounded-md bg-red-900/50 px-3 py-1 text-sm font-bold text-red-200">
                  {championStat.losses}패
                </span>

                <span className="rounded-md bg-emerald-900/40 px-3 py-1 text-sm font-bold text-emerald-200">
                  {getWinRate(championStat.wins, championStat.games)}%
                </span>
              </div>
            </div>

            {getChampionImageSrc(champion) && (
              <img
                src={getChampionImageSrc(champion)}
                alt={champion}
                className="h-10 w-10 shrink-0 rounded-full border border-purple-400 object-cover"
              />
            )}
          </div>
        ))}
    </div>
  </div>
)}
          </div>
        </div>
      );
    })}

    {filteredMemberStats.length === 0 && memberStatsSearchName.trim() && (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-8 text-center text-red-300">
        검색한 모임원의 통계가 없습니다.
      </div>
    )}

    {memberStats.length === 0 && (
      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-8 text-center text-slate-400">
        모임원별 통계를 계산할 내전 기록이 없습니다.
      </div>
    )}
  </div>
)}
  </div>
)}
        </section>
      </div>
    </main>
  );
}
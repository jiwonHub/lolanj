"use client";

import { useEffect, useState } from "react";
import {
  clearLoginSessionCookie,
  clearRememberedLogin,
  getLoginSessionCookie,
  getRememberedLogin,
  loginAccount,
  saveRememberedLogin,
  setLoginSessionCookie,
} from "../features/auth/authService";

import {
  addMemberApi,
  clearOwnerRoleApi,
  deleteMemberApi,
  fetchMembersApi,
  updateMemberApi,
  updateMemberRoleApi,
} from "../features/members/memberService";

import {
  deleteAramMatchRecordApi,
  deleteMatchRecordApi,
  fetchAramMatchRecordsApi,
  fetchMatchRecordsApi,
  saveAramMatchRecordApi,
  saveMatchRecordApi,
} from "../features/records/recordService";

import type {
  AramMatchRecord,
  AramPlayerStat,
  Champion,
  LineKey,
  MatchRecord,
  Member,
  PlayerStat,
  ResultKey,
  StatCount,
  TeamKey,
} from "../shared/types";

import {
  LINES,
  MEMBER_GAME_TYPES,
  MEMBER_LINE_OPTIONS,
  TIER_DIVISIONS,
  TIER_NAMES,
  aramChampionPositions,
  championPositions,
  LOGIN_SESSION_COOKIE_NAME,
  REMEMBER_LOGIN_STORAGE_KEY,
} from "../shared/constants";

import {
  getCurrentTierScore,
  getTierScore,
  getTierText,
  hasTierPoint,
  parseTierText,
} from "../shared/tier";

import {
  calculateAramMemberScore,
  calculateMemberScore,
} from "../features/balance/balanceCalculator";

import {
  analyzeAutoBalanceTeamsApi,
  analyzeAutoBalanceAramTeamsApi,
  type AnalyzeAutoBalanceTeamsResponse,
  type AnalyzeAutoBalanceAramTeamsResponse,
} from "../features/ai/aiService";

import {
  buildAramMemberStats,
  buildMemberStats,
  buildTotalMemberStats,
  getAramBestWinRatePlayerText,
  getAramMostPickedChampionText,
  getAramParticipantsCount,
  getBestWinRatePlayerText,
  getMostPickedChampionText,
  getWinRate,
} from "../features/stats/statsCalculator";

import {
  getChampionImageUrl,
  getMemberGameTypes,
  toggleMemberGameType,
} from "../shared/helpers";

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
  const [memberListPage, setMemberListPage] = useState(1);
  const [isAutoBalancing, setIsAutoBalancing] = useState(false);
  const [autoBalancePhase, setAutoBalancePhase] = useState("");
  const [autoBalanceSearchName, setAutoBalanceSearchName] = useState("");
  const [autoBalanceSelectedMembers, setAutoBalanceSelectedMembers] = useState<
    Member[]
  >([]);
  const [autoBalanceCustomRequest, setAutoBalanceCustomRequest] = useState("");
  const [isAutoBalanceResultOpen, setIsAutoBalanceResultOpen] = useState(false);
  const [autoBalanceAnalysis, setAutoBalanceAnalysis] =
    useState<AnalyzeAutoBalanceTeamsResponse["analysis"] | null>(null);

  const [isAramAutoBalancing, setIsAramAutoBalancing] = useState(false);
  const [aramAutoBalancePhase, setAramAutoBalancePhase] = useState("");
  const [aramAutoBalanceSearchName, setAramAutoBalanceSearchName] = useState("");
  const [aramAutoBalanceSelectedMembers, setAramAutoBalanceSelectedMembers] =
    useState<Member[]>([]);
  const [aramAutoBalanceCustomRequest, setAramAutoBalanceCustomRequest] =
    useState("");
  const [isAramAutoBalanceResultOpen, setIsAramAutoBalanceResultOpen] =
    useState(false);
  const [aramAutoBalanceAnalysis, setAramAutoBalanceAnalysis] =
    useState<AnalyzeAutoBalanceAramTeamsResponse["analysis"] | null>(null);

  const [editingMemberId, setEditingMemberId] = useState("");
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editHighestTier, setEditHighestTier] = useState("플레티넘");
  const [editHighestTierDivision, setEditHighestTierDivision] = useState("4");
  const [editCurrentTier, setEditCurrentTier] = useState("골드");
  const [editCurrentTierDivision, setEditCurrentTierDivision] = useState("4");
  const [editMainLine, setEditMainLine] = useState("미드");
  const [editSubLine, setEditSubLine] = useState("탑");
  const [editMemo, setEditMemo] = useState("");

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
    const { data, error } = await fetchMembersApi();

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

    const { error } = await addMemberApi({
      name: name.trim(),
      nickname: fullNickname,
      highest_tier: getTierText(highestTier, highestTierDivision),
      current_tier: getTierText(currentTier, currentTierDivision),
      main_line: mainLine,
      sub_line: subLine,
      memo: memo.trim(),
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

    const { error } = await deleteMemberApi(memberId);

    if (error) {
      console.error("모임원 삭제 실패:", error);
      alert("모임원 삭제 실패");
      return;
    }

    await fetchMembers();
  };

  const startEditMember = (member: Member) => {
    const highest = parseTierText(member.highest_tier);
    const current = parseTierText(member.current_tier);

    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditNickname(member.nickname);
    setEditHighestTier(highest.tier);
    setEditHighestTierDivision(highest.division);
    setEditCurrentTier(current.tier);
    setEditCurrentTierDivision(current.division);
    setEditMainLine(member.main_line);
    setEditSubLine(member.sub_line ?? "탑");
    setEditMemo(member.memo ?? "");
  };

  const cancelEditMember = () => {
    setEditingMemberId("");
    setEditName("");
    setEditNickname("");
    setEditHighestTier("플레티넘");
    setEditHighestTierDivision("4");
    setEditCurrentTier("골드");
    setEditCurrentTierDivision("4");
    setEditMainLine("미드");
    setEditSubLine("탑");
    setEditMemo("");
  };

  const updateMember = async (memberId: string) => {
    const targetMember = members.find((member) => member.id === memberId);

    if (!targetMember) {
      alert("수정할 모임원 정보를 찾을 수 없습니다.");
      return;
    }

    if (!canEditTargetMember(targetMember)) {
      alert("모임장 정보는 모임장만 수정할 수 있습니다.");
      return;
    }

    if (!editName.trim() || !editNickname.trim()) {
      alert("이름과 닉네임은 필수입니다.");
      return;
    }

    const { error } = await updateMemberApi(memberId, {
      name: editName.trim(),
      nickname: editNickname.trim(),
      highest_tier: getTierText(editHighestTier, editHighestTierDivision),
      current_tier: getTierText(editCurrentTier, editCurrentTierDivision),
      main_line: editMainLine,
      sub_line: editSubLine,
      memo: editMemo.trim(),
    });

    if (error) {
      console.error("모임원 수정 실패:", error);
      alert("모임원 수정 실패");
      return;
    }

    alert("모임원 수정 완료");
    cancelEditMember();
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

      const { error: clearOwnerError } = await clearOwnerRoleApi();

      if (clearOwnerError) {
        console.error("기존 모임장 해제 실패:", clearOwnerError);
        alert("기존 모임장 해제 실패");
        return;
      }

      const { error: setOwnerError } = await updateMemberRoleApi(memberId, "모임장");

      if (setOwnerError) {
        console.error("모임장 양도 실패:", setOwnerError);
        alert("모임장 양도 실패");
        return;
      }

      await fetchMembers();
      return;
    }

    const { error } = await updateMemberRoleApi(memberId, memberRole || null);

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
      members.find((member) => {
        const name = member.name.trim().toLowerCase();
        const nickname = member.nickname.trim().toLowerCase();
        const nicknameOnly = member.nickname.split("#")[0]?.trim().toLowerCase();

        return (
          name === keyword ||
          nickname === keyword ||
          nicknameOnly === keyword
        );
      }) ?? null
    );
  };

  const isUnknownMemberName = (value: string) => {
    return value.trim() !== "" && !findMemberByInput(value);
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
      const aHighestScore = getTierScore(a.member!.highest_tier);
      const bHighestScore = getTierScore(b.member!.highest_tier);

      const aCurrentScore = getCurrentTierScore(
        a.member!.current_tier,
        a.member!.highest_tier
      );
      const bCurrentScore = getCurrentTierScore(
        b.member!.current_tier,
        b.member!.highest_tier
      );

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

    setAramAutoBalanceAnalysis(null);
    setIsAramAutoBalanceResultOpen(false);
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

  const filteredAutoBalanceMembers = members.filter((member) => {
    const keyword = autoBalanceSearchName.trim().toLowerCase();
    const isSelected = autoBalanceSelectedMembers.some(
      (selectedMember) => selectedMember.id === member.id
    );

    if (isSelected) {
      return false;
    }

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

  const addAutoBalanceMember = (member: Member) => {
    if (autoBalanceSelectedMembers.length >= 10) {
      alert("참여자는 최대 10명까지 선택할 수 있습니다.");
      return;
    }

    if (
      autoBalanceSelectedMembers.some(
        (selectedMember) => selectedMember.id === member.id
      )
    ) {
      return;
    }

    setAutoBalanceSelectedMembers([...autoBalanceSelectedMembers, member]);
    setAutoBalanceSearchName("");
    setAutoBalanceAnalysis(null);
    setIsAutoBalanceResultOpen(false);
  };

  const removeAutoBalanceMember = (memberId: string) => {
    setAutoBalanceSelectedMembers(
      autoBalanceSelectedMembers.filter((member) => member.id !== memberId)
    );
    setAutoBalanceAnalysis(null);
    setIsAutoBalanceResultOpen(false);
  };

  const getAutoBalanceErrorMessage = () => {
    if (autoBalanceSelectedMembers.length !== 10) {
      return `참여자 10명을 선택해야 합니다. 현재 ${autoBalanceSelectedMembers.length}명`;
    }

    const uniqueMemberIds = new Set(
      autoBalanceSelectedMembers.map((member) => member.id)
    );

    if (uniqueMemberIds.size !== 10) {
      return "중복된 참여자가 있습니다.";
    }

    return "";
  };

  const autoBalanceErrorMessage = getAutoBalanceErrorMessage();

  const canAutoBalanceTeams = !autoBalanceErrorMessage;

  const autoBalanceTeams = async () => {
    if (!canAutoBalanceTeams) {
      alert("참여자 10명을 중복 없이 선택해야 합니다.");
      return;
    }

    let phaseTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      setIsAutoBalancing(true);
      setAutoBalancePhase("팀 조합 계산 중...");
      setAutoBalanceAnalysis(null);

      phaseTimer = setTimeout(() => {
        setAutoBalancePhase("AI 분석 생성 중...");
      }, 700);

      const result = await analyzeAutoBalanceTeamsApi(
        autoBalanceSelectedMembers.map((member) => ({
          ...member,
          line_scores: {
            탑: calculateMemberScore(member, "탑"),
            정글: calculateMemberScore(member, "정글"),
            미드: calculateMemberScore(member, "미드"),
            원딜: calculateMemberScore(member, "원딜"),
            서폿: calculateMemberScore(member, "서폿"),
          },
        })),
        autoBalanceCustomRequest
      );

      setTeamSlots(result.teamSlots);
      setAutoBalanceAnalysis(result.analysis);
      setIsAutoBalanceResultOpen(true);

      if (result.warnings.length > 0) {
        alert(result.warnings[0]);
      }
    } catch (error) {
      console.error("AI 자동 팀짜기 실패:", error);

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("AI 자동 팀짜기 실패");
      }
    } finally {
      if (phaseTimer) {
        clearTimeout(phaseTimer);
      }

      setIsAutoBalancing(false);
      setAutoBalancePhase("");
    }
  };

  const filteredAramAutoBalanceMembers = members.filter((member) => {
    const keyword = aramAutoBalanceSearchName.trim().toLowerCase();
    const isSelected = aramAutoBalanceSelectedMembers.some(
      (selectedMember) => selectedMember.id === member.id
    );

    if (isSelected) {
      return false;
    }

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

  const addAramAutoBalanceMember = (member: Member) => {
    if (aramAutoBalanceSelectedMembers.length >= 10) {
      alert("참여자는 최대 10명까지 선택할 수 있습니다.");
      return;
    }

    if (
      aramAutoBalanceSelectedMembers.some(
        (selectedMember) => selectedMember.id === member.id
      )
    ) {
      return;
    }

    setAramAutoBalanceSelectedMembers([
      ...aramAutoBalanceSelectedMembers,
      member,
    ]);
    setAramAutoBalanceSearchName("");
    setAramAutoBalanceAnalysis(null);
    setIsAramAutoBalanceResultOpen(false);
  };

  const removeAramAutoBalanceMember = (memberId: string) => {
    setAramAutoBalanceSelectedMembers(
      aramAutoBalanceSelectedMembers.filter((member) => member.id !== memberId)
    );
    setAramAutoBalanceAnalysis(null);
    setIsAramAutoBalanceResultOpen(false);
  };

  const getAramAutoBalanceErrorMessage = () => {
    if (aramAutoBalanceSelectedMembers.length !== 10) {
      return `참여자 10명을 선택해야 합니다. 현재 ${aramAutoBalanceSelectedMembers.length}명`;
    }

    const uniqueMemberIds = new Set(
      aramAutoBalanceSelectedMembers.map((member) => member.id)
    );

    if (uniqueMemberIds.size !== 10) {
      return "중복된 참여자가 있습니다.";
    }

    return "";
  };

  const aramAutoBalanceErrorMessage = getAramAutoBalanceErrorMessage();

  const canAramAutoBalanceTeams = !aramAutoBalanceErrorMessage;

  const autoBalanceAramTeams = async () => {
    if (!canAramAutoBalanceTeams) {
      alert("참여자 10명을 중복 없이 선택해야 합니다.");
      return;
    }

    let phaseTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      setIsAramAutoBalancing(true);
      setAramAutoBalancePhase("팀 조합 계산 중...");
      setAramAutoBalanceAnalysis(null);

      phaseTimer = setTimeout(() => {
        setAramAutoBalancePhase("AI 분석 생성 중...");
      }, 700);

      const result = await analyzeAutoBalanceAramTeamsApi(
        aramAutoBalanceSelectedMembers.map((member) => ({
          ...member,
          aram_score: calculateAramMemberScore(member),
        })),
        aramAutoBalanceCustomRequest
      );

      setAramTeamSlots(result.teamSlots);
      setAramAutoBalanceAnalysis(result.analysis);
      setIsAramAutoBalanceResultOpen(true);
      setAramAces({
        team1: null,
        team2: null,
      });

      if (result.warnings.length > 0) {
        alert(result.warnings[0]);
      }
    } catch (error) {
      console.error("AI 증바람 팀짜기 실패:", error);

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("AI 증바람 팀짜기 실패");
      }
    } finally {
      if (phaseTimer) {
        clearTimeout(phaseTimer);
      }

      setIsAramAutoBalancing(false);
      setAramAutoBalancePhase("");
    }
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
    setAutoBalanceAnalysis(null);
    setIsAutoBalanceResultOpen(false);
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

    const rememberedLogin = getRememberedLogin();

    if (rememberedLogin) {
      setLoginId(rememberedLogin.id);
      setLoginPassword(rememberedLogin.password);
      setIsRememberLogin(true);
    }

    fetchMembers();
    fetchChampions();
  }, []);

  const login = async () => {
    if (!loginId.trim() || !loginPassword.trim()) {
      alert("아이디와 비밀번호를 입력해야 합니다.");
      return;
    }

    const { data, error } = await loginAccount(loginId.trim(), loginPassword);

    if (error || !data) {
      console.error("로그인 실패:", error);
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    setLoginSessionCookie(data.id, data.role);

    if (isRememberLogin) {
      saveRememberedLogin(loginId.trim(), loginPassword);
    } else {
      clearRememberedLogin();
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

    const { error } = await saveMatchRecordApi({
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
    const { data, error } = await fetchMatchRecordsApi();

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

    const { error } = await saveAramMatchRecordApi({
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
    const { data, error } = await fetchAramMatchRecordsApi();

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

    const { error } = await deleteAramMatchRecordApi(recordId);

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

    const { error } = await deleteMatchRecordApi(recordId);

    if (error) {
      console.error("내전 기록 삭제 실패:", error);
      alert("내전 기록 삭제 실패");
      return;
    }

    await fetchMatchRecords();
  };

  const memberStats = buildMemberStats(matchRecords);
  const aramMemberStats = buildAramMemberStats(aramMatchRecords);
  const totalMemberStats = buildTotalMemberStats(memberStats, aramMemberStats);

  const mostPickedChampionText = getMostPickedChampionText(matchRecords);
  const bestWinRatePlayerText = getBestWinRatePlayerText(memberStats);
  const aramMostPickedChampionText = getAramMostPickedChampionText(aramMatchRecords);
  const aramBestWinRatePlayerText = getAramBestWinRatePlayerText(aramMemberStats);
  const aramParticipantsCount = getAramParticipantsCount(aramMatchRecords);

  const filteredMemberStats = totalMemberStats.filter((stat) => {
    const keyword = memberStatsSearchName.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return stat.name.toLowerCase().includes(keyword);
  });

  const getMemberRolePriority = (memberRole: string | null) => {
    if (memberRole === "모임장") {
      return 0;
    }

    if (memberRole === "운영진") {
      return 1;
    }

    return 2;
  };

  const filteredMembers = members
    .filter((member) => {
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
        (member.sub_line ?? "").toLowerCase().includes(keyword) ||
        (member.memo ?? "").toLowerCase().includes(keyword)
      );
    })
    .sort((a, b) => {
      return getMemberRolePriority(a.member_role) - getMemberRolePriority(b.member_role);
    });

  const memberListPageSize = 10;
  const memberListTotalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / memberListPageSize)
  );
  const pagedMembers = filteredMembers.slice(
    (memberListPage - 1) * memberListPageSize,
    memberListPage * memberListPageSize
  );

  const canDeleteMember = loginUserRole === "모임장" || loginUserRole === "운영진";
  const canEditMember = loginUserRole === "모임장" || loginUserRole === "운영진";
  const canSetMemberRole = loginUserRole === "모임장";

  const canEditTargetMember = (member: Member) => {
    if (loginUserRole === "모임장") {
      return true;
    }

    if (loginUserRole === "운영진") {
      return member.member_role !== "모임장";
    }

    return false;
  };

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
              className={`w-full rounded-lg px-4 py-3 text-left ${activeMenu === "members"
                ? "bg-blue-600 text-white"
                : "text-slate-300"
                }`}
            >
              모임원 리스트
            </button>

            <button
              onClick={() => setActiveMenu("balance")}
              className={`w-full rounded-lg px-4 py-3 text-left ${activeMenu === "balance"
                ? "bg-blue-600 text-white"
                : "text-slate-300"
                }`}
            >
              협곡 내전 밸런스
            </button>

            <button
              onClick={() => setActiveMenu("record")}
              className={`w-full rounded-lg px-4 py-3 text-left ${activeMenu === "record"
                ? "bg-blue-600 text-white"
                : "text-slate-300"
                }`}
            >
              협곡 내전 기록
            </button>
            <button
              onClick={() => setActiveMenu("aramBalance")}
              className={`w-full rounded-lg px-4 py-3 text-left ${activeMenu === "aramBalance"
                ? "bg-blue-600 text-white"
                : "text-slate-300"
                }`}
            >
              증바람 내전 밸런스
            </button>

            <button
              onClick={() => setActiveMenu("aramRecord")}
              className={`w-full rounded-lg px-4 py-3 text-left ${activeMenu === "aramRecord"
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
              className={`w-full rounded-lg px-4 py-3 text-left ${activeMenu === "stats"
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

                {canDeleteMember && (
                  <button
                    onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
                  >
                    {isAddFormOpen ? "닫기" : "모임원 추가"}
                  </button>
                )}
              </div>

              <div
                className={`overflow-hidden transition-all duration-500 ${isAddFormOpen
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

                      <div className="grid grid-cols-[1fr_260px] gap-3">
                        <select
                          className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                          value={highestTier}
                          onChange={(e) => {
                            setHighestTier(e.target.value);

                            if (e.target.value === "언랭") {
                              setHighestTierDivision("4");
                            } else if (hasTierPoint(e.target.value)) {
                              setHighestTierDivision("0");
                            } else {
                              setHighestTierDivision("4");
                            }
                          }}
                        >
                          {TIER_NAMES.map((tier) => (
                            <option key={`highest-${tier}`}>{tier}</option>
                          ))}
                        </select>

                        {highestTier === "언랭" ? (
                          <div className="flex items-center rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 text-slate-500">
                            --
                          </div>
                        ) : hasTierPoint(highestTier) ? (
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                            placeholder="점수"
                            value={highestTierDivision}
                            onChange={(e) => setHighestTierDivision(e.target.value)}
                          />
                        ) : (
                          <select
                            className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                            value={highestTierDivision}
                            onChange={(e) => setHighestTierDivision(e.target.value)}
                          >
                            {TIER_DIVISIONS.map((division) => (
                              <option key={`highest-division-${division}`} value={division}>
                                {division}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        현재티어
                      </label>

                      <div className="grid grid-cols-[1fr_260px] gap-3">
                        <select
                          className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                          value={currentTier}
                          onChange={(e) => {
                            setCurrentTier(e.target.value);

                            if (e.target.value === "언랭") {
                              setCurrentTierDivision("4");
                            } else if (hasTierPoint(e.target.value)) {
                              setCurrentTierDivision("0");
                            } else {
                              setCurrentTierDivision("4");
                            }
                          }}
                        >
                          {TIER_NAMES.map((tier) => (
                            <option key={`current-${tier}`}>{tier}</option>
                          ))}
                        </select>

                        {currentTier === "언랭" ? (
                          <div className="flex items-center rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 text-slate-500">
                            --
                          </div>
                        ) : hasTierPoint(currentTier) ? (
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                            placeholder="점수"
                            value={currentTierDivision}
                            onChange={(e) => setCurrentTierDivision(e.target.value)}
                          />
                        ) : (
                          <select
                            className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                            value={currentTierDivision}
                            onChange={(e) => setCurrentTierDivision(e.target.value)}
                          >
                            {TIER_DIVISIONS.map((division) => (
                              <option key={`current-division-${division}`} value={division}>
                                {division}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        주라인
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                        value={mainLine}
                        onChange={(e) => {
                          setMainLine(e.target.value);

                          if (e.target.value === "상관없음") {
                            setSubLine("상관없음");
                          }
                        }}
                      >
                        {MEMBER_LINE_OPTIONS.map((line) => (
                          <option key={`main-line-${line}`}>{line}</option>
                        ))}
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
                        disabled={mainLine === "상관없음"}
                      >
                        {MEMBER_LINE_OPTIONS.map((line) => (
                          <option key={`sub-line-${line}`}>{line}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        게임 유형
                      </label>

                      <div className="flex flex-wrap gap-2">
                        {MEMBER_GAME_TYPES.map((gameType) => {
                          const isChecked = getMemberGameTypes(memo).includes(gameType);

                          return (
                            <button
                              key={`game-type-${gameType}`}
                              type="button"
                              onClick={() => setMemo(toggleMemberGameType(memo, gameType))}
                              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${isChecked
                                ? "border-blue-500 bg-blue-600 text-white"
                                : "border-slate-700 bg-[#111c2e] text-slate-300 hover:bg-slate-800"
                                }`}
                            >
                              {gameType}
                            </button>
                          );
                        })}
                      </div>
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
                  <div>
                    <h3 className="text-xl font-semibold">모임원 리스트</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      총 {members.length}명
                    </p>
                  </div>

                  <input
                    className="w-80 rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                    placeholder="이름 / 닉네임 / 티어 / 라인 검색"
                    value={memberListSearchName}
                    onChange={(e) => {
                      setMemberListSearchName(e.target.value);
                      setMemberListPage(1);
                    }}
                  />
                </div>

                <div className="min-h-[760px]">
                  <div className="grid grid-cols-2 gap-4">
                    {pagedMembers.map((member) => (
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
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${!member.member_role
                                    ? "bg-slate-600 text-white shadow"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    }`}
                                >
                                  없음
                                </button>

                                <button
                                  onClick={() => updateMemberRole(member.id, "모임장")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${member.member_role === "모임장"
                                    ? "bg-yellow-400 text-black shadow"
                                    : "text-yellow-300 hover:bg-yellow-900/40"
                                    }`}
                                >
                                  👑 모임장
                                </button>

                                <button
                                  onClick={() => updateMemberRole(member.id, "운영진")}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${member.member_role === "운영진"
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
                                  className={`rounded-full border px-3 py-1 text-xs font-black shadow-sm ${member.member_role === "모임장"
                                    ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
                                    : "border-blue-400 bg-blue-500/15 text-blue-300"
                                    }`}
                                >
                                  {member.member_role === "모임장" ? "👑 모임장" : "🛡 운영진"}
                                </span>
                              )
                            )}

                            {canEditMember && canEditTargetMember(member) && (
                              <button
                                onClick={() => startEditMember(member)}
                                className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600"
                              >
                                수정
                              </button>
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

                        {editingMemberId === member.id && (
                          <div className="mt-4 rounded-xl border border-blue-900/60 bg-blue-950/20 p-4">
                            <h4 className="mb-4 font-bold text-blue-300">모임원 정보 수정</h4>

                            <div className="space-y-3">
                              <input
                                className="w-full rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                placeholder="이름"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />

                              <input
                                className="w-full rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                placeholder="닉네임#태그"
                                value={editNickname}
                                onChange={(e) => setEditNickname(e.target.value)}
                              />

                              <div>
                                <label className="mb-2 block text-xs font-medium text-slate-300">
                                  최고티어
                                </label>

                                <div className="grid grid-cols-[1fr_120px] gap-3">
                                  <select
                                    className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                    value={editHighestTier}
                                    onChange={(e) => {
                                      setEditHighestTier(e.target.value);

                                      if (e.target.value === "언랭") {
                                        setEditHighestTierDivision("4");
                                      } else if (hasTierPoint(e.target.value)) {
                                        setEditHighestTierDivision("0");
                                      } else {
                                        setEditHighestTierDivision("4");
                                      }
                                    }}
                                  >
                                    {TIER_NAMES.map((tier) => (
                                      <option key={`edit-highest-${tier}`}>{tier}</option>
                                    ))}
                                  </select>

                                  {editHighestTier === "언랭" ? (
                                    <div className="flex items-center rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 text-slate-500">
                                      --
                                    </div>
                                  ) : hasTierPoint(editHighestTier) ? (
                                    <input
                                      type="number"
                                      min="0"
                                      className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                      placeholder="점수"
                                      value={editHighestTierDivision}
                                      onChange={(e) => setEditHighestTierDivision(e.target.value)}
                                    />
                                  ) : (
                                    <select
                                      className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                      value={editHighestTierDivision}
                                      onChange={(e) => setEditHighestTierDivision(e.target.value)}
                                    >
                                      {TIER_DIVISIONS.map((division) => (
                                        <option key={`edit-highest-division-${division}`} value={division}>
                                          {division}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-medium text-slate-300">
                                  현재티어
                                </label>

                                <div className="grid grid-cols-[1fr_120px] gap-3">
                                  <select
                                    className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                    value={editCurrentTier}
                                    onChange={(e) => {
                                      setEditCurrentTier(e.target.value);

                                      if (e.target.value === "언랭") {
                                        setEditCurrentTierDivision("4");
                                      } else if (hasTierPoint(e.target.value)) {
                                        setEditCurrentTierDivision("0");
                                      } else {
                                        setEditCurrentTierDivision("4");
                                      }
                                    }}
                                  >
                                    {TIER_NAMES.map((tier) => (
                                      <option key={`edit-current-${tier}`}>{tier}</option>
                                    ))}
                                  </select>

                                  {editCurrentTier === "언랭" ? (
                                    <div className="flex items-center rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 text-slate-500">
                                      --
                                    </div>
                                  ) : hasTierPoint(editCurrentTier) ? (
                                    <input
                                      type="number"
                                      min="0"
                                      className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                      placeholder="점수"
                                      value={editCurrentTierDivision}
                                      onChange={(e) => setEditCurrentTierDivision(e.target.value)}
                                    />
                                  ) : (
                                    <select
                                      className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                      value={editCurrentTierDivision}
                                      onChange={(e) => setEditCurrentTierDivision(e.target.value)}
                                    >
                                      {TIER_DIVISIONS.map((division) => (
                                        <option key={`edit-current-division-${division}`} value={division}>
                                          {division}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <select
                                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                  value={editMainLine}
                                  onChange={(e) => {
                                    setEditMainLine(e.target.value);

                                    if (e.target.value === "상관없음") {
                                      setEditSubLine("상관없음");
                                    }
                                  }}
                                >
                                  {MEMBER_LINE_OPTIONS.map((line) => (
                                    <option key={`edit-main-line-${line}`}>{line}</option>
                                  ))}
                                </select>

                                <select
                                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                                  value={editSubLine}
                                  onChange={(e) => setEditSubLine(e.target.value)}
                                  disabled={editMainLine === "상관없음"}
                                >
                                  {MEMBER_LINE_OPTIONS.map((line) => (
                                    <option key={`edit-sub-line-${line}`}>{line}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-medium text-slate-300">
                                  게임 유형
                                </label>

                                <div className="flex flex-wrap gap-2">
                                  {MEMBER_GAME_TYPES.map((gameType) => {
                                    const isChecked = getMemberGameTypes(editMemo).includes(gameType);

                                    return (
                                      <button
                                        key={`edit-game-type-${gameType}`}
                                        type="button"
                                        onClick={() => setEditMemo(toggleMemberGameType(editMemo, gameType))}
                                        className={`rounded-full border px-3 py-1 text-xs font-bold transition ${isChecked
                                          ? "border-blue-500 bg-blue-600 text-white"
                                          : "border-slate-700 bg-[#07101f] text-slate-300 hover:bg-slate-800"
                                          }`}
                                      >
                                        {gameType}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateMember(member.id)}
                                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
                                >
                                  저장
                                </button>

                                <button
                                  onClick={cancelEditMember}
                                  className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-600"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          </div>
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

                {filteredMembers.length > 0 && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setMemberListPage((page) => Math.max(1, page - 1))}
                        disabled={memberListPage === 1}
                        className={`rounded-lg border px-3 py-2 text-sm font-bold ${memberListPage === 1
                          ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
                          : "border-slate-700 bg-[#111c2e] text-slate-200 hover:bg-slate-800"
                          }`}
                      >
                        ◀
                      </button>

                      {Array.from({ length: memberListTotalPages }).map((_, index) => {
                        const page = index + 1;

                        return (
                          <button
                            key={`member-list-page-${page}`}
                            onClick={() => setMemberListPage(page)}
                            className={`rounded-lg border px-3 py-2 text-sm font-bold ${memberListPage === page
                              ? "border-blue-500 bg-blue-600 text-white"
                              : "border-slate-700 bg-[#111c2e] text-slate-300 hover:bg-slate-800"
                              }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        onClick={() =>
                          setMemberListPage((page) => Math.min(memberListTotalPages, page + 1))
                        }
                        disabled={memberListPage === memberListTotalPages}
                        className={`rounded-lg border px-3 py-2 text-sm font-bold ${memberListPage === memberListTotalPages
                          ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
                          : "border-slate-700 bg-[#111c2e] text-slate-200 hover:bg-slate-800"
                          }`}
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeMenu === "balance" && (
            <>
              <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold">협곡 내전 밸런스</h2>
                    <p className="mt-2 text-slate-400">
                      참여자 10명을 선택하고 추가 주문 사항을 반영해 팀을 자동으로
                      구성합니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={autoBalanceTeams}
                      disabled={!canAutoBalanceTeams || isAutoBalancing}
                      className={`h-[74px] w-[180px] rounded-xl px-5 py-3 font-semibold ${canAutoBalanceTeams && !isAutoBalancing
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "cursor-not-allowed bg-slate-700 text-slate-400"
                        }`}
                    >
                      {isAutoBalancing
                        ? autoBalancePhase || "AI 팀짜는 중..."
                        : "AI 자동 팀짜기"}
                    </button>

                    {autoBalanceAnalysis && (
                      <button
                        onClick={() => setIsAutoBalanceResultOpen(true)}
                        className="h-[74px] rounded-xl border border-emerald-700 bg-emerald-950/40 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-900/40"
                      >
                        결과 다시 보기
                      </button>
                    )}
                  </div>
                </div>

                <datalist id="member-list">
                  {members.map((member) => (
                    <option key={member.id} value={member.name} />
                  ))}
                </datalist>

                <div className="mt-6 grid grid-cols-2 gap-5">
                  <div className="flex h-[500px] flex-col rounded-2xl border border-slate-800 bg-[#07101f] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">참여자 검색</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          이름, 닉네임, 티어, 라인으로 검색 후 참가 버튼을 누르세요.
                        </p>

                        {autoBalanceErrorMessage && (
                          <p className="mt-2 text-sm font-semibold text-red-400">
                            {autoBalanceErrorMessage}
                          </p>
                        )}
                      </div>

                      <span className="rounded-full bg-slate-800 px-4 py-1 text-sm font-bold text-slate-300">
                        {autoBalanceSelectedMembers.length}/10
                      </span>
                    </div>

                    <input
                      className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                      placeholder="참여자 검색"
                      value={autoBalanceSearchName}
                      onChange={(e) => setAutoBalanceSearchName(e.target.value)}
                    />

                    <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {filteredAutoBalanceMembers.slice(0, 20).map((member) => (
                        <div
                          key={`auto-balance-search-${member.id}`}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111c2e] p-3 transition-all duration-300 hover:translate-x-1 hover:border-blue-500/60"
                        >
                          <div>
                            <p className="font-bold text-slate-100">{member.name}</p>
                            <p className="text-sm text-slate-400">{member.nickname}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              현재 {member.current_tier} · 최고 {member.highest_tier} · 주{" "}
                              {member.main_line} · 부 {member.sub_line}
                            </p>
                          </div>

                          <button
                            onClick={() => addAutoBalanceMember(member)}
                            disabled={autoBalanceSelectedMembers.length >= 10}
                            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${autoBalanceSelectedMembers.length < 10
                              ? "bg-blue-600 text-white hover:bg-blue-500"
                              : "cursor-not-allowed bg-slate-700 text-slate-400"
                              }`}
                          >
                            참가
                          </button>
                        </div>
                      ))}

                      {filteredAutoBalanceMembers.length === 0 && (
                        <div className="rounded-xl border border-slate-800 bg-[#111c2e] p-5 text-center text-sm text-slate-400">
                          검색 결과가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex h-[500px] flex-col rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-emerald-300">
                          참여자 목록
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          선택된 10명 기준으로 팀을 구성합니다.
                        </p>
                      </div>

                      {autoBalanceSelectedMembers.length > 0 && (
                        <button
                          onClick={() => {
                            setAutoBalanceSelectedMembers([]);
                            setAutoBalanceAnalysis(null);
                            setIsAutoBalanceResultOpen(false);
                          }}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                        >
                          전체 삭제
                        </button>
                      )}
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 [grid-auto-rows:74px]">
                      {autoBalanceSelectedMembers.map((member, index) => (
                        <div
                          key={`auto-balance-selected-${member.id}`}
                          className="flex h-[74px] animate-[slideIn_0.25s_ease-out] items-center justify-between rounded-xl border border-emerald-800/60 bg-[#102417] p-3 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
                              {index + 1}
                            </span>

                            <div>
                              <p className="font-bold text-white">{member.name}</p>
                              <p className="text-sm text-emerald-200">
                                {member.nickname}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => removeAutoBalanceMember(member.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/60 bg-red-950/40 text-sm font-black text-red-300 hover:bg-red-900"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {autoBalanceSelectedMembers.length === 0 && (
                        <div className="col-span-2 flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
                          왼쪽에서 참가 버튼을 누르면 여기에 추가됩니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-800 bg-[#07101f] p-5">
                  <label className="mb-3 block text-lg font-bold">추가 주문 사항</label>
                  <textarea
                    className="min-h-[120px] w-full resize-none rounded-xl border border-slate-700 bg-[#111c2e] px-4 py-3 text-sm outline-none"
                    placeholder={`예시)\n- 홍길동과 김철수는 같은 팀으로 보내줘\n- 박영희는 미드로 고정해줘\n- 이 두 사람은 서로 다른 팀으로 나눠줘\n- 최대한 주라인 위주로 배치해줘`}
                    value={autoBalanceCustomRequest}
                    onChange={(e) => {
                      setAutoBalanceCustomRequest(e.target.value);
                      setAutoBalanceAnalysis(null);
                      setIsAutoBalanceResultOpen(false);
                    }}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    추가 주문은 서버에서 제약조건으로 해석한 뒤 팀 조합 계산에 반영됩니다.
                  </p>
                </div>
              </div>

              <div
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-500 ${isAutoBalanceResultOpen
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
                  }`}
                onClick={() => setIsAutoBalanceResultOpen(false)}
              />

              <aside
                className={`fixed right-0 top-0 z-50 h-screen w-[1180px] max-w-[calc(100vw-16px)] border-l border-slate-800 bg-[#050b14] shadow-2xl transition-transform duration-500 ease-out ${isAutoBalanceResultOpen ? "translate-x-0" : "translate-x-full"
                  }`}
              >
                <button
                  onClick={() => setIsAutoBalanceResultOpen(!isAutoBalanceResultOpen)}
                  className="absolute left-[-36px] top-1/2 z-[60] flex h-28 w-9 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-emerald-700 bg-emerald-950/90 text-emerald-300 shadow-2xl hover:bg-emerald-900"
                >
                  <span className="text-xl font-black">
                    {isAutoBalanceResultOpen ? "›" : "‹"}
                  </span>
                </button>
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800 bg-[#08111f] px-6 py-5">
                    <div>
                      <p className="text-sm font-bold text-emerald-400">
                        AI 자동 팀짜기 결과
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-white">
                        {autoBalanceAnalysis?.title ?? "밸런스 결과"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsAutoBalanceResultOpen(false);
                          setAutoBalanceAnalysis(null);
                        }}
                        className="rounded-xl border border-slate-700 bg-[#111c2e] px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
                      >
                        다시 구성하기
                      </button>

                      <button
                        onClick={() => setIsAutoBalanceResultOpen(false)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#111c2e] text-xl font-black text-slate-300 hover:bg-slate-800"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-6">
                    <div className="mb-5 rounded-2xl border border-slate-800 bg-[#0b1424] p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-400">밸런스 결과</p>
                          <p
                            className={`mt-1 text-2xl font-black ${getTeamTotalScore("team1") === getTeamTotalScore("team2")
                              ? "text-slate-200"
                              : getTeamTotalScore("team1") > getTeamTotalScore("team2")
                                ? "text-blue-400"
                                : "text-red-400"
                              }`}
                          >
                            {getTeamResultText()}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-700 bg-[#07101f] px-4 py-3 text-right">
                          <p className="text-xs text-slate-400">현재 점수 차이</p>
                          <p className="mt-1 text-lg font-black text-emerald-300">
                            {Math.abs(
                              getTeamTotalScore("team1") - getTeamTotalScore("team2")
                            )}
                            점
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
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
                                key={`result-team1-${line}`}
                                className={`rounded-xl border p-4 ${diff > 0
                                  ? "border-blue-500/60 bg-blue-900/30"
                                  : "border-slate-800 bg-[#111c2e]"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                                      {line}
                                    </span>

                                    <div>
                                      <p className="font-black text-blue-200">
                                        {teamSlots.team1[line]}
                                      </p>
                                      {member && (
                                        <p className="mt-1 text-xs text-slate-400">
                                          {member.nickname} · 현재 {member.current_tier} · 주{" "}
                                          {member.main_line}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <span className="text-sm font-semibold text-blue-300">
                                    {score}점
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
                                key={`result-team2-${line}`}
                                className={`rounded-xl border p-4 ${diff < 0
                                  ? "border-red-500/60 bg-red-900/30"
                                  : "border-slate-800 bg-[#111c2e]"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold">
                                      {line}
                                    </span>

                                    <div>
                                      <p className="font-black text-red-200">
                                        {teamSlots.team2[line]}
                                      </p>
                                      {member && (
                                        <p className="mt-1 text-xs text-slate-400">
                                          {member.nickname} · 현재 {member.current_tier} · 주{" "}
                                          {member.main_line}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <span className="text-sm font-semibold text-red-300">
                                    {score}점
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {autoBalanceAnalysis ? (
                      <div className="mt-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
                        <div>
                          <p className="text-sm font-bold text-emerald-400">
                            AI 밸런스 리포트
                          </p>
                          <h3 className="mt-1 text-2xl font-black text-white">
                            {autoBalanceAnalysis.title}
                          </h3>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-800 bg-[#07101f] p-4">
                          <p className="text-sm leading-7 text-slate-200">
                            {autoBalanceAnalysis.summary}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                            <p className="text-sm font-bold text-emerald-300">
                              점수 밸런스
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {autoBalanceAnalysis.scorePoint}
                            </p>
                          </div>

                          <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
                            <p className="text-sm font-bold text-blue-300">1팀 포인트</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {autoBalanceAnalysis.team1Point}
                            </p>
                          </div>

                          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                            <p className="text-sm font-bold text-red-300">2팀 포인트</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {autoBalanceAnalysis.team2Point}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-5 gap-3">
                          {(autoBalanceAnalysis.lineAnalysis ?? []).map((line) => (
                            <div
                              key={`ai-line-analysis-${line.line}`}
                              className="rounded-xl border border-slate-800 bg-[#07101f] p-4"
                            >
                              <p className="text-sm font-black text-slate-100">
                                {line.line}
                              </p>
                              <p className="mt-2 text-sm font-bold text-emerald-300">
                                {line.title}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-slate-400">
                                {line.content}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 rounded-xl border border-yellow-900/50 bg-yellow-950/20 p-4">
                          <p className="text-sm font-bold text-yellow-300">핵심 변수</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {autoBalanceAnalysis.keyPoint}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
                            <p className="text-sm font-bold text-blue-300">
                              1팀 승리 플랜
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {autoBalanceAnalysis.winCondition.team1}
                            </p>
                          </div>

                          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                            <p className="text-sm font-bold text-red-300">
                              2팀 승리 플랜
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {autoBalanceAnalysis.winCondition.team2}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-2xl border border-yellow-900/60 bg-yellow-950/20 p-5">
                        <p className="text-sm font-bold text-yellow-300">
                          AI 분석 결과가 없습니다.
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          팀 배치는 생성됐지만 분석 응답이 비어있거나 실패했습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </>
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
                          className={`rounded-lg border px-2 py-2 ${lineResults[line] === "team1"
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
                          className={`rounded-lg border px-2 py-2 ${lineResults[line] === "team2"
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
                    className={`rounded-xl border px-4 py-3 font-bold ${matchResult === "team1"
                      ? "border-blue-400 bg-blue-600 text-white"
                      : "border-slate-700 bg-[#07101f] text-slate-300"
                      }`}
                  >
                    1팀 승리
                  </button>

                  <button
                    onClick={() => setMatchResult("team2")}
                    className={`rounded-xl border px-4 py-3 font-bold ${matchResult === "team2"
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
  <>
    <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">증바람 내전 밸런스</h2>
          <p className="mt-2 text-slate-400">
            참여자 10명을 선택하고 추가 주문 사항을 반영해 라인 없이 5대5 팀을 구성합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={autoBalanceAramTeams}
            disabled={!canAramAutoBalanceTeams || isAramAutoBalancing}
            className={`h-[74px] w-[180px] rounded-xl px-5 py-3 font-semibold ${
              canAramAutoBalanceTeams && !isAramAutoBalancing
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "cursor-not-allowed bg-slate-700 text-slate-400"
            }`}
          >
            {isAramAutoBalancing
              ? aramAutoBalancePhase || "AI 팀짜는 중..."
              : "AI 자동 팀짜기"}
          </button>

          {aramAutoBalanceAnalysis && (
            <button
              onClick={() => setIsAramAutoBalanceResultOpen(true)}
              className="h-[74px] rounded-xl border border-emerald-700 bg-emerald-950/40 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-900/40"
            >
              결과 다시 보기
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div className="flex h-[500px] flex-col rounded-2xl border border-slate-800 bg-[#07101f] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">참여자 검색</h3>
              <p className="mt-1 text-sm text-slate-400">
                이름, 닉네임, 티어로 검색 후 참가 버튼을 누르세요.
              </p>

              {aramAutoBalanceErrorMessage && (
                <p className="mt-2 text-sm font-semibold text-red-400">
                  {aramAutoBalanceErrorMessage}
                </p>
              )}
            </div>

            <span className="rounded-full bg-slate-800 px-4 py-1 text-sm font-bold text-slate-300">
              {aramAutoBalanceSelectedMembers.length}/10
            </span>
          </div>

          <input
            className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
            placeholder="참여자 검색"
            value={aramAutoBalanceSearchName}
            onChange={(e) => setAramAutoBalanceSearchName(e.target.value)}
          />

          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredAramAutoBalanceMembers.slice(0, 20).map((member) => (
              <div
                key={`aram-auto-balance-search-${member.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#111c2e] p-3 transition-all duration-300 hover:translate-x-1 hover:border-blue-500/60"
              >
                <div>
                  <p className="font-bold text-slate-100">{member.name}</p>
                  <p className="text-sm text-slate-400">{member.nickname}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    현재 {member.current_tier} · 최고 {member.highest_tier} · 증바 점수{" "}
                    {calculateAramMemberScore(member)}
                  </p>
                </div>

                <button
                  onClick={() => addAramAutoBalanceMember(member)}
                  disabled={aramAutoBalanceSelectedMembers.length >= 10}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    aramAutoBalanceSelectedMembers.length < 10
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "cursor-not-allowed bg-slate-700 text-slate-400"
                  }`}
                >
                  참가
                </button>
              </div>
            ))}

            {filteredAramAutoBalanceMembers.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-[#111c2e] p-5 text-center text-sm text-slate-400">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="flex h-[500px] flex-col rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-emerald-300">
                참여자 목록
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                선택된 10명 기준으로 증바람 팀을 구성합니다.
              </p>
            </div>

            {aramAutoBalanceSelectedMembers.length > 0 && (
              <button
                onClick={() => {
                  setAramAutoBalanceSelectedMembers([]);
                  setAramAutoBalanceAnalysis(null);
                  setIsAramAutoBalanceResultOpen(false);
                }}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                전체 삭제
              </button>
            )}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 [grid-auto-rows:74px]">
            {aramAutoBalanceSelectedMembers.map((member, index) => (
              <div
                key={`aram-auto-balance-selected-${member.id}`}
                className="flex h-[74px] animate-[slideIn_0.25s_ease-out] items-center justify-between rounded-xl border border-emerald-800/60 bg-[#102417] p-3 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
                    {index + 1}
                  </span>

                  <div>
                    <p className="font-bold text-white">{member.name}</p>
                    <p className="text-sm text-emerald-200">
                      {member.nickname}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeAramAutoBalanceMember(member.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/60 bg-red-950/40 text-sm font-black text-red-300 hover:bg-red-900"
                >
                  ×
                </button>
              </div>
            ))}

            {aramAutoBalanceSelectedMembers.length === 0 && (
              <div className="col-span-2 flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
                왼쪽에서 참가 버튼을 누르면 여기에 추가됩니다.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-800 bg-[#07101f] p-5">
        <label className="mb-3 block text-lg font-bold">추가 주문 사항</label>
        <textarea
          className="min-h-[120px] w-full resize-none rounded-xl border border-slate-700 bg-[#111c2e] px-4 py-3 text-sm outline-none"
          placeholder={`예시)\n- 홍길동과 김철수는 같은 팀으로 보내줘\n- 박영희는 1팀으로 보내줘\n- 이 두 사람은 서로 다른 팀으로 나눠줘\n- 상위 티어가 한 팀에 몰리지 않게 해줘`}
          value={aramAutoBalanceCustomRequest}
          onChange={(e) => {
            setAramAutoBalanceCustomRequest(e.target.value);
            setAramAutoBalanceAnalysis(null);
            setIsAramAutoBalanceResultOpen(false);
          }}
        />

        <p className="mt-2 text-xs text-slate-500">
          증바람은 라인 구분 없이 티어와 점수를 기준으로 팀을 나눕니다.
        </p>
      </div>
    </div>

    <div
      className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-500 ${
        isAramAutoBalanceResultOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      onClick={() => setIsAramAutoBalanceResultOpen(false)}
    />

    <aside
      className={`fixed right-0 top-0 z-50 h-screen w-[1180px] max-w-[calc(100vw-16px)] border-l border-slate-800 bg-[#050b14] shadow-2xl transition-transform duration-500 ease-out ${
        isAramAutoBalanceResultOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <button
        onClick={() =>
          setIsAramAutoBalanceResultOpen(!isAramAutoBalanceResultOpen)
        }
        className="absolute left-[-36px] top-1/2 z-[60] flex h-28 w-9 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-emerald-700 bg-emerald-950/90 text-emerald-300 shadow-2xl hover:bg-emerald-900"
      >
        <span className="text-xl font-black">
          {isAramAutoBalanceResultOpen ? "›" : "‹"}
        </span>
      </button>

      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#08111f] px-6 py-5">
          <div>
            <p className="text-sm font-bold text-emerald-400">
              AI 증바람 팀짜기 결과
            </p>
            <h3 className="mt-1 text-2xl font-black text-white">
              {aramAutoBalanceAnalysis?.title ?? "증바람 밸런스 결과"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAramAutoBalanceResultOpen(false);
                setAramAutoBalanceAnalysis(null);
              }}
              className="rounded-xl border border-slate-700 bg-[#111c2e] px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
            >
              다시 구성하기
            </button>

            <button
              onClick={() => setIsAramAutoBalanceResultOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#111c2e] text-xl font-black text-slate-300 hover:bg-slate-800"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-5 rounded-2xl border border-slate-800 bg-[#0b1424] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400">밸런스 결과</p>
                <p
                  className={`mt-1 text-2xl font-black ${
                    getAramTeamTotalScore("team1") ===
                    getAramTeamTotalScore("team2")
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

              <div className="rounded-xl border border-slate-700 bg-[#07101f] px-4 py-3 text-right">
                <p className="text-xs text-slate-400">현재 점수 차이</p>
                <p className="mt-1 text-lg font-black text-emerald-300">
                  {Math.abs(
                    getAramTeamTotalScore("team1") -
                      getAramTeamTotalScore("team2")
                  )}
                  점
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {(["team1", "team2"] as TeamKey[]).map((team) => (
              <div
                key={`aram-result-${team}`}
                className={`rounded-2xl border p-5 ${
                  team === "team1"
                    ? "border-blue-900/60 bg-blue-950/30"
                    : "border-red-900/60 bg-red-950/30"
                }`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <h4
                    className={`text-lg font-bold ${
                      team === "team1" ? "text-blue-300" : "text-red-300"
                    }`}
                  >
                    {team === "team1" ? "1팀" : "2팀"}
                  </h4>

                  <span
                    className={`rounded-full px-4 py-1 text-sm font-semibold ${
                      team === "team1"
                        ? "bg-blue-900 text-blue-200"
                        : "bg-red-900 text-red-200"
                    }`}
                  >
                    총점 {getAramTeamTotalScore(team)}
                  </span>
                </div>

                <div className="space-y-3">
                  {aramTeamSlots[team].map((value, index) => {
                    const member = getAramSlotMember(team, index);
                    const score = getAramSlotScore(team, index);
                    const isAce = getAramAceIndex(team) === index;

                    return (
                      <div
                        key={`aram-result-${team}-${index}`}
                        className={`rounded-xl border p-4 ${
                          isAce
                            ? "border-yellow-400 bg-yellow-500/15"
                            : "border-slate-800 bg-[#111c2e]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-black ${
                                  team === "team1"
                                    ? "text-blue-200"
                                    : "text-red-200"
                                }`}
                              >
                                {value}
                              </p>

                              {isAce && (
                                <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-black text-black">
                                  ACE
                                </span>
                              )}
                            </div>

                            {member && (
                              <p className="mt-1 text-xs text-slate-400">
                                {member.nickname} · 현재 {member.current_tier} · 최고{" "}
                                {member.highest_tier}
                              </p>
                            )}
                          </div>

                          <span
                            className={`text-sm font-semibold ${
                              team === "team1"
                                ? "text-blue-300"
                                : "text-red-300"
                            }`}
                          >
                            {score}점
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {aramAutoBalanceAnalysis && (
            <div className="mt-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
              <div>
                <p className="text-sm font-bold text-emerald-400">
                  AI 증바람 밸런스 리포트
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  {aramAutoBalanceAnalysis.title}
                </h3>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-[#07101f] p-4">
                <p className="text-sm leading-7 text-slate-200">
                  {aramAutoBalanceAnalysis.summary}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                  <p className="text-sm font-bold text-emerald-300">
                    점수 밸런스
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {aramAutoBalanceAnalysis.scorePoint}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
                  <p className="text-sm font-bold text-blue-300">1팀 포인트</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {aramAutoBalanceAnalysis.team1Point}
                  </p>
                </div>

                <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                  <p className="text-sm font-bold text-red-300">2팀 포인트</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {aramAutoBalanceAnalysis.team2Point}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-900/50 bg-purple-950/20 p-4">
                  <p className="text-sm font-bold text-purple-300">티어 분포</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {aramAutoBalanceAnalysis.tierPoint}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-yellow-900/50 bg-yellow-950/20 p-4">
                <p className="text-sm font-bold text-yellow-300">핵심 변수</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {aramAutoBalanceAnalysis.keyPoint}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
                  <p className="text-sm font-bold text-blue-300">
                    1팀 승리 플랜
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {aramAutoBalanceAnalysis.winCondition.team1}
                  </p>
                </div>

                <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                  <p className="text-sm font-bold text-red-300">
                    2팀 승리 플랜
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {aramAutoBalanceAnalysis.winCondition.team2}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  </>
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
                    className={`rounded-xl border px-4 py-3 font-bold ${aramMatchResult === "team1"
                      ? "border-blue-400 bg-blue-600 text-white"
                      : "border-slate-700 bg-[#07101f] text-slate-300"
                      }`}
                  >
                    1팀 승리
                  </button>

                  <button
                    onClick={() => setAramMatchResult("team2")}
                    className={`rounded-xl border px-4 py-3 font-bold ${aramMatchResult === "team2"
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
                  className={`rounded-xl border px-5 py-3 font-bold ${statsView === "records"
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-slate-700 bg-[#07101f] text-slate-300"
                    }`}
                >
                  내전 기록 리스트
                </button>

                <button
                  onClick={() => setStatsView("aramRecords")}
                  className={`rounded-xl border px-5 py-3 font-bold ${statsView === "aramRecords"
                    ? "border-purple-500 bg-purple-600 text-white"
                    : "border-slate-700 bg-[#07101f] text-slate-300"
                    }`}
                >
                  증바 내전 기록 리스트
                </button>

                <button
                  onClick={() => setStatsView("members")}
                  className={`rounded-xl border px-5 py-3 font-bold ${statsView === "members"
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
                            className={`rounded-xl border px-5 py-3 text-right ${record.match_result === "team1"
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
                            className={`rounded-xl border p-4 ${record.line_results[line] === "team1"
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
                            className={`rounded-xl border px-5 py-3 text-right ${record.match_result === "team1"
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
                    const canyonStat = memberStats.find((item) => item.name === stat.name);

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
                                협곡 {canyonStat?.games ?? 0}전
                              </span>

                              <span className="rounded-lg bg-blue-900/50 px-4 py-2 text-lg font-bold text-blue-200">
                                {canyonStat?.wins ?? 0}승
                              </span>

                              <span className="rounded-lg bg-red-900/50 px-4 py-2 text-lg font-bold text-red-200">
                                {canyonStat?.losses ?? 0}패
                              </span>

                              <span className="rounded-lg bg-emerald-900/40 px-4 py-2 text-lg font-bold text-emerald-200">
                                승률 {getWinRate(canyonStat?.wins ?? 0, canyonStat?.games ?? 0)}%
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
                          className={`overflow-hidden transition-all duration-500 ${isExpanded
                            ? "mt-5 max-h-[2200px] opacity-100"
                            : "mt-0 max-h-0 opacity-0"
                            }`}
                        >
                          <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-xl border border-slate-800 bg-[#07101f] p-4">
                              <h4 className="mb-4 font-bold">협곡 챔피언별 전적</h4>

                              <div className="space-y-3">
                                {Object.entries(canyonStat?.championStats ?? {})
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
                                {Object.entries(canyonStat?.lineStats ?? {})
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
                                {Object.entries(canyonStat?.opponentStats ?? {})
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
    </main >
  );
}
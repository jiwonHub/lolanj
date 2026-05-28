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
  team1: Record<LineKey, { player: string; champion: string }>;
  team2: Record<LineKey, { player: string; champion: string }>;
  line_results: Record<LineKey, ResultKey>;
  match_result: ResultKey;
  created_at: string;
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

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [tag, setTag] = useState("");
  const [highestTier, setHighestTier] = useState("플레티넘");
  const [currentTier, setCurrentTier] = useState("골드");
  const [mainLine, setMainLine] = useState("미드");
  const [subLine, setSubLine] = useState("탑");
  const [memo, setMemo] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"members" | "balance" | "record" | "stats">("members");
  const [champions, setChampions] = useState<Champion[]>([]);
  const [ddragonVersion, setDdragonVersion] = useState("");

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
  
  const [matchResult, setMatchResult] = useState<ResultKey>("");
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([]);

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
      name,
      nickname: fullNickname,
      highest_tier: highestTier,
      current_tier: currentTier,
      main_line: mainLine,
      sub_line: subLine,
      memo,
      is_active: true,
    });

    if (error) {
      console.error("members 저장 실패:", error);
      alert("저장 실패");
      return;
    }

    setName("");
    setNickname("");
    setTag("");
    setMemo("");
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

    const currentTierScore = tierScores[member.current_tier] ?? 0;
    const highestTierScore = tierScores[member.highest_tier] ?? 0;

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
  useEffect(() => {
    fetchMembers();
    fetchChampions();
  }, []);

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
  
    const { error } = await supabase.from("match_records").insert({
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

  return (
    <main className="min-h-screen bg-[#050b14] text-white">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-slate-800 bg-[#08111f] p-6">
          <h1 className="text-2xl font-bold">롤면 뭐하니</h1>
          <p className="mt-1 text-sm text-slate-400">모임원 관리</p>

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
              내전 밸런스
            </button>

            <button
              onClick={() => setActiveMenu("record")}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activeMenu === "record"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300"
              }`}
            >
              내전 기록
            </button>
            <button
              onClick={() => {
                setActiveMenu("stats");
                fetchMatchRecords();
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
                          className="w-32 rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
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
                      <select
                        className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                        value={highestTier}
                        onChange={(e) => setHighestTier(e.target.value)}
                      >
                        <option>아이언</option>
                        <option>브론즈</option>
                        <option>실버</option>
                        <option>골드</option>
                        <option>플레티넘</option>
                        <option>에메랄드</option>
                        <option>다이아몬드</option>
                        <option>마스터</option>
                        <option>그랜드마스터</option>
                        <option>챌린저</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        현재티어
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-700 bg-[#111c2e] px-4 py-3 outline-none"
                        value={currentTier}
                        onChange={(e) => setCurrentTier(e.target.value)}
                      >
                        <option>아이언</option>
                        <option>브론즈</option>
                        <option>실버</option>
                        <option>골드</option>
                        <option>플레티넘</option>
                        <option>에메랄드</option>
                        <option>다이아몬드</option>
                        <option>마스터</option>
                        <option>그랜드마스터</option>
                        <option>챌린저</option>
                      </select>
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
                <h3 className="mb-5 text-xl font-semibold">모임원 리스트</h3>

                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl border border-slate-800 bg-[#111c2e] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{member.nickname}</p>
                          <p className="text-sm text-slate-400">
                            {member.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-green-900 px-3 py-1 text-xs text-green-300">
                            활동 중
                          </span>

                          <button
                            onClick={() => deleteMember(member.id)}
                            className="rounded-full bg-red-900 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-1 text-sm text-slate-300">
                        <div className="flex gap-4">
                          <p>현재 티어: {member.current_tier}</p>
                          <p>최고 티어: {member.highest_tier}</p>
                        </div>

                        <div className="flex gap-4">
                          <p>주 라인: {member.main_line}</p>
                          <p>부 라인: {member.sub_line}</p>
                        </div>
                      </div>

                      {member.memo && (
                        <p className="mt-3 text-sm text-slate-400">
                          메모: {member.memo}
                        </p>
                      )}
                    </div>
                  ))}

                  {members.length === 0 && (
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
                  <h2 className="text-3xl font-bold">내전 밸런스</h2>
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
        <h2 className="text-3xl font-bold">내전 기록</h2>
        <p className="mt-2 text-slate-400">
          내전 밸런스 정보를 가져와 챔피언과 라인을 기록합니다.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={importBalanceToRecord}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
        >
          내전 밸런스 정보 가져오기
        </button>

        <button
          onClick={saveMatchRecord}
          className="rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-500"
        >
          저장하기
        </button>
      </div>

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
        라인별 우세와 최종 승리팀을 기록합니다.
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
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="소환사명"
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
                      {line}
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
                      {line}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
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
                  className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 outline-none"
                  placeholder="소환사명"
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
{activeMenu === "stats" && (
  <div className="rounded-2xl border border-slate-800 bg-[#0b1424] p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold">통계</h2>
        <p className="mt-2 text-slate-400">
          저장된 내전 기록을 확인합니다.
        </p>
      </div>

      <button
        onClick={fetchMatchRecords}
        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
      >
        새로고침
      </button>
    </div>

    <div className="mt-8 grid grid-cols-4 gap-4">
      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <p className="text-sm text-slate-400">총 내전 수</p>
        <p className="mt-2 text-3xl font-bold">{matchRecords.length}</p>
      </div>

      <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5">
        <p className="text-sm text-blue-300">1팀 승리</p>
        <p className="mt-2 text-3xl font-bold text-blue-300">
          {matchRecords.filter((record) => record.match_result === "team1").length}
        </p>
      </div>

      <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
        <p className="text-sm text-red-300">2팀 승리</p>
        <p className="mt-2 text-3xl font-bold text-red-300">
          {matchRecords.filter((record) => record.match_result === "team2").length}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5">
        <p className="text-sm text-slate-400">최근 기록</p>
        <p className="mt-2 text-lg font-bold">
          {matchRecords[0]
            ? new Date(matchRecords[0].created_at).toLocaleString("ko-KR")
            : "없음"}
        </p>
      </div>
    </div>

    <div className="mt-8 space-y-5">
      {matchRecords.map((record, index) => (
        <div
          key={record.id}
          className="rounded-2xl border border-slate-800 bg-[#111c2e] p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">
                내전 기록 #{matchRecords.length - index}
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

              <button
                onClick={() => deleteMatchRecord(record.id)}
                className="rounded-xl bg-red-900 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-800"
              >
                삭제
              </button>
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
                  <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-3">
                    <p className="font-bold text-blue-300">1팀</p>
                    <p className="mt-1 text-slate-200">
                      {record.team1[line].player}
                    </p>
                    <p className="text-slate-400">
                      {record.team1[line].champion}
                    </p>
                  </div>

                  <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
                    <p className="font-bold text-red-300">2팀</p>
                    <p className="mt-1 text-slate-200">
                      {record.team2[line].player}
                    </p>
                    <p className="text-slate-400">
                      {record.team2[line].champion}
                    </p>
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
  </div>
)}
        </section>
      </div>
    </main>
  );
}
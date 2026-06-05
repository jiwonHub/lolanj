import type { LineKey, Member, TeamKey } from "../../shared/types";

export type AnalyzeAutoBalanceTeamsResponse = {
    teamSlots: Record<TeamKey, Record<LineKey, string>>;
    analysis: {
        title: string;
        summary: string;
        scorePoint: string;
        team1Point: string;
        team2Point: string;
        lineAnalysis: {
            line: LineKey;
            title: string;
            content: string;
        }[];
        keyPoint: string;
        winCondition: {
            team1: string;
            team2: string;
        };
    } | null;
    warnings: string[];
};

export type AutoBalanceMember = Member & {
    line_scores: Record<LineKey, number>;
};

export const analyzeAutoBalanceTeamsApi = async (
    members: AutoBalanceMember[],
    customRequest: string
) => {
    const response = await fetch("/api/analyze-auto-balance", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            customRequest,
            members: members.map((member) => ({
                id: member.id,
                name: member.name,
                nickname: member.nickname,
                highest_tier: member.highest_tier,
                current_tier: member.current_tier,
                main_line: member.main_line,
                sub_line: member.sub_line,
                memo: member.memo,
                line_scores: member.line_scores,
            })),
        }),
    });

    const responseText = await response.text();

    if (!responseText) {
        throw new Error(
            `AI 자동 팀짜기 API 응답이 비어있습니다. status=${response.status}`
        );
    }

    let data: AnalyzeAutoBalanceTeamsResponse | null = null;

    try {
        data = JSON.parse(responseText) as AnalyzeAutoBalanceTeamsResponse;
    } catch {
        console.error("AI 자동 팀짜기 API 원본 응답:", responseText);
        throw new Error(
            `AI 자동 팀짜기 API 응답이 JSON 형식이 아닙니다. status=${response.status}`
        );
    }

    if (!response.ok) {
        throw new Error(data.warnings?.[0] ?? "AI 자동 팀짜기 실패");
    }

    return data;
};

export type AnalyzeAutoBalanceAramTeamsResponse = {
    teamSlots: Record<TeamKey, string[]>;
    analysis: {
      title: string;
      summary: string;
      scorePoint: string;
      team1Point: string;
      team2Point: string;
      tierPoint: string;
      keyPoint: string;
      winCondition: {
        team1: string;
        team2: string;
      };
    } | null;
    warnings: string[];
  };
  
  export type AutoBalanceAramMember = Member & {
    aram_score: number;
  };
  
  export const analyzeAutoBalanceAramTeamsApi = async (
    members: AutoBalanceAramMember[],
    customRequest: string
  ) => {
    const response = await fetch("/api/analyze-auto-balance-aram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customRequest,
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          nickname: member.nickname,
          highest_tier: member.highest_tier,
          current_tier: member.current_tier,
          main_line: member.main_line,
          sub_line: member.sub_line,
          memo: member.memo,
          aram_score: member.aram_score,
        })),
      }),
    });
  
    const responseText = await response.text();
  
    if (!responseText) {
      throw new Error(
        `AI 증바람 팀짜기 API 응답이 비어있습니다. status=${response.status}`
      );
    }
  
    let data: AnalyzeAutoBalanceAramTeamsResponse | null = null;
  
    try {
      data = JSON.parse(responseText) as AnalyzeAutoBalanceAramTeamsResponse;
    } catch {
      console.error("AI 증바람 팀짜기 API 원본 응답:", responseText);
      throw new Error(
        `AI 증바람 팀짜기 API 응답이 JSON 형식이 아닙니다. status=${response.status}`
      );
    }
  
    if (!response.ok) {
      throw new Error(data.warnings?.[0] ?? "AI 증바람 팀짜기 실패");
    }
  
    return data;
  };
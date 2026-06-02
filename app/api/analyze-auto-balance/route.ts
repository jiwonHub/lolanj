export const runtime = "nodejs";

type LineKey = "탑" | "정글" | "미드" | "원딜" | "서폿";
type TeamKey = "team1" | "team2";

type RequestMember = {
  id: string;
  name: string;
  nickname: string;
  highest_tier: string;
  current_tier: string;
  main_line: string;
  sub_line: string | null;
  memo: string | null;
  line_scores: Record<LineKey, number>;
};

type TeamSlots = Record<TeamKey, Record<LineKey, string>>;

type BalanceAnalysis = {
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
  };
  
  type AnalyzeAutoBalanceTeamsResponse = {
    teamSlots: TeamSlots;
    analysis: BalanceAnalysis;
    warnings: string[];
  };
  
  type OpenAiAnalysisResponse = {
    analysis: BalanceAnalysis;
    warnings: string[];
  };

const LINES: LineKey[] = ["탑", "정글", "미드", "원딜", "서폿"];
const TEAMS: TeamKey[] = ["team1", "team2"];

const emptyTeamSlots: TeamSlots = {
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
};

const responseSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      analysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          scorePoint: { type: "string" },
          team1Point: { type: "string" },
          team2Point: { type: "string" },
          lineAnalysis: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                line: {
                  type: "string",
                  enum: ["탑", "정글", "미드", "원딜", "서폿"],
                },
                title: { type: "string" },
                content: { type: "string" },
              },
              required: ["line", "title", "content"],
            },
          },
          keyPoint: { type: "string" },
          winCondition: {
            type: "object",
            additionalProperties: false,
            properties: {
              team1: { type: "string" },
              team2: { type: "string" },
            },
            required: ["team1", "team2"],
          },
        },
        required: [
          "title",
          "summary",
          "scorePoint",
          "team1Point",
          "team2Point",
          "lineAnalysis",
          "keyPoint",
          "winCondition",
        ],
      },
      warnings: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    required: ["analysis", "warnings"],
  };

const getOutputText = (data: any) => {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const text = data.output
    ?.flatMap((item: any) => item.content ?? [])
    ?.find((content: any) => content.type === "output_text")?.text;

  return typeof text === "string" ? text : "";
};

const getMemberByName = (members: RequestMember[], name: string) => {
  return members.find((member) => member.name === name) ?? null;
};

const getMemberLineScore = (member: RequestMember, line: LineKey) => {
  const score = member.line_scores?.[line];

  if (typeof score !== "number" || Number.isNaN(score)) {
    return 0;
  }

  return score;
};

const getTeamScore = (
  members: RequestMember[],
  teamSlots: TeamSlots,
  team: TeamKey
) => {
  return LINES.reduce((total, line) => {
    const member = getMemberByName(members, teamSlots[team][line]);

    if (!member) {
      return total;
    }

    return total + getMemberLineScore(member, line);
  }, 0);
};

const getLinePreferencePenalty = (member: RequestMember, line: LineKey) => {
  if (member.main_line === line) {
    return 0;
  }

  if (member.sub_line === line) {
    return 30;
  }

  if (member.main_line === "상관없음") {
    return 10;
  }

  if (member.sub_line === "상관없음") {
    return 40;
  }

  return 120;
};

const getPreferencePenalty = (
  members: RequestMember[],
  teamSlots: TeamSlots
) => {
  return TEAMS.reduce((teamTotal, team) => {
    return (
      teamTotal +
      LINES.reduce((lineTotal, line) => {
        const member = getMemberByName(members, teamSlots[team][line]);

        if (!member) {
          return lineTotal + 99999;
        }

        return lineTotal + getLinePreferencePenalty(member, line);
      }, 0)
    );
  }, 0);
};

const getLineDiffTotal = (
  members: RequestMember[],
  teamSlots: TeamSlots
) => {
  return LINES.reduce((total, line) => {
    const team1Member = getMemberByName(members, teamSlots.team1[line]);
    const team2Member = getMemberByName(members, teamSlots.team2[line]);

    if (!team1Member || !team2Member) {
      return total + 99999;
    }

    return (
      total +
      Math.abs(
        getMemberLineScore(team1Member, line) -
          getMemberLineScore(team2Member, line)
      )
    );
  }, 0);
};

const getMaxLineDiff = (
  members: RequestMember[],
  teamSlots: TeamSlots
) => {
  return Math.max(
    ...LINES.map((line) => {
      const team1Member = getMemberByName(members, teamSlots.team1[line]);
      const team2Member = getMemberByName(members, teamSlots.team2[line]);

      if (!team1Member || !team2Member) {
        return 99999;
      }

      return Math.abs(
        getMemberLineScore(team1Member, line) -
          getMemberLineScore(team2Member, line)
      );
    })
  );
};

const getPermutations = <T,>(items: T[]): T[][] => {
  if (items.length === 0) {
    return [[]];
  }

  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];

    return getPermutations(rest).map((permutation) => [item, ...permutation]);
  });
};

const getCombinations = <T,>(items: T[], size: number): T[][] => {
  if (size === 0) {
    return [[]];
  }

  if (items.length < size) {
    return [];
  }

  const [first, ...rest] = items;

  return [
    ...getCombinations(rest, size - 1).map((combination) => [
      first,
      ...combination,
    ]),
    ...getCombinations(rest, size),
  ];
};

const createTeamSlots = (
  team1Members: RequestMember[],
  team2Members: RequestMember[]
): TeamSlots => {
  return {
    team1: {
      탑: team1Members[0].name,
      정글: team1Members[1].name,
      미드: team1Members[2].name,
      원딜: team1Members[3].name,
      서폿: team1Members[4].name,
    },
    team2: {
      탑: team2Members[0].name,
      정글: team2Members[1].name,
      미드: team2Members[2].name,
      원딜: team2Members[3].name,
      서폿: team2Members[4].name,
    },
  };
};

const calculateBestTeamSlots = (members: RequestMember[]) => {
  let bestTeamSlots: TeamSlots | null = null;
  let bestFinalScore = Number.MAX_SAFE_INTEGER;

  const team1Combinations = getCombinations(members, 5);

  team1Combinations.forEach((team1Members) => {
    const team1NameSet = new Set(team1Members.map((member) => member.name));
    const team2Members = members.filter(
      (member) => !team1NameSet.has(member.name)
    );

    const team1Permutations = getPermutations(team1Members);
    const team2Permutations = getPermutations(team2Members);

    team1Permutations.forEach((team1Permutation) => {
      team2Permutations.forEach((team2Permutation) => {
        const teamSlots = createTeamSlots(team1Permutation, team2Permutation);

        const team1Score = getTeamScore(members, teamSlots, "team1");
        const team2Score = getTeamScore(members, teamSlots, "team2");
        const scoreDiff = Math.abs(team1Score - team2Score);
        const lineDiffTotal = getLineDiffTotal(members, teamSlots);
        const maxLineDiff = getMaxLineDiff(members, teamSlots);
        const preferencePenalty = getPreferencePenalty(members, teamSlots);

        const finalScore =
          scoreDiff * 1_000_000 +
          maxLineDiff * 10_000 +
          lineDiffTotal * 100 +
          preferencePenalty;

        if (finalScore < bestFinalScore) {
          bestFinalScore = finalScore;
          bestTeamSlots = teamSlots;
        }
      });
    });
  });

  return bestTeamSlots;
};

const validateMembers = (members: RequestMember[]) => {
  if (!Array.isArray(members) || members.length !== 10) {
    return "AI 자동 팀짜기는 정확히 10명의 모임원이 필요합니다.";
  }

  const uniqueNames = new Set(members.map((member) => member.name));

  if (uniqueNames.size !== 10) {
    return "중복된 모임원 이름이 있습니다.";
  }

  const hasInvalidLineScores = members.some((member) => {
    return LINES.some((line) => {
      return typeof member.line_scores?.[line] !== "number";
    });
  });

  if (hasInvalidLineScores) {
    return "라인별 점수 정보가 없습니다.";
  }

  return "";
};

const buildMemberSummary = (
  members: RequestMember[],
  teamSlots: TeamSlots,
  team: TeamKey
) => {
  return LINES.map((line) => {
    const member = getMemberByName(members, teamSlots[team][line]);

    return {
      line,
      name: member?.name ?? "",
      nickname: member?.nickname ?? "",
      current_tier: member?.current_tier ?? "",
      highest_tier: member?.highest_tier ?? "",
      main_line: member?.main_line ?? "",
      sub_line: member?.sub_line ?? "",
      score: member ? getMemberLineScore(member, line) : 0,
    };
  });
};

const buildFallbackAnalysis = (
    members: RequestMember[],
    teamSlots: TeamSlots
  ): BalanceAnalysis => {
    const team1Score = getTeamScore(members, teamSlots, "team1");
    const team2Score = getTeamScore(members, teamSlots, "team2");
    const scoreDiff = Math.abs(team1Score - team2Score);
  
    return {
      title: `점수 차이 ${scoreDiff}점 밸런스`,
      summary: `서버 계산 기준으로 팀 총점 차이가 가장 작게 나오도록 배치했습니다. 1팀 총점은 ${team1Score}점, 2팀 총점은 ${team2Score}점입니다.`,
      scorePoint: `이번 배치는 팀 총점 차이 최소화를 최우선으로 계산한 결과입니다. 현재 점수 차이는 ${scoreDiff}점입니다.`,
      team1Point: `1팀은 각 라인 배치 기준 총점 ${team1Score}점입니다.`,
      team2Point: `2팀은 각 라인 배치 기준 총점 ${team2Score}점입니다.`,
      lineAnalysis: LINES.map((line) => {
        const team1Member = getMemberByName(members, teamSlots.team1[line]);
        const team2Member = getMemberByName(members, teamSlots.team2[line]);
  
        return {
          line,
          title: `${team1Member?.nickname ?? teamSlots.team1[line]} vs ${
            team2Member?.nickname ?? teamSlots.team2[line]
          }`,
          content: `라인 점수 기준으로 ${
            Math.abs(
              getMemberLineScore(team1Member!, line) -
                getMemberLineScore(team2Member!, line)
            )
          }점 차이 매치업입니다.`,
        };
      }),
      keyPoint:
        "점수 차이 최소화를 최우선으로 두고, 같은 점수 차이 후보 안에서 라인 선호도와 라인별 격차가 덜 무너지는 배치를 선택했습니다.",
      winCondition: {
        team1:
          "우세한 라인에서 초반 주도권을 잡고, 약한 라인은 무리하지 않는 운영이 중요합니다.",
        team2:
          "라인별 격차가 큰 구간을 피하고, 강한 라인을 중심으로 합류 싸움을 만드는 쪽이 좋습니다.",
      },
    };
  };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const members = body.members as RequestMember[];

    const memberErrorMessage = validateMembers(members);

    if (memberErrorMessage) {
      return Response.json(
        {
          teamSlots: emptyTeamSlots,
          analysis: "",
          warnings: [memberErrorMessage],
        },
        { status: 400 }
      );
    }

    const bestTeamSlots = calculateBestTeamSlots(members);

    if (!bestTeamSlots) {
      return Response.json(
        {
          teamSlots: emptyTeamSlots,
          analysis: "",
          warnings: ["자동 팀짜기 계산에 실패했습니다."],
        },
        { status: 500 }
      );
    }

    const team1Score = getTeamScore(members, bestTeamSlots, "team1");
    const team2Score = getTeamScore(members, bestTeamSlots, "team2");
    const scoreDiff = Math.abs(team1Score - team2Score);

    const fallbackAnalysis = buildFallbackAnalysis(members, bestTeamSlots);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({
        teamSlots: bestTeamSlots,
        analysis: fallbackAnalysis,
        warnings: [],
      });
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature: 0.4,
        text: {
          format: {
            type: "json_schema",
            name: "auto_balance_analysis_result",
            schema: responseSchema,
            strict: true,
          },
        },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
너는 리그 오브 레전드 내전 밸런스 분석가다.

팀 배치는 서버에서 이미 점수 차이가 최소가 되도록 계산했다.
너는 팀을 다시 짜지 말고, 아래 확정 배치에 대한 분석글만 작성해라.

최우선 기준:
- 이 배치는 팀 총점 차이 최소화를 최우선으로 계산된 결과다.
- 분석글에서 점수 차이가 최소화된 점을 반드시 언급해라.
- 라인 선호도와 라인별 매치업도 함께 설명해라.
- 한국어로 작성해라.
- 너무 딱딱하게 쓰지 말고, 내전 시작 전에 읽기 좋은 톤으로 써라.
- 분석글에는 전체 밸런스 총평, 라인별 매치업, 핵심 변수, 1팀 승리 플랜, 2팀 승리 플랜을 포함해라.
- warnings는 특별한 문제가 없으면 빈 배열로 둔다.

확정 팀 배치:
${JSON.stringify(bestTeamSlots, null, 2)}

점수 요약:
- 1팀 총점: ${team1Score}
- 2팀 총점: ${team2Score}
- 점수 차이: ${scoreDiff}

1팀 상세:
${JSON.stringify(buildMemberSummary(members, bestTeamSlots, "team1"), null, 2)}

2팀 상세:
${JSON.stringify(buildMemberSummary(members, bestTeamSlots, "team2"), null, 2)}
`,
              },
            ],
          },
        ],
      }),
    });

    const openAiData = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return Response.json({
        teamSlots: bestTeamSlots,
        analysis: fallbackAnalysis,
        warnings: [],
      });
    }

    const outputText = getOutputText(openAiData);

    if (!outputText) {
      return Response.json({
        teamSlots: bestTeamSlots,
        analysis: fallbackAnalysis,
        warnings: [],
      });
    }

    let result: OpenAiAnalysisResponse | null = null;

    try {
      result = JSON.parse(outputText) as OpenAiAnalysisResponse;
    } catch {
      return Response.json({
        teamSlots: bestTeamSlots,
        analysis: fallbackAnalysis,
        warnings: [],
      });
    }

    return Response.json({
      teamSlots: bestTeamSlots,
      analysis: result.analysis || fallbackAnalysis,
      warnings: result.warnings ?? [],
    } satisfies AnalyzeAutoBalanceTeamsResponse);
  } catch (error) {
    console.error("AI 자동 팀짜기 실패:", error);

    return Response.json(
      {
        teamSlots: emptyTeamSlots,
        analysis: "",
        warnings: ["AI 자동 팀짜기 실패"],
      },
      { status: 500 }
    );
  }
}
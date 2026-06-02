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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          teamSlots: bestTeamSlots,
          analysis: null,
          warnings: ["OPENAI_API_KEY가 설정되지 않았습니다."],
        },
        { status: 500 }
      );
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
                
                중요:
                - 팀 배치는 이미 서버에서 확정했다.
                - 너는 절대 팀을 다시 짜지 않는다.
                - 너는 아래 확정 배치를 기준으로 실제 내전 시작 전에 보여줄 "밸런스 리포트"를 작성한다.
                - 하드코딩처럼 일반론을 쓰지 말고, 반드시 제공된 멤버 이름, 닉네임, 티어, 주라인, 부라인, 배치 라인을 근거로 작성한다.
                - "점수 차이 몇 점"을 반복하지 마라.
                - 점수는 참고 자료일 뿐이고, 최종 출력은 경기 흐름, 시사점, 변수, 운영 방향 중심이어야 한다.
                - 라인별 분석도 "몇 점 차이"가 아니라 "이 라인에서 어떤 일이 벌어질 가능성이 큰지"를 써라.
                
                분석 기준:
                - 현재 티어와 최고 티어를 같이 고려한다.
                - 주라인 배치인지, 부라인 배치인지, 비선호 라인 배치인지 고려한다.
                - 같은 라인 상대와 비교해서 라인전 안정성, 초반 주도권, 갱킹 호응, 한타 영향력, 변수 창출 가능성을 분석한다.
                - 팀 전체는 초반 운영, 중반 교전, 후반 한타, 강한 라인 활용 방식 중심으로 분석한다.
                - 어느 팀이 무조건 이긴다고 단정하지 말고, 각 팀의 승리 조건을 분리해서 쓴다.
                - 특정 사람을 조롱하거나 비하하지 않는다.
                - 내전용으로 읽기 좋게, 딱딱한 보고서 말투보다 해설 느낌으로 작성한다.
                
                반드시 지킬 출력 품질:
                - analysis.title은 이 매치업의 핵심 구도를 짧고 임팩트 있게 쓴다.
                - analysis.summary는 전체 경기가 어떤 구도로 흘러갈지 2~3문장으로 쓴다.
                - analysis.scorePoint는 점수 최소화 결과 자체보다, 왜 이 배치가 밸런스상 의미 있는지 설명한다.
                - analysis.team1Point는 1팀의 강점, 약점, 조심할 점을 구체적으로 쓴다.
                - analysis.team2Point는 2팀의 강점, 약점, 조심할 점을 구체적으로 쓴다.
                - analysis.lineAnalysis는 반드시 탑, 정글, 미드, 원딜, 서폿 5개를 작성한다.
                - lineAnalysis.title은 "탑: 초반 압박이 갈리는 라인" 같은 식으로 라인명과 시사점을 같이 담는다.
                - lineAnalysis.content는 해당 라인의 실제 매치업 구도, 핵심 변수, 주의할 플레이를 2~3문장으로 쓴다.
                - analysis.keyPoint는 이 경기 전체를 가를 핵심 변수 1~2개를 쓴다.
                - analysis.winCondition.team1은 1팀이 이기려면 어떤 라인을 중심으로 어떻게 굴려야 하는지 쓴다.
                - analysis.winCondition.team2는 2팀이 이기려면 어떤 라인을 중심으로 어떻게 굴려야 하는지 쓴다.
                - warnings는 특별한 문제가 없으면 빈 배열로 둔다.
                
                응답 형식:
                - 반드시 JSON Schema에 맞춰 응답한다.
                - analysis는 문자열이 아니라 객체다.
                - analysis.lineAnalysis는 반드시 5개다.
                - analysis.lineAnalysis의 line 값은 정확히 "탑", "정글", "미드", "원딜", "서폿" 중 하나다.
                
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
        return Response.json(
          {
            teamSlots: bestTeamSlots,
            analysis: null,
            warnings: [
              openAiData.error?.message ?? "OpenAI 밸런스 분석 요청 실패",
            ],
          },
          { status: 500 }
        );
      }

    const outputText = getOutputText(openAiData);

    if (!outputText) {
        return Response.json(
          {
            teamSlots: bestTeamSlots,
            analysis: null,
            warnings: ["AI 밸런스 분석 응답을 읽지 못했습니다."],
          },
          { status: 500 }
        );
      }

    let result: OpenAiAnalysisResponse | null = null;

    try {
        result = JSON.parse(outputText) as OpenAiAnalysisResponse;
      } catch {
        return Response.json(
          {
            teamSlots: bestTeamSlots,
            analysis: null,
            warnings: ["AI 밸런스 분석 응답이 JSON 형식이 아닙니다."],
          },
          { status: 500 }
        );
      }

      if (
        !result.analysis ||
        !Array.isArray(result.analysis.lineAnalysis) ||
        result.analysis.lineAnalysis.length !== 5
      ) {
        return Response.json(
          {
            teamSlots: bestTeamSlots,
            analysis: null,
            warnings: ["AI 밸런스 분석 결과 형식이 올바르지 않습니다."],
          },
          { status: 500 }
        );
      }
      
      return Response.json({
        teamSlots: bestTeamSlots,
        analysis: result.analysis,
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
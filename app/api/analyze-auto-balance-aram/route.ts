export const runtime = "nodejs";

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
  aram_score: number;
};

type AramTeamSlots = Record<TeamKey, string[]>;

type AramBalanceAnalysis = {
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
};

type AnalyzeAutoBalanceAramTeamsResponse = {
  teamSlots: AramTeamSlots;
  analysis: AramBalanceAnalysis | null;
  warnings: string[];
};

type AramConstraints = {
  sameTeamPairs: {
    names: string[];
  }[];
  differentTeamPairs: {
    names: string[];
  }[];
  fixedTeams: {
    name: string;
    team: TeamKey;
  }[];
};

type ConstraintParseResponse = {
  constraints: AramConstraints;
  warnings: string[];
};

type OpenAiAnalysisResponse = {
  analysis: AramBalanceAnalysis;
  warnings: string[];
};

const TEAMS: TeamKey[] = ["team1", "team2"];

const emptyTeamSlots: AramTeamSlots = {
  team1: ["", "", "", "", ""],
  team2: ["", "", "", "", ""],
};

const emptyConstraints: AramConstraints = {
  sameTeamPairs: [],
  differentTeamPairs: [],
  fixedTeams: [],
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
        tierPoint: { type: "string" },
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
        "tierPoint",
        "keyPoint",
        "winCondition",
      ],
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["analysis", "warnings"],
};

const constraintSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    constraints: {
      type: "object",
      additionalProperties: false,
      properties: {
        sameTeamPairs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              names: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["names"],
          },
        },
        differentTeamPairs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              names: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["names"],
          },
        },
        fixedTeams: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              team: {
                type: "string",
                enum: ["team1", "team2"],
              },
            },
            required: ["name", "team"],
          },
        },
      },
      required: ["sameTeamPairs", "differentTeamPairs", "fixedTeams"],
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["constraints", "warnings"],
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

const getMemberScore = (member: RequestMember | null) => {
  if (!member) {
    return 0;
  }

  if (typeof member.aram_score !== "number" || Number.isNaN(member.aram_score)) {
    return 0;
  }

  return member.aram_score;
};

const getTeamScore = (
  members: RequestMember[],
  teamSlots: AramTeamSlots,
  team: TeamKey
) => {
  return teamSlots[team].reduce((total, name) => {
    return total + getMemberScore(getMemberByName(members, name));
  }, 0);
};

const getTeamName = (teamSlots: AramTeamSlots, name: string) => {
  if (teamSlots.team1.includes(name)) {
    return "team1";
  }

  if (teamSlots.team2.includes(name)) {
    return "team2";
  }

  return null;
};

const getConstraintPenalty = (
  teamSlots: AramTeamSlots,
  constraints: AramConstraints
) => {
  let penalty = 0;

  constraints.sameTeamPairs.forEach((constraint) => {
    const teams = constraint.names
      .map((name) => getTeamName(teamSlots, name))
      .filter((team) => team !== null);

    if (teams.length < 2) {
      return;
    }

    const firstTeam = teams[0];
    const isBroken = teams.some((team) => team !== firstTeam);

    if (isBroken) {
      penalty += 1_000_000_000_000;
    }
  });

  constraints.differentTeamPairs.forEach((constraint) => {
    const teams = constraint.names
      .map((name) => getTeamName(teamSlots, name))
      .filter((team) => team !== null);

    if (teams.length < 2) {
      return;
    }

    const firstTeam = teams[0];
    const isBroken = teams.every((team) => team === firstTeam);

    if (isBroken) {
      penalty += 1_000_000_000_000;
    }
  });

  constraints.fixedTeams.forEach((constraint) => {
    const team = getTeamName(teamSlots, constraint.name);

    if (!team) {
      return;
    }

    if (team !== constraint.team) {
      penalty += 1_000_000_000_000;
    }
  });

  return penalty;
};

const getTierSpreadPenalty = (
  members: RequestMember[],
  teamSlots: AramTeamSlots
) => {
  const team1Scores = teamSlots.team1
    .map((name) => getMemberScore(getMemberByName(members, name)))
    .sort((a, b) => b - a);

  const team2Scores = teamSlots.team2
    .map((name) => getMemberScore(getMemberByName(members, name)))
    .sort((a, b) => b - a);

  return team1Scores.reduce((total, score, index) => {
    return total + Math.abs(score - (team2Scores[index] ?? 0));
  }, 0);
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
): AramTeamSlots => {
  return {
    team1: team1Members.map((member) => member.name),
    team2: team2Members.map((member) => member.name),
  };
};

const calculateBestTeamSlots = (
  members: RequestMember[],
  constraints: AramConstraints
) => {
  let bestTeamSlots: AramTeamSlots | null = null;
  let bestFinalScore = Number.MAX_SAFE_INTEGER;

  const sortedMembers = [...members].sort((a, b) => b.aram_score - a.aram_score);
  const team1Combinations = getCombinations(sortedMembers, 5);

  team1Combinations.forEach((team1Members) => {
    const team1NameSet = new Set(team1Members.map((member) => member.name));
    const team2Members = sortedMembers.filter(
      (member) => !team1NameSet.has(member.name)
    );

    const teamSlots = createTeamSlots(team1Members, team2Members);

    const team1Score = getTeamScore(members, teamSlots, "team1");
    const team2Score = getTeamScore(members, teamSlots, "team2");
    const scoreDiff = Math.abs(team1Score - team2Score);
    const tierSpreadPenalty = getTierSpreadPenalty(members, teamSlots);
    const constraintPenalty = getConstraintPenalty(teamSlots, constraints);

    const finalScore =
      constraintPenalty + scoreDiff * 1_000_000 + tierSpreadPenalty * 100;

    if (finalScore < bestFinalScore) {
      bestFinalScore = finalScore;
      bestTeamSlots = teamSlots;
    }
  });

  return bestTeamSlots;
};

const validateMembers = (members: RequestMember[]) => {
  if (!Array.isArray(members) || members.length !== 10) {
    return "AI 증바람 팀짜기는 정확히 10명의 모임원이 필요합니다.";
  }

  const uniqueIds = new Set(members.map((member) => member.id));

  if (uniqueIds.size !== 10) {
    return "중복된 모임원이 있습니다.";
  }

  const hasInvalidScore = members.some((member) => {
    return typeof member.aram_score !== "number" || !Number.isFinite(member.aram_score);
  });

  if (hasInvalidScore) {
    return "증바람 점수 정보가 없습니다.";
  }

  return "";
};

const buildMemberSummary = (
  members: RequestMember[],
  teamSlots: AramTeamSlots,
  team: TeamKey
) => {
  return teamSlots[team].map((name, index) => {
    const member = getMemberByName(members, name);

    return {
      order: index + 1,
      name,
      nickname: member?.nickname ?? "",
      current_tier: member?.current_tier ?? "",
      highest_tier: member?.highest_tier ?? "",
      main_line: member?.main_line ?? "",
      sub_line: member?.sub_line ?? "",
      score: member ? getMemberScore(member) : 0,
    };
  });
};

const parseCustomRequestConstraints = async (
  apiKey: string,
  customRequest: string,
  members: RequestMember[]
): Promise<ConstraintParseResponse> => {
  if (!customRequest.trim()) {
    return {
      constraints: emptyConstraints,
      warnings: [],
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      temperature: 0,
      text: {
        format: {
          type: "json_schema",
          name: "aram_constraint_result",
          schema: constraintSchema,
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
              너는 리그 오브 레전드 증바람 내전 자동 팀짜기 요청을 제약조건 JSON으로 변환한다.

              중요:
              - 증바람은 라인 구분이 없다.
              - 사용자가 "같은 팀", "붙여줘", "한 팀"이라고 하면 sameTeamPairs에 넣는다.
              - 사용자가 "다른 팀", "갈라줘", "상대팀"이라고 하면 differentTeamPairs에 넣는다.
              - 사용자가 "1팀으로", "2팀으로"라고 하면 fixedTeams에 넣는다.
              - 라인 고정 요청은 증바람에 적용할 수 없으므로 constraints에 넣지 말고 warnings에 넣는다.
              - 참여자 목록에 없는 이름은 constraints에 넣지 말고 warnings에 넣는다.
              - 이름은 반드시 참여자 목록의 name 값과 정확히 일치하게 반환한다.

              참여자 목록:
              ${JSON.stringify(
                members.map((member) => ({
                  name: member.name,
                  nickname: member.nickname,
                  current_tier: member.current_tier,
                  highest_tier: member.highest_tier,
                  score: member.aram_score,
                })),
                null,
                2
              )}

              사용자 추가 주문:
              ${customRequest}
              `,
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      constraints: emptyConstraints,
      warnings: [data.error?.message ?? "증바람 추가 주문 사항 해석 실패"],
    };
  }

  const outputText = getOutputText(data);

  if (!outputText) {
    return {
      constraints: emptyConstraints,
      warnings: ["증바람 추가 주문 사항 해석 결과를 읽지 못했습니다."],
    };
  }

  try {
    const result = JSON.parse(outputText) as ConstraintParseResponse;

    return {
      constraints: result.constraints ?? emptyConstraints,
      warnings: result.warnings ?? [],
    };
  } catch {
    return {
      constraints: emptyConstraints,
      warnings: ["증바람 추가 주문 사항 해석 결과가 JSON 형식이 아닙니다."],
    };
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const members = body.members as RequestMember[];
    const customRequest = String(body.customRequest ?? "");

    const memberErrorMessage = validateMembers(members);

    if (memberErrorMessage) {
      return Response.json(
        {
          teamSlots: emptyTeamSlots,
          analysis: null,
          warnings: [memberErrorMessage],
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return Response.json(
        {
          teamSlots: emptyTeamSlots,
          analysis: null,
          warnings: ["OPENAI_API_KEY가 설정되지 않았습니다."],
        },
        { status: 500 }
      );
    }

    const constraintResult = await parseCustomRequestConstraints(
      apiKey,
      customRequest,
      members
    );

    const bestTeamSlots = calculateBestTeamSlots(
      members,
      constraintResult.constraints
    );

    if (!bestTeamSlots) {
      return Response.json(
        {
          teamSlots: emptyTeamSlots,
          analysis: null,
          warnings: ["증바람 자동 팀짜기 계산에 실패했습니다."],
        },
        { status: 500 }
      );
    }

    const team1Score = getTeamScore(members, bestTeamSlots, "team1");
    const team2Score = getTeamScore(members, bestTeamSlots, "team2");
    const scoreDiff = Math.abs(team1Score - team2Score);

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
            name: "aram_balance_analysis_result",
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
                너는 리그 오브 레전드 증바람 내전 밸런스 분석가다.

                중요:
                - 증바람은 라인 구분이 없다.
                - 팀 배치는 이미 서버에서 확정했다.
                - 너는 절대 팀을 다시 짜지 않는다.
                - 아래 확정 배치를 기준으로 실제 내전 시작 전에 보여줄 밸런스 리포트를 작성한다.
                - 반드시 제공된 멤버 이름, 닉네임, 현재 티어, 최고 티어, 점수를 근거로 작성한다.
                - 특정 사람을 조롱하거나 비하하지 않는다.
                - 어느 팀이 무조건 이긴다고 단정하지 않는다.
                - 딱딱한 보고서 말투보다 내전 해설 느낌으로 작성한다.

                분석 기준:
                - 증바람은 라인이 없으므로 티어 분포와 고점/저점 분산을 중심으로 본다.
                - 에이스급 멤버가 한쪽에 몰렸는지 확인한다.
                - 상위 티어, 중간 티어, 하위 티어가 양 팀에 최대한 나뉘었는지 설명한다.
                - 초반 교전, 중반 한타, 후반 변수, 캐리 라인 없는 모드 특성을 기준으로 쓴다.
                - 점수 차이 반복보다 팀별 강점/약점/승리 조건을 구체적으로 쓴다.

                반드시 지킬 출력 품질:
                - analysis.title은 이 증바람 매치업의 핵심 구도를 짧게 쓴다.
                - analysis.summary는 전체 구도를 2~3문장으로 쓴다.
                - analysis.scorePoint는 점수 차이와 밸런스 의미를 설명한다.
                - analysis.team1Point는 1팀의 강점, 약점, 조심할 점을 쓴다.
                - analysis.team2Point는 2팀의 강점, 약점, 조심할 점을 쓴다.
                - analysis.tierPoint는 양 팀의 티어 분포가 어떻게 나뉘었는지 쓴다.
                - analysis.keyPoint는 경기 전체 핵심 변수를 쓴다.
                - analysis.winCondition.team1은 1팀 승리 조건을 쓴다.
                - analysis.winCondition.team2는 2팀 승리 조건을 쓴다.
                - warnings는 특별한 문제가 없으면 빈 배열로 둔다.

                사용자 추가 주문:
                ${customRequest.trim() || "없음"}

                서버가 해석한 추가 주문 제약조건:
                ${JSON.stringify(constraintResult.constraints, null, 2)}

                추가 주문 해석 경고:
                ${JSON.stringify(constraintResult.warnings, null, 2)}

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
            openAiData.error?.message ?? "OpenAI 증바람 밸런스 분석 요청 실패",
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
          warnings: ["AI 증바람 밸런스 분석 응답을 읽지 못했습니다."],
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
          warnings: ["AI 증바람 밸런스 분석 응답이 JSON 형식이 아닙니다."],
        },
        { status: 500 }
      );
    }

    return Response.json({
      teamSlots: bestTeamSlots,
      analysis: result.analysis,
      warnings: [...constraintResult.warnings, ...(result.warnings ?? [])],
    } satisfies AnalyzeAutoBalanceAramTeamsResponse);
  } catch (error) {
    return Response.json(
      {
        teamSlots: emptyTeamSlots,
        analysis: null,
        warnings: [
          error instanceof Error
            ? error.message
            : "AI 증바람 팀짜기 처리 중 오류가 발생했습니다.",
        ],
      },
      { status: 500 }
    );
  }
}
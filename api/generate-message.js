// Vercel 서버리스 함수: OpenRouter로 상황별 거절 문구 3톤(normal/polite/casual)을 생성한다.
// 필요한 환경변수 (Vercel 프로젝트 설정 > Environment Variables):
//   OPENROUTER_API_KEY  (필수) - https://openrouter.ai/keys 에서 발급
//   OPENROUTER_MODEL    (선택) - 기본값: google/gemma-4-31b-it:free
//     무료 모델은 OpenRouter가 수시로 교체/폐지한다. 이 기본값이 다시 막히면
//     https://openrouter.ai/models?max_price=0 에서 살아있는 ":free" 모델 슬러그를 골라
//     OPENROUTER_MODEL 환경변수로 지정하면 코드 수정 없이 바로 바뀐다.
//   PUBLIC_SITE_URL     (선택) - OpenRouter 요청 헤더(HTTP-Referer)에 사용할 배포 URL

const RELATION_LABEL = { close: '친한 친구', ambiguous: '애매한 지인', work: '업무 관계' };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' });
    return;
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 20) : '';
  const relation = RELATION_LABEL[body.relation] || body.relationLabel || '애매한 지인';
  const nextchance = body.nextchanceLabel || (body.nextchance === 'yes' ? '또 볼 수 있는 사이' : '이번이 아니면 다시 없는 자리');
  const time = Number.isFinite(body.time) ? body.time : '알 수 없음';
  const cost = Number.isFinite(body.cost) ? body.cost : '알 수 없음';
  const condition = Number.isFinite(body.condition) ? body.condition : '알 수 없음';
  const outcome = body.outcome === 'attend' ? '참석 권장' : '거절 권장';
  const confidence = Number.isFinite(body.confidence) ? body.confidence : '알 수 없음';

  const systemPrompt = `당신은 애매한 약속을 거절해야 하는 사람을 대신해 상대방에게 보낼 메시지를 써주는 한국어 카피라이터입니다.
반드시 아래 JSON 형식으로만 답하세요. 다른 설명, 마크다운, 코드블록 없이 순수 JSON 객체만 출력합니다.
{"normal": "...", "polite": "...", "casual": "..."}

작성 규칙:
- normal: 무난하고 자연스러운 존댓말 톤 (2~3문장)
- polite: 격식 있고 예의 바른 존댓말 톤 (2~3문장)
- casual: 친근한 반말/구어체 톤, ㅠㅠ·ㅎㅎ 같은 표현 약간 사용 가능 (2~3문장)
- 상대방 이름이 주어지면 자연스럽게 호칭을 포함할 것: normal/polite는 "{이름}님,"으로 시작, casual은 이름 받침 유무에 맞춰 "{이름}아" 또는 "{이름}야"로 시작. 이름이 없으면 호칭 없이 자연스럽게 시작.
- 진짜 사유를 구구절절 설명하지 말고 "사정이 있어서", "컨디션이 안 좋아서" 같은 완곡한 표현을 사용할 것.
- 관계와 다음에 볼 기회를 배려하는 문장을 자연스럽게 녹일 것.
- 실제 사람이 보낼 법한, 과장되지 않은 자연스러운 문장으로 작성할 것.`;

  const userPrompt = `[상황 정보]
- 상대방 이름: ${name || '(제공 안 됨)'}
- 관계: ${relation}
- 다음 기회: ${nextchance}
- 예상 소요 시간: 약 ${time}시간
- 예상 비용: ${cost}만원
- 현재 컨디션(0=매우 지침, 10=매우 좋음): ${condition}
- AI 판단 결과: ${outcome} (확신도 ${confidence}%)

위 상황에 맞는 거절 메시지를 normal/polite/casual 세 가지 톤으로 JSON으로 작성해주세요.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'https://go-or-notgo.vercel.app',
        'X-Title': 'Galkka-Malkka AI' // HTTP 헤더 값은 ASCII만 허용되어 한글을 넣으면 fetch가 TypeError를 던진다
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(502).json({ error: 'LLM request failed', detail });
      return;
    }

    const data = await response.json();
    const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const jsonMatch = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    if (!parsed.normal || !parsed.polite || !parsed.casual) {
      throw new Error('Incomplete response from LLM');
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate message', detail: String(err) });
  }
};

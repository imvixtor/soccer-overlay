import { GoogleGenAI } from '@google/genai';
import type { MatchPhase } from '@/lib/match-constants';
import { getMatchWithTeams } from './matches.api';
import { getMatchConfig } from './match-config.api';
import { listMatchEventsByMatchId } from './match-events.api';
import { upsertOverlayControl } from './control.api';
import { supabase } from '@/lib/supabase/client';

const GEMINI_MODEL = 'gemma-3-27b-it';

const SCRIPT_PHASES: MatchPhase[] = [
    'PRE_MATCH',
    'HALFTIME',
    'EXTIME_HALF_TIME',
    'FULLTIME',
    'POST_MATCH',
];

function getGeminiClient() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
        return null;
    }
    return new GoogleGenAI({ apiKey });
}

type PromptMatch = Awaited<ReturnType<typeof getMatchWithTeams>>['data'];
type PromptMatchConfig = Awaited<ReturnType<typeof getMatchConfig>>['data'];
type PromptEvents = Awaited<
    ReturnType<typeof listMatchEventsByMatchId>
>['data'];

type PromptPlayer = {
    id: number;
    full_name: string | null;
    nickname: string | null;
    number: number;
    team_id: number | null;
    is_on_field: boolean;
};

function buildPrompt(options: {
    phase: MatchPhase;
    match: PromptMatch;
    matchConfig: PromptMatchConfig;
    events: PromptEvents;
    players: PromptPlayer[];
}) {
    const { phase, match, matchConfig, events, players } = options;
    if (!match) {
        return null;
    }

    const home =
        match.home_team_data?.short_name ||
        match.home_team_data?.name ||
        'đội chủ nhà';
    const away =
        match.away_team_data?.short_name ||
        match.away_team_data?.name ||
        'đội khách';
    const league = match.name || 'một trận đấu giao hữu';
    const scoreLine = `${match.home_score} - ${match.away_score}`;
    const penaltyLine =
        match.penalty_home || match.penalty_away
            ? ` (luân lưu: ${match.penalty_home} - ${match.penalty_away})`
            : '';
    const halfDuration = matchConfig?.half_duration ?? 45;
    const extraDuration = matchConfig?.extra_duration ?? 15;
    const playersPerTeam = matchConfig?.players_per_team ?? 11;
    const hasPenaltyShootout = matchConfig?.has_penalty_shootout ?? false;

    const goals = events.filter((e) => e.type === 'GOAL');
    const yellows = events.filter((e) => e.type === 'YELLOW');
    const reds = events.filter((e) => e.type === 'RED');

    const playerById = new Map<number, PromptPlayer>();
    for (const p of players) {
        playerById.set(p.id, p);
    }

    const homeGoalsFromEvents = goals.filter((ev) => {
        const p = playerById.get(ev.player_id);
        return p?.team_id === match.home_team;
    }).length;
    const awayGoalsFromEvents = goals.filter((ev) => {
        const p = playerById.get(ev.player_id);
        return p?.team_id === match.away_team;
    }).length;

    const eventsSummaryParts: string[] = [];
    if (goals.length > 0) {
        eventsSummaryParts.push(
            `Trong trận đã có ${goals.length} bàn thắng (theo dữ liệu sự kiện).`,
        );
    }
    if (yellows.length > 0) {
        eventsSummaryParts.push(
            `Có ${yellows.length} thẻ vàng, hãy lồng ghía cạnh căng thẳng, quyết liệt.`,
        );
    }
    if (reds.length > 0) {
        eventsSummaryParts.push(
            `Có ${reds.length} thẻ đỏ, hãy nhấn mạnh bước ngoặt về thế trận.`,
        );
    }

    const eventsDetailLines: string[] = events.map((ev) => {
        const player = ev.player_id ? playerById.get(ev.player_id) : null;
        const playerOut =
            ev.player_out_id != null ? playerById.get(ev.player_out_id) : null;

        const minuteLabel =
            ev.bonus_minute && ev.bonus_minute > 0
                ? `${ev.minute}+${ev.bonus_minute}'`
                : `${ev.minute}'`;

        const teamSide =
            player?.team_id === match.home_team
                ? home
                : player?.team_id === match.away_team
                  ? away
                  : 'Đội chưa xác định';

        const baseName = player
            ? `#${player.number} ${
                  player.nickname?.trim() || player.full_name?.trim() || ''
              }`
            : `Cầu thủ ID=${ev.player_id}`;

        if (ev.type === 'SUB') {
            const outName = playerOut
                ? `#${playerOut.number} ${
                      playerOut.nickname?.trim() ||
                      playerOut.full_name?.trim() ||
                      ''
                  }`
                : `Cầu thủ ID=${ev.player_out_id}`;
            return `- ${minuteLabel} | THAY NGƯỜI | ${teamSide}: ${outName} rời sân, ${baseName} vào sân.`;
        }

        if (ev.type === 'GOAL') {
            return `- ${minuteLabel} | BÀN THẮNG | ${teamSide}: ${baseName} ghi bàn.`;
        }
        if (ev.type === 'YELLOW') {
            return `- ${minuteLabel} | THẺ VÀNG | ${teamSide}: ${baseName} nhận thẻ vàng.`;
        }
        if (ev.type === 'RED') {
            return `- ${minuteLabel} | THẺ ĐỎ | ${teamSide}: ${baseName} bị truất quyền thi đấu.`;
        }

        return `- ${minuteLabel} | SỰ KIỆN ${ev.type} | ${teamSide}: ${baseName}.`;
    });

    const eventsDetailBlock =
        eventsDetailLines.length > 0
            ? `Danh sách sự kiện chi tiết theo thời gian (bạn hãy dùng như ghi chú nội bộ để tóm tắt lại mạch diễn biến, không cần đọc nguyên văn từng dòng):
${eventsDetailLines.join('\n')}`
            : 'Chưa có sự kiện (bàn thắng / thẻ / thay người) đáng chú ý nào được ghi nhận.';

    const homeLineup = players
        .filter(
            (p) =>
                p.is_on_field &&
                p.team_id != null &&
                p.team_id === match.home_team,
        )
        .sort((a, b) => a.number - b.number);
    const awayLineup = players
        .filter(
            (p) =>
                p.is_on_field &&
                p.team_id != null &&
                p.team_id === match.away_team,
        )
        .sort((a, b) => a.number - b.number);

    const formatLineup = (list: PromptPlayer[]) =>
        list
            .map((p) => {
                const name = p.nickname?.trim() || p.full_name?.trim() || '';
                return `#${p.number} ${name}`.trim();
            })
            .join(', ');

    const lineupBlock =
        homeLineup.length || awayLineup.length
            ? `Đội hình xuất phát (theo dữ liệu hiện tại, có thể điều chỉnh lại khi bình luận):
- ${home}: ${homeLineup.length ? formatLineup(homeLineup) : 'chưa có dữ liệu đội hình trên sân.'}
- ${away}: ${awayLineup.length ? formatLineup(awayLineup) : 'chưa có dữ liệu đội hình trên sân.'}
`
            : 'Chưa có dữ liệu đầy đủ về đội hình xuất phát, bạn có thể bình luận mang tính khái quát về lối chơi và con người của mỗi đội.';

    const commonContext = `
Thông tin trận đấu:
- Giải đấu / mô tả: ${league}
- Đội chủ nhà: ${home}
- Đội khách: ${away}
- Tỉ số hiện tại: ${scoreLine}${penaltyLine}
- Số bàn thắng của ${home}: ${homeGoalsFromEvents}, của ${away}: ${awayGoalsFromEvents} (tính theo danh sách sự kiện).
- Thời lượng mỗi hiệp chính: ${halfDuration} phút, hiệp phụ: ${extraDuration} phút.
- Số cầu thủ mỗi đội trên sân: ${playersPerTeam}.
- Có thi đấu luân lưu nếu hòa sau hiệp phụ: ${hasPenaltyShootout ? 'Có' : 'Không'}.
${eventsSummaryParts.length > 0 ? eventsSummaryParts.join('\n') : 'Hiện chưa có nhiều sự kiện nổi bật, hãy bình luận tập trung vào bối cảnh, chiến thuật và cảm xúc trận đấu.'}

${eventsDetailBlock}
`;

    let taskInstruction = '';

    if (phase === 'PRE_MATCH') {
        taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết một kịch bản lời dẫn ngắn gọn, mạch lạc cho giai đoạn TRƯỚC TRẬN:
- Mở đầu giới thiệu không khí, tầm quan trọng của trận đấu giữa ${home} và ${away}.
- Giới thiệu nhanh về phong độ, điểm đáng chú ý của hai đội.
- Dựa trên khối thông tin "Đội hình xuất phát", hãy nói khái quát về cách bố trí con người và vài cái tên đáng chú ý của mỗi bên (không cần đọc hết danh sách, chỉ chọn lọc).
- Văn phong tự nhiên, tiếng Việt, dùng “tôi / chúng ta” thân thiện với khán giả.
- Độ dài khoảng 3–5 đoạn văn ngắn, dễ đọc một lèo trên sóng.
`;
    } else if (phase === 'HALFTIME' || phase === 'EXTIME_HALF_TIME') {
        taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết kịch bản tổng kết NGHỈ GIỮA HIỆP cho trận đấu:
- Mở đầu bằng việc nhắc lại tỉ số hiện tại ${scoreLine}.
- Tóm tắt diễn biến chính trong hiệp vừa rồi: cơ hội, bàn thắng, thẻ phạt, bước ngoặt (dựa trên phần "Thông tin trận đấu").
- Phân tích ngắn gọn về chiến thuật, cầu thủ nổi bật của mỗi bên.
- Kết thúc bằng việc dẫn dắt người xem chờ đợi hiệp tiếp theo.
- Văn phong tự nhiên, tiếng Việt, dễ đọc, không dùng gạch đầu dòng, chỉ dùng đoạn văn.
- Độ dài khoảng 3–6 đoạn văn ngắn.
`;
    } else if (phase === 'FULLTIME') {
        // FULLTIME có thể là:
        // - Kết thúc luôn trận đấu (không hiệp phụ, không pen) => tổng kết trận
        // - Hoặc chỉ là kết thúc hiệp 2, chuẩn bị hiệp phụ / pen
        const noExtraTime = extraDuration === 0;
        const noPenalty = !hasPenaltyShootout;

        if (noExtraTime && noPenalty) {
            // Trận kết thúc sau 2 hiệp chính
            taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết kịch bản TỔNG KẾT TRẬN ĐẤU khi trận đấu đã khép lại:
- Nhắc lại tỉ số chung cuộc ${scoreLine}${penaltyLine}.
- Tóm tắt mạch diễn biến chính của trận: những bàn thắng quan trọng, bước ngoặt, thẻ phạt.
- Đánh giá ngắn gọn màn trình diễn của ${home} và ${away}, chỉ ra những điểm nhấn.
- Khi kết luận về kết quả, tuyệt đối dựa đúng vào tỉ số ${scoreLine}: nếu tỉ số hòa thì nói rõ là "một trận hòa", không được nói đội nào giành chiến thắng.
- Cuối kịch bản, gửi lời cảm ơn khán giả và hẹn gặp lại ở trận đấu tiếp theo.
- Văn phong tự nhiên, tiếng Việt, nói như đang lên sóng, không cần xưng tên BLV.
- Độ dài khoảng 4–7 đoạn văn ngắn.
`;
        } else {
            // Có hiệp phụ và/hoặc pen: FULLTIME chỉ là hết hiệp 2
            const nextStageDescription =
                !noExtraTime && hasPenaltyShootout
                    ? 'chúng ta chuẩn bị bước vào hiệp phụ, và nếu vẫn hòa sẽ đến loạt sút luân lưu 11m'
                    : !noExtraTime
                      ? 'chúng ta chuẩn bị bước vào hiệp phụ'
                      : 'chúng ta chuẩn bị bước vào loạt sút luân lưu 11m';

            taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết kịch bản NGHỈ GIỮA TRẬN sau khi hiệp 2 kết thúc (trận CHƯA khép lại):
- Mở đầu bằng việc nhắc lại tỉ số hiện tại ${scoreLine}${penaltyLine} sau 90 phút chính thức.
- Tóm tắt ngắn gọn diễn biến 2 hiệp chính: những bàn thắng quan trọng, cơ hội, thẻ phạt, bước ngoặt.
- Phân tích nhanh tương quan lực lượng, thể lực và tinh thần của hai đội trước khi bước vào giai đoạn tiếp theo.
- Kết luận bằng việc dẫn dắt: ${nextStageDescription}.
- Văn phong tự nhiên, tiếng Việt, dễ đọc, không dùng gạch đầu dòng khi viết kịch bản, chỉ dùng đoạn văn.
- Độ dài khoảng 3–5 đoạn văn ngắn.
`;
        }
    } else if (phase === 'POST_MATCH') {
        taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết kịch bản TỔNG KẾT TRẬN ĐẤU khi trận đấu đã khép lại hoàn toàn:
- Nhắc lại tỉ số chung cuộc ${scoreLine}${penaltyLine}.
- Tóm tắt mạch diễn biến chính của trận: những bàn thắng quan trọng, bước ngoặt, thẻ phạt, bao gồm cả hiệp phụ / luân lưu nếu có.
- Đánh giá ngắn gọn màn trình diễn của ${home} và ${away}, chỉ ra những điểm nhấn.
- Nếu có luân lưu, hãy nhấn mạnh cảm xúc căng thẳng ở loạt sút 11m.
- Khi kết luận về kết quả, tuyệt đối dựa đúng vào tỉ số ${scoreLine}: nếu tỉ số hòa thì nói rõ là "một trận hòa", không được nói đội nào giành chiến thắng.
- Cuối kịch bản, gửi lời cảm ơn khán giả và hẹn gặp lại ở trận đấu tiếp theo.
- Văn phong tự nhiên, tiếng Việt, nói như đang lên sóng, không cần xưng tên BLV.
- Độ dài khoảng 4–7 đoạn văn ngắn.
`;
    } else if (
        phase === 'FIRST_HALF' ||
        phase === 'SECOND_HALF' ||
        phase === 'EXTIME_FIRST_HALF' ||
        phase === 'EXTIME_SECOND_HALF' ||
        phase === 'PENALTY_SHOOTOUT'
    ) {
        taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết một kịch bản bình luận NGẮN cho giai đoạn đang thi đấu (${phase}):
- Mở đầu bằng một câu dẫn sinh động về không khí trên sân và bối cảnh tỉ số ${scoreLine}.
- Gợi ý một đoạn bình luận khoảng 1–2 phút: nhắc tới lối chơi, cầu thủ nổi bật, những gì khán giả nên chờ đợi tiếp theo.
- Nếu có nhiều bàn thắng hoặc thẻ phạt, hãy lồng ghép bình luận về những tình huống đó.
- Văn phong tự nhiên, tiếng Việt, không gạch đầu dòng, chỉ dùng đoạn văn.
- Độ dài khoảng 2–4 đoạn văn.
`;
    } else {
        // Các phase khác dùng kịch bản chung chung.
        taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết một kịch bản bình luận ngắn, phù hợp với giai đoạn hiện tại của trận đấu (${phase}),
với văn phong tự nhiên, dễ đọc, khoảng 2–4 đoạn văn.
`;
    }

    return `${taskInstruction}
${commonContext}

${lineupBlock}

YÊU CẦU QUAN TRỌNG:
- Chỉ trả về nội dung kịch bản, không giải thích thêm, không dùng markdown, không chèn tiêu đề.
- Không liệt kê danh sách dạng gạch đầu dòng, hãy viết thành các đoạn văn hoàn chỉnh.
- Ngôn ngữ hoàn toàn bằng tiếng Việt.
`.trim();
}

function buildFallbackScript(phase: MatchPhase) {
    if (phase === 'PRE_MATCH') {
        return (
            'Kính chào quý vị và các bạn đang đến với trận đấu hôm nay.\n' +
            'Chúng ta sẽ cùng theo dõi màn so tài hấp dẫn giữa hai đội, ' +
            'hãy giới thiệu ngắn gọn bối cảnh, phong độ và đội hình xuất phát của mỗi bên.\n' +
            'Sau đó, bạn có thể tùy biến lại lời cho phù hợp với phong cách bình luận của mình.'
        );
    }
    if (phase === 'HALFTIME' || phase === 'EXTIME_HALF_TIME') {
        return (
            'Nghỉ giữa hiệp là thời điểm thích hợp để tổng kết lại những diễn biến chính vừa qua: ' +
            'nhắc lại tỉ số, các cơ hội đáng chú ý, bàn thắng và các tình huống thẻ phạt, ' +
            'đồng thời gợi mở những điều khán giả có thể chờ đợi trong hiệp tiếp theo.'
        );
    }
    if (phase === 'FULLTIME' || phase === 'POST_MATCH') {
        return (
            'Trận đấu đã khép lại, đây là lúc tổng kết lại toàn bộ câu chuyện của 90 phút (và hiệp phụ nếu có): ' +
            'tỉ số chung cuộc, những bước ngoặt quan trọng, các cá nhân nổi bật và cảm xúc còn đọng lại.\n' +
            'Kết thúc bằng lời cảm ơn khán giả và hẹn gặp lại ở những trận đấu sau.'
        );
    }
    return (
        'Đây là giai đoạn đang diễn ra trong trận đấu, hãy đưa ra vài đoạn bình luận ngắn ' +
        'về thế trận, cơ hội và những điều khán giả nên chờ đợi tiếp theo.'
    );
}

export async function generateAndSaveCommentaryScriptForPhase(
    userId: string,
    phase: MatchPhase,
): Promise<void> {
    // Chỉ sinh script cho các phase nghỉ / tổng kết
    if (!SCRIPT_PHASES.includes(phase)) return;

    const client = getGeminiClient();

    try {
        const matchRes = await getMatchWithTeams(userId);
        if (matchRes.error) throw matchRes.error;

        const match = matchRes.data;
        if (!match?.id) {
            return;
        }

        const [configRes, eventsRes, playersRes] = await Promise.all([
            getMatchConfig(userId),
            listMatchEventsByMatchId(match.id),
            supabase
                .from('players')
                .select('id, full_name, nickname, number, team_id, is_on_field')
                .eq('user_id', userId),
        ]);
        if (configRes.error) throw configRes.error;
        if (eventsRes.error) throw eventsRes.error;
        if (playersRes.error) throw playersRes.error;

        const config = configRes.data;

        // Nếu trận không có hiệp phụ và không có luân lưu:
        // - FULLTIME đã đóng vai trò tổng kết trận
        // - POST_MATCH khi này chỉ là "nhãn" kỹ thuật => không cần sinh thêm kịch bản
        const noExtraTime = (config?.extra_duration ?? 0) === 0;
        const noPenalty = !(config?.has_penalty_shootout ?? false);
        if (phase === 'POST_MATCH' && noExtraTime && noPenalty) {
            return;
        }

        const prompt = buildPrompt({
            phase,
            match,
            matchConfig: config,
            events: eventsRes.data,
            players: (playersRes.data ?? []) as PromptPlayer[],
        });
        let script = '';

        if (client && prompt) {
            const response = await client.models.generateContent({
                model: GEMINI_MODEL,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }],
                    },
                ],
            });
            script = (response as { text?: string }).text?.trim() ?? '';
        }

        if (!script) {
            script = buildFallbackScript(phase);
        }

        await upsertOverlayControl(userId, {
            commentary_script: script,
        });
    } catch {
        // Nuốt lỗi để không chặn luồng điều khiển trận đấu.
    }
}

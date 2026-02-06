import { GoogleGenAI } from '@google/genai';
import type { MatchPhase } from '@/lib/match-constants';
import { getMatchWithTeams } from './matches.api';
import { getMatchConfig } from './match-config.api';
import { listMatchEventsByMatchId } from './match-events.api';
import { upsertOverlayControl } from './control.api';

const GEMINI_MODEL = 'gemini-2.5-flash';

function getGeminiClient() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
        return null;
    }
    return new GoogleGenAI({ apiKey });
}

function buildPrompt(options: {
    phase: MatchPhase;
    match: Awaited<ReturnType<typeof getMatchWithTeams>>['data'];
    matchConfig: Awaited<ReturnType<typeof getMatchConfig>>['data'];
    events: Awaited<ReturnType<typeof listMatchEventsByMatchId>>['data'];
}) {
    const { phase, match, matchConfig, events } = options;
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

    const goals = events.filter((e) => e.type === 'GOAL');
    const yellows = events.filter((e) => e.type === 'YELLOW');
    const reds = events.filter((e) => e.type === 'RED');

    const eventsSummaryParts: string[] = [];
    if (goals.length > 0) {
        eventsSummaryParts.push(
            `Trong trận đã có ${goals.length} bàn thắng (hãy tóm tắt theo diễn biến hợp lý).`,
        );
    }
    if (yellows.length > 0) {
        eventsSummaryParts.push(
            `Có ${yellows.length} thẻ vàng, hãy lồng ghép khía cạnh căng thẳng, quyết liệt.`,
        );
    }
    if (reds.length > 0) {
        eventsSummaryParts.push(
            `Có ${reds.length} thẻ đỏ, hãy nhấn mạnh bước ngoặt về thế trận.`,
        );
    }

    const commonContext = `
Thông tin trận đấu:
- Giải đấu / mô tả: ${league}
- Đội chủ nhà: ${home}
- Đội khách: ${away}
- Tỉ số hiện tại: ${scoreLine}${penaltyLine}
- Thời lượng mỗi hiệp chính: ${halfDuration} phút, hiệp phụ: ${extraDuration} phút.
${eventsSummaryParts.length > 0 ? eventsSummaryParts.join('\n') : 'Hiện chưa có nhiều sự kiện nổi bật, hãy bình luận tập trung vào bối cảnh, chiến thuật và cảm xúc trận đấu.'}
`;

    let taskInstruction = '';

    if (phase === 'PRE_MATCH') {
        taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết một kịch bản lời dẫn ngắn gọn, mạch lạc cho giai đoạn TRƯỚC TRẬN:
- Mở đầu giới thiệu không khí, tầm quan trọng của trận đấu giữa ${home} và ${away}.
- Giới thiệu nhanh về phong độ, điểm đáng chú ý của hai đội.
- Nhắc đến đội hình xuất phát (nói khái quát, không cần liệt kê đủ 11 cái tên).
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
    } else if (phase === 'FULLTIME' || phase === 'POST_MATCH') {
        taskInstruction = `
Bạn là BLV bóng đá chuyên nghiệp trên sóng truyền hình Việt Nam.
Hãy viết kịch bản TỔNG KẾT TRẬN ĐẤU khi trận đấu đã khép lại:
- Nhắc lại tỉ số chung cuộc ${scoreLine}${penaltyLine}.
- Tóm tắt mạch diễn biến chính của trận: những bàn thắng quan trọng, bước ngoặt, thẻ phạt.
- Đánh giá ngắn gọn màn trình diễn của ${home} và ${away}, chỉ ra những điểm nhấn.
- Nếu có luân lưu, hãy nhấn mạnh cảm xúc căng thẳng ở loạt sút 11m.
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
    // Không sinh script cho INITIATION và PREPARATION theo yêu cầu
    if (phase === 'INITIATION' || phase === 'PREPARATION') return;

    const client = getGeminiClient();

    try {
        const matchRes = await getMatchWithTeams(userId);
        if (matchRes.error) throw matchRes.error;

        const match = matchRes.data;
        if (!match?.id) {
            return;
        }

        const [configRes, eventsRes] = await Promise.all([
            getMatchConfig(userId),
            listMatchEventsByMatchId(match.id),
        ]);
        if (configRes.error) throw configRes.error;
        if (eventsRes.error) throw eventsRes.error;

        const prompt = buildPrompt({
            phase,
            match,
            matchConfig: configRes.data,
            events: eventsRes.data,
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

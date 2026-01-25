export function parseCSVLine(line: string): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < line.length) {
        if (line[i] === '"') {
            i++;
            let s = '';
            while (i < line.length) {
                if (line[i] === '"') {
                    i++;
                    if (line[i] === '"') {
                        s += '"';
                        i++;
                    } else break;
                } else {
                    s += line[i++];
                }
            }
            out.push(s);
            if (line[i] === ',') i++;
        } else {
            let end = i;
            while (end < line.length && line[end] !== ',') end++;
            out.push(line.slice(i, end).trim());
            i = end + 1;
        }
    }
    return out;
}

export function parseCSV(text: string): string[][] {
    const normalized = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/^\uFEFF/, '');
    return normalized
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map(parseCSVLine);
}

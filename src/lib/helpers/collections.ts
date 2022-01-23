export function zip(a, b) {
    const zipped = [];
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        zipped.push([a[i], b[i]]);
    }
    return zipped;
}

export const processDarkPoolData = (csvText: string) => {
    try {
        const lines = csvText.trim().split('\n');
        const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
        const prints = [];
        for (let i = startIndex; i < lines.length; i++) {
            // Regex to split by comma, ignoring commas inside quotes
            const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!cols || cols.length < 6) continue;

            // Clean up quotes if present
            const cleanCol = (col: string) => col.replace(/^"|"$/g, '').trim();

            const priceStr = cleanCol(cols[4]);
            const premiumStr = cleanCol(cols[5]);

            const price = parseFloat(priceStr.replace(/[$,]/g, ''));
            const rawPremium = premiumStr.replace(/[$,]/g, '');
            let premium = parseFloat(rawPremium);

            if (rawPremium.includes('M')) premium *= 1000000;
            if (rawPremium.includes('K')) premium *= 1000;

            if (!isNaN(price) && !isNaN(premium)) {
                prints.push({ price, premium, raw: premiumStr, date: cleanCol(cols[0]) });
            }
        }
        const priceMap = new Map();
        prints.forEach(p => {
            const roundedPrice = Math.round(p.price * 100) / 100;
            priceMap.set(roundedPrice, (priceMap.get(roundedPrice) || 0) + p.premium);
        });
        const levels = Array.from(priceMap.entries())
            .map(([price, totalPremium]) => ({ price, totalPremium }))
            .sort((a, b) => b.totalPremium - a.totalPremium)
            .slice(0, 5);
        const signatures = prints.filter(p => p.premium > 100000000).sort((a, b) => b.premium - a.premium);
        return { levels, signatures };
    } catch (e) { return null; }
};

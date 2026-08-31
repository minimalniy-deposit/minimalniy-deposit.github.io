import json, re
P = '/home/claude/mindep/src/data/casinos.json'
c = json.load(open(P, encoding='utf-8'))

PAY = {'Карта': 'card', 'СБП': 'sbp', 'USDT': 'usdt', 'BTC': 'btc', 'Bitcoin': 'btc', 'Крипта': 'crypto'}
PAY_EN = {'Карта': 'Card', 'СБП': 'SBP', 'USDT': 'USDT', 'BTC': 'BTC', 'Bitcoin': 'Bitcoin', 'Крипта': 'Crypto'}

BONUS_EN = {
 '7k': 'Bonus: 200% on first deposit + 500 free spins on Gates of Olympus — deposit from 100 ₽ via SBP, withdrawal in 10 minutes',
 'fugu': 'Bonus: 200% on first deposit + weekly tournaments with a prize pool up to 1,000,000 ₽',
 'melbet': 'Bonus: 150% + promo code <strong>VVQ0tmQ</strong> gives +100 free spins on the second deposit',
 'jetton': 'Bonus: free spins for signing up + a bonus on the first crypto deposit — bitcoin casino with a minimum deposit from 100 ₽',
 'dragon': 'Bonus: a unique welcome package at registration + weekly cashback up to 15%',
 'gizbo': 'Bonus: a bonus from the first step + 500 free spins for new players — one of the best welcome packages',
 'spinbetter': 'Bonus: promo code <strong>MINDEP100</strong> — 100 free spins in Pragmatic\'s "The Dog House" after a first deposit from 500 ₽',
 'twin': 'Bonus: a starter gift + fast withdrawals without extra checks. Transparent 30x wagering',
 'slott': 'Bonus: one-minute registration + a bonus right after the first deposit. Fair and transparent — 35x wagering',
 'flagman': 'Bonus: a generous welcome bonus for a place in the rating — players pick it for stability and reputation',
}
BADGE_EN = {'ВЫБОР №1': 'TOP PICK', '2026': '2026', 'ТОП ТУРНИРЫ': 'TOP TOURNAMENTS', 'ПРОМОКОД': 'PROMO CODE',
            'КРИПТА': 'CRYPTO', 'УНИКАЛЬНЫЕ БОНУСЫ': 'UNIQUE BONUSES', 'БЫСТРЫЕ ВЫПЛАТЫ': 'FAST PAYOUTS',
            'СТАБИЛЬНЫЕ ВЫПЛАТЫ': 'STABLE PAYOUTS'}
CTA_EN = {'Вывод за 10 мин': 'Withdrawal in 10 min', 'Вывод за 15 мин': 'Withdrawal in 15 min', 'Вывод за 20 мин': 'Withdrawal in 20 min',
          'Моментальный крипто-вывод': 'Instant crypto withdrawal', 'Стабильный вывод': 'Stable withdrawals'}

def fmt(n): return f'{n:,}'.replace(',', ' ')

for x in c:
    pay_pill = next(p['text'] for p in x['pills'] if '·' in p['text'])
    parts = [s.strip() for s in pay_pill.split('·')]
    x['payments'] = [PAY[p] for p in parts]
    x['paymentsLabel'] = pay_pill
    x['paymentsLabelEn'] = ' · '.join(PAY_EN[p] for p in parts)
    x['withdrawMin'] = int(re.search(r'\d+', next(p['text'] for p in x['pills'] if p['cls'] == 'fast')).group())
    x['license'] = 'Кюрасао'
    x['reviews'] = int(re.sub(r'\D', '', x['ratingCnt'].split('·')[1]))
    x['bonusEn'] = BONUS_EN[x['slug']]
    x['badgesEn'] = [BADGE_EN[b['text']] for b in x['badges']]
    x['ctaLinesEn'] = [f'Min. deposit: {fmt(x["minDeposit"])} ₽'] + [CTA_EN[l] for l in x['ctaLines'][1:]]
    x['promoCode'] = x['promo'].split(': ')[1] if x['promo'] else None

json.dump(c, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('enriched', [(x['slug'], x['payments'], x['withdrawMin'], x['reviews']) for x in c])

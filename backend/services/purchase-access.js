// 회차 구매(소장·대여) 공통 규칙
// - 소장(OWN): 만료 없음. 대여(RENT): expiresAt 까지. 무료 회차 읽음 표시(coinPrice 0)도 OWN 으로 저장돼 있다.
function isActivePurchase(purchase, now = new Date()) {
  return Boolean(purchase) && (!purchase.expiresAt || new Date(purchase.expiresAt) > now);
}

function episodePrices(comic) {
  const ownPrice = comic?.episodeCoinPrice !== undefined && comic?.episodeCoinPrice !== null ? comic.episodeCoinPrice : 3;
  const rentPrice = comic?.rentalCoinPrice !== undefined && comic?.rentalCoinPrice !== null
    ? comic.rentalCoinPrice
    : Math.max(1, ownPrice - 1);
  const rentalDays = comic?.rentalDays || 3;
  // 대여가가 소장가 이상이면 대여를 두는 의미가 없으므로 끈다
  return { ownPrice, rentPrice, rentalDays, rentalEnabled: rentPrice > 0 && rentPrice < ownPrice };
}

module.exports = { isActivePurchase, episodePrices };

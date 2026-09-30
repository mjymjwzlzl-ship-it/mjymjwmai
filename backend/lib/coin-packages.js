// 코인 가격표 (HomeCuration key=coin_packages). 비어 있으면 기본값. 결제 준비·코인 충전 화면이 같이 쓴다.
const { getCuration } = require('./curation');

const DEFAULT_COIN_PACKAGES = [
  { id: 'basic', coins: 10, price: 1980, bonus: 0, description: '기본 패키지' },
  { id: 'standard', coins: 30, price: 5500, bonus: 3, description: '10% 보너스' },
  { id: 'premium', coins: 50, price: 8900, bonus: 5, description: '15% 할인', popular: true },
  { id: 'ultimate', coins: 100, price: 16900, bonus: 15, description: '20% 할인 + 15% 보너스' },
  { id: 'mega', coins: 300, price: 49900, bonus: 60, description: '25% 할인 + 20% 보너스' },
];

async function getCoinPackages() {
  const saved = await getCuration('coin_packages', null);
  return Array.isArray(saved) && saved.length ? saved : DEFAULT_COIN_PACKAGES;
}

module.exports = { DEFAULT_COIN_PACKAGES, getCoinPackages };

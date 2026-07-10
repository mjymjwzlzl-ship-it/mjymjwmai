const axios = require('axios');
const baseURL = 'http://localhost:8000/api';

async function testPurchase() {
  try {
    // 1. 로그인
    console.log('1. test123@arata.com으로 로그인 중...');
    const loginRes = await axios.post(baseURL + '/auth/login', {
      email: 'test123@arata.com',
      password: '12345'
    });
    const token = loginRes.data.token;
    console.log('✅ 로그인 성공!');
    console.log('사용자 정보:', {
      username: loginRes.data.user.username,
      coinBalance: loginRes.data.user.coinBalance || '로그인 응답에 없음',
      adultVerified: loginRes.data.user.adultVerified
    });
    
    // 2. 사용자 정보 재확인
    console.log('\n2. /users/me로 사용자 정보 재확인...');
    const userRes = await axios.get(baseURL + '/users/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('사용자 정보:', {
      username: userRes.data.username,
      coinBalance: userRes.data.coinBalance,
      adultVerified: userRes.data.adultVerified
    });
    
    // 3. 웹툰 목록 확인 및 에피소드 찾기
    console.log('\n3. 웹툰 목록 확인...');
    const webtoonsRes = await axios.get(baseURL + '/comics', {
      headers: { Authorization: 'Bearer ' + token }
    });
    
    if (webtoonsRes.data.comics && webtoonsRes.data.comics.length > 0) {
      const firstComic = webtoonsRes.data.comics[0];
      console.log('첫 번째 웹툰:', firstComic.title);
      
      // 4. 에피소드 목록 확인
      console.log('\n4. 에피소드 목록 확인...');
      const episodesRes = await axios.get(baseURL + '/comics/' + firstComic.id + '/episodes', {
        headers: { Authorization: 'Bearer ' + token }
      });
      
      if (episodesRes.data.episodes && episodesRes.data.episodes.length > 0) {
        // 유료 에피소드 찾기 (3화 이상)
        const paidEpisode = episodesRes.data.episodes.find(ep => ep.episodeNumber >= 3);
        
        if (paidEpisode) {
          console.log('유료 에피소드 발견:', paidEpisode.title, '(ID: ' + paidEpisode.id + ')');
          
          // 5. 에피소드 상세 확인
          console.log('\n5. 에피소드 상세 정보 확인...');
          const episodeDetailRes = await axios.get(baseURL + '/episodes/' + paidEpisode.id, {
            headers: { Authorization: 'Bearer ' + token }
          });
          
          console.log('에피소드 상세:', {
            title: episodeDetailRes.data.episode.title,
            isFree: episodeDetailRes.data.episode.isFree,
            coinPrice: episodeDetailRes.data.episode.coinPrice,
            canView: episodeDetailRes.data.episode.canView,
            needsPurchase: episodeDetailRes.data.episode.needsPurchase
          });
          
          // 6. 구매 필요한 경우 구매 시도
          if (episodeDetailRes.data.episode.needsPurchase) {
            console.log('\n6. 에피소드 구매 시도...');
            console.log('필요 코인:', episodeDetailRes.data.episode.coinPrice);
            console.log('보유 코인:', userRes.data.coinBalance);
            
            const purchaseRes = await axios.post(baseURL + '/episodes/' + paidEpisode.id + '/purchase', {}, {
              headers: { Authorization: 'Bearer ' + token }
            });
            
            console.log('✅ 구매 성공!');
            console.log('구매 결과:', {
              message: purchaseRes.data.message,
              남은코인: purchaseRes.data.coinBalance,
              에피소드: purchaseRes.data.episode.title
            });
          } else if (episodeDetailRes.data.episode.canView) {
            console.log('\n✅ 이미 구매했거나 무료 에피소드입니다.');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 오류:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('서버 오류 상세:', error.response.data);
    }
  }
}

testPurchase();
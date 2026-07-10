const axios = require('axios');

class KakaoAuth {
  constructor() {
    this.clientId = process.env.KAKAO_CLIENT_ID;
    this.clientSecret = process.env.KAKAO_CLIENT_SECRET;
    this.kakaoApiUrl = 'https://kapi.kakao.com';
    this.kakaoAuthUrl = 'https://kauth.kakao.com';
  }

  // 카카오 인증 URL 생성 (연령대 정보 포함 요청)
  getAuthUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'profile_nickname,account_email,age_range,birthday', // 연령대, 생일 정보 요청
      state: state || ''
    });

    return `${this.kakaoAuthUrl}/oauth/authorize?${params.toString()}`;
  }

  // 액세스 토큰 획득
  async getAccessToken(code, redirectUri) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code: code
      });

      const response = await axios.post(
        `${this.kakaoAuthUrl}/oauth/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('카카오 액세스 토큰 획득 오류:', error.response?.data || error.message);
      throw error;
    }
  }

  // 사용자 정보 조회 (연령 정보 포함)
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(`${this.kakaoApiUrl}/v2/user/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          property_keys: JSON.stringify([
            'kakao_account.profile',
            'kakao_account.email',
            'kakao_account.age_range',
            'kakao_account.birthday',
            'kakao_account.birthyear',
            'kakao_account.gender'
          ])
        }
      });

      const kakaoAccount = response.data.kakao_account;
      
      // 연령대 정보로 성인 여부 확인
      const isAdult = this.checkAdultByAgeRange(kakaoAccount.age_range);
      
      return {
        id: response.data.id,
        email: kakaoAccount.email,
        nickname: kakaoAccount.profile?.nickname,
        ageRange: kakaoAccount.age_range,
        birthday: kakaoAccount.birthday, // MMDD
        birthyear: kakaoAccount.birthyear, // YYYY
        gender: kakaoAccount.gender,
        isAdult: isAdult,
        profileImage: kakaoAccount.profile?.profile_image_url
      };
    } catch (error) {
      console.error('카카오 사용자 정보 조회 오류:', error.response?.data || error.message);
      throw error;
    }
  }

  // 연령대로 성인 여부 확인
  checkAdultByAgeRange(ageRange) {
    if (!ageRange) return false;
    
    // 카카오 연령대 형식: "20~29", "30~39" 등
    // 19세 이상인 경우만 성인으로 판단
    const adultRanges = [
      '20~29', '30~39', '40~49', '50~59', 
      '60~69', '70~79', '80~89', '90~'
    ];
    
    return adultRanges.includes(ageRange);
  }

  // 카카오 인증서 성인인증 요청 URL 생성
  getCertAuthUrl(redirectUri) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      prompt: 'cert', // 카카오 인증서 사용
      auth_tran_id: this.generateTransactionId(),
      is_popup: 'false'
    });

    return `${this.kakaoAuthUrl}/oauth/cert/authorize?${params.toString()}`;
  }

  // 카카오 인증서 결과 검증
  async verifyCertAuth(code, redirectUri) {
    try {
      // 먼저 액세스 토큰 획득
      const accessToken = await this.getAccessToken(code, redirectUri);
      
      // 인증서 정보 조회
      const certResponse = await axios.get(`${this.kakaoApiUrl}/v1/user/cert`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const certData = certResponse.data;
      
      // 생년월일로 나이 계산
      if (certData.birthday) {
        const birthYear = parseInt(certData.birthday.substring(0, 4));
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        
        return {
          success: true,
          isAdult: age >= 19,
          age: age,
          name: certData.name,
          birthday: certData.birthday,
          gender: certData.gender,
          ci: certData.ci // 연계정보 (Connecting Information)
        };
      }

      return {
        success: false,
        message: '인증서 정보를 확인할 수 없습니다.'
      };
    } catch (error) {
      console.error('카카오 인증서 검증 오류:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 트랜잭션 ID 생성
  generateTransactionId() {
    return 'ARATA_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 카카오페이 인증 API (KYC)
  async requestKakaoPayAuth(userData) {
    try {
      const response = await axios.post(
        'https://kapi.kakao.com/v1/payment/ready',
        {
          cid: 'TC0ONETIME', // 테스트용 CID
          partner_order_id: this.generateTransactionId(),
          partner_user_id: userData.userId,
          item_name: '성인인증',
          quantity: 1,
          total_amount: 0,
          tax_free_amount: 0,
          approval_url: userData.approvalUrl,
          cancel_url: userData.cancelUrl,
          fail_url: userData.failUrl
        },
        {
          headers: {
            Authorization: `KakaoAK ${this.clientId}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('카카오페이 인증 요청 오류:', error);
      throw error;
    }
  }
}

module.exports = new KakaoAuth();
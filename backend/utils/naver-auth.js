const crypto = require('crypto');
const axios = require('axios');

class NaverAuth {
  constructor() {
    this.clientId = process.env.NAVER_CLIENT_ID;
    this.clientSecret = process.env.NAVER_CLIENT_SECRET;
    this.iv = process.env.NAVER_IV;
    this.apiUrl = 'https://nid.naver.com/nidsvc/gvap/1.0/request';
  }

  // AES-256-CBC 암호화
  encrypt(text) {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      Buffer.from(this.clientSecret, 'utf8'),
      Buffer.from(this.iv, 'utf8')
    );
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  // AES-256-CBC 복호화
  decrypt(encryptedText) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.clientSecret, 'utf8'),
      Buffer.from(this.iv, 'utf8')
    );
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // 인증 요청 URL 생성
  getAuthUrl(returnUrl, failUrl) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: returnUrl,
      auth_type: 'M', // M: 휴대폰 인증
      mobile_type: 'W', // W: 웹
      fail_url: failUrl || returnUrl,
      verify_type: 'ADULT' // 성인인증
    });

    return `https://nid.naver.com/nidsvc/gvap/1.0/authorize?${params.toString()}`;
  }

  // 인증 결과 검증
  async verifyAuth(code, state) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        state: state
      });

      const response = await axios.post(
        'https://nid.naver.com/oauth2.0/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data.access_token) {
        // 사용자 정보 조회
        const userInfo = await this.getUserInfo(response.data.access_token);
        return {
          success: true,
          data: userInfo
        };
      }

      return {
        success: false,
        message: '인증 토큰 획득 실패'
      };
    } catch (error) {
      console.error('네이버 인증 검증 오류:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 사용자 정보 조회
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (response.data.resultcode === '00') {
        const userInfo = response.data.response;
        
        // 생년월일로 나이 계산
        const birthYear = parseInt(userInfo.birthyear);
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear + 1; // 한국 나이

        return {
          id: userInfo.id,
          name: userInfo.name,
          birthYear: userInfo.birthyear,
          birthday: userInfo.birthday, // MM-DD
          gender: userInfo.gender,
          mobile: userInfo.mobile,
          age: age,
          isAdult: age >= 19
        };
      }

      throw new Error('사용자 정보 조회 실패');
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      throw error;
    }
  }

  // 휴대폰 본인인증 요청
  async requestMobileAuth(data) {
    try {
      const encryptedData = this.encrypt(JSON.stringify({
        name: data.name,
        birthday: data.birthday, // YYYYMMDD
        gender: data.gender, // 1: 남자, 2: 여자
        mobile: data.mobile,
        carrier: data.carrier // SKT, KT, LGU+
      }));

      const response = await axios.post(
        'https://nid.naver.com/nidsvc/gvap/1.0/request',
        {
          client_id: this.clientId,
          encrypted_data: encryptedData,
          auth_type: 'M'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('휴대폰 인증 요청 오류:', error);
      throw error;
    }
  }

  // 인증번호 확인
  async verifyMobileCode(requestId, verifyCode) {
    try {
      const response = await axios.post(
        'https://nid.naver.com/nidsvc/gvap/1.0/verify',
        {
          client_id: this.clientId,
          request_id: requestId,
          verify_code: verifyCode
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.result === 'SUCCESS') {
        // 암호화된 사용자 정보 복호화
        const decryptedData = this.decrypt(response.data.encrypted_data);
        return {
          success: true,
          data: JSON.parse(decryptedData)
        };
      }

      return {
        success: false,
        message: response.data.message || '인증 실패'
      };
    } catch (error) {
      console.error('인증번호 확인 오류:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new NaverAuth();
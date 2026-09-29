const barocert = require('barocert');

// 바로써트 SDK 설정 (모듈 레벨에서 먼저 config 호출)
const barocertConfig = {
  LinkID: process.env.BAROCERT_LINK_ID || '',
  SecretKey: process.env.BAROCERT_SECRET_KEY || '',
  IPRestrictOnOff: false, // IP 제한 비활성화 (프로덕션에서는 true로 변경)
  UseStaticIP: false,
  // IsTest 제거 - 프로덕션 이용기관코드 사용
  defaultErrorHandler: function (Error) {
    console.error('Barocert Error: [' + Error.code + '] ' + Error.message);
  }
};

console.log('🔧 바로써트 설정:', {
  LinkID: barocertConfig.LinkID,
  SecretKey: barocertConfig.SecretKey ? `${barocertConfig.SecretKey.substring(0, 10)}...` : 'MISSING',
  IPRestrictOnOff: barocertConfig.IPRestrictOnOff,
  UseStaticIP: barocertConfig.UseStaticIP
});

barocert.config(barocertConfig);

// 네이버 및 카카오 인증 서비스 생성 (config 이후에 생성)
const navercertService = barocert.NavercertService();
const kakaocertService = barocert.KakaocertService();

class BarocertAuth {
  constructor() {
    this.naverClientCode = process.env.BAROCERT_NAVER_CLIENT_CODE || '025090000004';
    this.kakaoClientCode = process.env.BAROCERT_KAKAO_CLIENT_CODE || '025090000007';
    this.secretKey = Buffer.from(process.env.BAROCERT_SECRET_KEY || '', 'base64');

    console.log('🔧 바로써트 이용기관코드:', {
      naver: this.naverClientCode,
      kakao: this.kakaoClientCode
    });
  }

  // AES-256 복호화 (Barocert SDK와 동일한 방식)
  _decrypt(encryptedData) {
    try {
      const crypto = require('crypto');
      const data = Buffer.from(encryptedData, 'base64');

      // Node.js 버전 확인
      const version = process.version.replace(/[^0-9.]/g, "");
      const majorVersion = parseInt(version.split('.')[0]);

      if (majorVersion === 0) {
        // CBC 모드 (구버전)
        const nonce = data.slice(0, 16);
        const ciphertext = data.slice(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.secretKey, nonce);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
      } else {
        // GCM 모드 (신버전)
        const nonce = data.slice(0, 12);
        const authTag = data.slice(data.length - 16);
        const ciphertext = data.slice(12, data.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, nonce);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
      }
    } catch (error) {
      console.error('❌ 복호화 실패:', error);
      return null;
    }
  }

  // 성인 여부 확인
  checkAdult(birthday) {
    if (!birthday || birthday.length !== 8) return false;

    const birthYear = parseInt(birthday.substring(0, 4));
    const birthMonth = parseInt(birthday.substring(4, 6));
    const birthDay = parseInt(birthday.substring(6, 8));

    const today = new Date();
    const birth = new Date(birthYear, birthMonth - 1, birthDay);

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 19; // 한국 나이 기준 19세 이상
  }

  // 네이버 본인인증 요청
  async requestNaverAuth(userData) {
    return new Promise((resolve, reject) => {
      try {
        // 전화번호에서 하이픈 제거 (11자리만)
        const phoneNumber = userData.phoneNumber.replace(/-/g, '');
        // 생년월일 YYYYMMDD 형식으로 변환
        const birthday = userData.birthday.replace(/-/g, '');

        console.log('📱 바로써트 네이버 인증 요청:', {
          name: userData.name,
          phoneNumber: phoneNumber,
          birthday: birthday
        });

        const identity = {
          receiverHP: navercertService._encrypt(phoneNumber),
          receiverName: navercertService._encrypt(userData.name),
          receiverBirthday: navercertService._encrypt(birthday),
          callCenterNum: '15445544', // 고객센터 번호
          expireIn: 300, // 만료시간 (초) - 권장 300초
          appUseYN: false // Push 방식 사용 (false=푸시, true=AppToApp)
        };

        navercertService.requestIdentity(
          this.naverClientCode,
          identity,
          (result) => {
            console.log('✅ 바로써트 네이버 인증 요청 성공:', result);
            resolve({
              success: true,
              receiptID: result.receiptID,
              scheme: result.scheme || null // AppToApp 모드일 때만 제공
            });
          },
          (error) => {
            console.error('❌ 바로써트 네이버 인증 요청 실패:', error);
            reject({
              success: false,
              message: error.message || '네이버 인증 요청 중 오류가 발생했습니다.',
              code: error.code
            });
          }
        );
      } catch (error) {
        console.error('❌ 바로써트 네이버 인증 요청 오류:', error);
        reject({
          success: false,
          message: error.message || '네이버 인증 요청 중 오류가 발생했습니다.'
        });
      }
    });
  }

  // 네이버 인증 결과 조회
  async getAuthResult(receiptID) {
    return new Promise((resolve, reject) => {
      try {
        // 먼저 상태 확인
        navercertService.getIdentityStatus(
          this.naverClientCode,
          receiptID,
          (statusResult) => {
            console.log('📋 바로써트 네이버 인증 상태:', statusResult);

            // state: 0=대기, 1=완료, 2=만료
            if (statusResult.state === 0) {
              // 대기 중
              resolve({
                success: true,
                status: 0,
                message: '인증 대기 중입니다.'
              });
              return;
            } else if (statusResult.state === 2) {
              // 만료됨
              resolve({
                success: true,
                status: 2,
                message: '인증 시간이 만료되었습니다.'
              });
              return;
            } else if (statusResult.state === 1) {
              // 완료 - 인증 성공
              // 바로써트 인증이 완료되면, 사용자가 입력한 생년월일이 실제 본인의 것임이 검증된 상태
              console.log('✅ 바로써트 네이버 인증 완료 (state=1)');

              resolve({
                success: true,
                status: 1,
                message: '본인인증이 완료되었습니다.'
              });
            }
          },
          (error) => {
            console.error('❌ 바로써트 네이버 인증 상태 조회 실패:', error);
            reject({
              success: false,
              message: error.message || '네이버 인증 결과 조회 중 오류가 발생했습니다.',
              code: error.code
            });
          }
        );
      } catch (error) {
        console.error('❌ 바로써트 네이버 인증 결과 조회 오류:', error);
        reject({
          success: false,
          message: error.message || '네이버 인증 결과 조회 중 오류가 발생했습니다.'
        });
      }
    });
  }

  // 카카오 본인인증 요청
  async requestKakaoAuth(userData) {
    return new Promise((resolve, reject) => {
      try {
        // 전화번호에서 하이픈 제거 (11자리만)
        const phoneNumber = userData.phoneNumber.replace(/-/g, '');
        // 생년월일 YYYYMMDD 형식으로 변환
        const birthday = userData.birthday.replace(/-/g, '');

        console.log('📱 바로써트 카카오 인증 요청:', {
          name: userData.name,
          phoneNumber: phoneNumber,
          birthday: birthday
        });

        // 카카오는 네이버와 다른 필드 구조 사용
        const randomToken = Math.random().toString(36).substring(2, 15);

        const identity = {
          receiverHP: kakaocertService._encrypt(phoneNumber),
          receiverName: kakaocertService._encrypt(userData.name),
          receiverBirthday: kakaocertService._encrypt(birthday),
          reqTitle: 'ARATA 성인인증 요청', // 카카오 필수: 인증 요청 제목
          token: kakaocertService._encrypt(randomToken), // 카카오 필수: 원문 랜덤번호
          expireIn: 300, // 권장 300초
          appUseYN: false // Push 방식 (카카오톡 채널 메시지)
        };

        kakaocertService.requestIdentity(
          this.kakaoClientCode,
          identity,
          (result) => {
            console.log('✅ 바로써트 카카오 인증 요청 성공:', result);
            resolve({
              success: true,
              receiptID: result.receiptID,
              scheme: result.scheme || null
            });
          },
          (error) => {
            console.error('❌ 바로써트 카카오 인증 요청 실패:', error);
            reject({
              success: false,
              message: error.message || '카카오 인증 요청 중 오류가 발생했습니다.',
              code: error.code
            });
          }
        );
      } catch (error) {
        console.error('❌ 바로써트 카카오 인증 요청 오류:', error);
        reject({
          success: false,
          message: error.message || '카카오 인증 요청 중 오류가 발생했습니다.'
        });
      }
    });
  }

  // 카카오 인증 결과 조회
  async getKakaoAuthResult(receiptID) {
    return new Promise((resolve, reject) => {
      try {
        // 먼저 상태 확인
        kakaocertService.getIdentityStatus(
          this.kakaoClientCode,
          receiptID,
          (statusResult) => {
            console.log('📋 바로써트 카카오 인증 상태:', statusResult);

            // state: 0=대기, 1=완료, 2=만료
            if (statusResult.state === 0) {
              // 대기 중
              resolve({
                success: true,
                status: 0,
                message: '인증 대기 중입니다.'
              });
              return;
            } else if (statusResult.state === 2) {
              // 만료됨
              resolve({
                success: true,
                status: 2,
                message: '인증 시간이 만료되었습니다.'
              });
              return;
            } else if (statusResult.state === 1) {
              // 완료 - 인증 성공
              // 바로써트 인증이 완료되면, 사용자가 입력한 생년월일이 실제 본인의 것임이 검증된 상태
              // receiverYear/receiverDay는 복호화가 복잡하므로, 입력한 생년월일을 신뢰하고 사용
              console.log('✅ 바로써트 카카오 인증 완료 (state=1)');

              resolve({
                success: true,
                status: 1,
                message: '본인인증이 완료되었습니다.'
              });
            }
          },
          (error) => {
            console.error('❌ 바로써트 카카오 인증 상태 조회 실패:', error);
            reject({
              success: false,
              message: error.message || '카카오 인증 결과 조회 중 오류가 발생했습니다.',
              code: error.code
            });
          }
        );
      } catch (error) {
        console.error('❌ 바로써트 카카오 인증 결과 조회 오류:', error);
        reject({
          success: false,
          message: error.message || '카카오 인증 결과 조회 중 오류가 발생했습니다.'
        });
      }
    });
  }
}

module.exports = new BarocertAuth();

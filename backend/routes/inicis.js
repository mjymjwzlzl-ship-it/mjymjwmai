const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// 이니시스 테스트 설정
const INICIS_CONFIG = {
  mid: 'INIpayTest',
  signKey: 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS',
  // 테스트 URL
  authUrl: 'https://stgstdpay.inicis.com/stdpay/INIStdPayRequest.jsp',
  returnUrl: process.env.NODE_ENV === 'production' 
    ? 'https://arata.co.kr/payment/inicis-return'
    : 'http://localhost:4000/payment/inicis-return',
  closeUrl: process.env.NODE_ENV === 'production'
    ? 'https://arata.co.kr/payment/close'
    : 'http://localhost:4000/payment/close'
};

// 결제 요청 페이지 생성
router.get('/pay', (req, res) => {
  try {
    console.log('📋 이니시스 결제 페이지 요청:', req.query);
    const { amount, coins, merchantUid, buyerName, buyerEmail } = req.query;
    
    const mKey = crypto.createHash('sha256').update(INICIS_CONFIG.signKey).digest('hex');
    const oid = merchantUid || `ARATA_${Date.now()}`;
    const price = amount || '1000';
    const timestamp = new Date().getTime();
    const goodname = `ARATA 코인 ${coins || '10'}개`;
    
    // 서명 생성
    const signature = crypto.createHash('sha256')
      .update(`oid=${oid}&price=${price}&timestamp=${timestamp}`)
      .digest('hex');
    
    // HTML 페이지 직접 생성 (템플릿 없이)
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ARATA 결제</title>
    <script src="https://stgstdpay.inicis.com/stdjs/INIStdPay.js" charset="UTF-8"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        .info {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .info p {
            margin: 10px 0;
            color: #666;
        }
        .info strong {
            color: #333;
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 18px;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover {
            background: #5a67d8;
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        .loading {
            display: none;
            margin-top: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 ARATA 코인 충전</h1>
        <div class="info">
            <p><strong>상품명:</strong> ${goodname}</p>
            <p><strong>결제금액:</strong> ${Number(price).toLocaleString()}원</p>
            <p><strong>구매자:</strong> ${buyerName || '테스터'}</p>
            <p><strong>이메일:</strong> ${buyerEmail || 'test@test.com'}</p>
        </div>
        
        <form id="SendPayForm_id" method="POST">
            <input type="hidden" name="version" value="1.0">
            <input type="hidden" name="mid" value="${INICIS_CONFIG.mid}">
            <input type="hidden" name="oid" value="${oid}">
            <input type="hidden" name="goodname" value="${goodname}">
            <input type="hidden" name="price" value="${price}">
            <input type="hidden" name="currency" value="WON">
            <input type="hidden" name="buyername" value="${buyerName || '테스터'}">
            <input type="hidden" name="buyertel" value="010-1234-5678">
            <input type="hidden" name="buyeremail" value="${buyerEmail || 'test@test.com'}">
            <input type="hidden" name="timestamp" value="${timestamp}">
            <input type="hidden" name="signature" value="${signature}">
            <input type="hidden" name="returnUrl" value="${INICIS_CONFIG.returnUrl}">
            <input type="hidden" name="closeUrl" value="${INICIS_CONFIG.closeUrl}">
            <input type="hidden" name="mKey" value="${mKey}">
            <input type="hidden" name="gopaymethod" value="Card">
            <input type="hidden" name="acceptmethod" value="HPP(1):below1000:va_receipt">
            
            <button type="button" onclick="INIStdPay.pay('SendPayForm_id')">
                💳 결제하기
            </button>
        </form>
        
        <div class="loading" id="loading">
            결제 창을 준비하고 있습니다...
        </div>
    </div>

    <script>
        // 결제창 닫힘 감지
        window.addEventListener('message', function(event) {
            if (event.data === 'payment_close') {
                // 부모 창에 결제 취소 메시지 전달
                if (window.opener) {
                    window.opener.postMessage({ type: 'payment-closed' }, '*');
                    window.close();
                }
            }
        });
    </script>
</body>
</html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('이니시스 결제 페이지 생성 오류:', error);
    res.status(500).send('결제 페이지 생성 중 오류가 발생했습니다.');
  }
});

// 결제 결과 수신
router.post('/return', (req, res) => {
  try {
    console.log('이니시스 결제 결과:', req.body);
    
    const { resultCode, resultMsg, tid, MOID, TotPrice } = req.body;
    
    if (resultCode === '0000') {
      // 결제 성공
      res.redirect(`/payment/inicis-return?resultCode=${resultCode}&resultMsg=${encodeURIComponent(resultMsg)}&tid=${tid}&MOID=${MOID}&amount=${TotPrice}`);
    } else {
      // 결제 실패
      res.redirect(`/payment/inicis-return?resultCode=${resultCode}&resultMsg=${encodeURIComponent(resultMsg)}`);
    }
  } catch (error) {
    console.error('이니시스 결제 결과 처리 오류:', error);
    res.status(500).send('결제 결과 처리 중 오류가 발생했습니다.');
  }
});

module.exports = router;
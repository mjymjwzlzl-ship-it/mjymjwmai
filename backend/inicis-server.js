const express = require("express"); 
const app = express();
const crypto = require('crypto'); 
const bodyParser = require("body-parser");
const request = require('request');
const cors = require('cors');
const path = require('path');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

// EJS 템플릿 설정
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);

// Properties 설정
const getAuthUrl = (idc_name) => {
  const urls = {
    'fc': 'https://fcstdpay.inicis.com/stdpay/pay_complete',
    'kcp': 'https://kcpstdpay.inicis.com/stdpay/pay_complete',
    'kicc': 'https://kiccstdpay.inicis.com/stdpay/pay_complete'
  };
  // 테스트 환경은 항상 fc 사용
  return 'https://stgfcstdpay.inicis.com/stdpay/pay_complete'; // 테스트용
};

const getNetCancel = (idc_name) => {
  // 테스트 환경은 항상 fc 사용
  return 'https://stgfcstdpay.inicis.com/stdpay/net_cancel';
};

// 결제 요청 페이지
app.get("/inicis/pay", (req, res) => {
    const { amount, coins, merchantUid, buyerName, buyerEmail } = req.query;
    
    const mid = "INIpayTest";                                               // 상점아이디
    const signKey = "SU5JTElURV9UUklQTEVERVNfS0VZU1RS";
    const mKey = crypto.createHash("sha256").update(signKey).digest('hex'); // SHA256 Hash값
    const oid = merchantUid || `ARATA_${Date.now()}`;                      // 주문번호
    const price = amount || "1000";                                        // 결제금액
    const timestamp = new Date().getTime();                                // 타임스템프
    const use_chkfake = "Y";    
    const goodname = `ARATA 코인 ${coins || '10'}개`;                      
    const signature  = crypto.createHash("sha256").update("oid="+oid+"&price="+price+"&timestamp="+timestamp).digest('hex');
    const verification = crypto.createHash("sha256").update("oid="+oid+"&price="+price+"&signKey="+signKey+"&timestamp="+timestamp).digest('hex');

    res.render("inicis_pay_req.html", {
        mid,
        oid,
        price,
        timestamp,
        mKey,
        use_chkfake,
        signature,
        verification,
        goodname,
        buyername: buyerName || '테스터',
        buyeremail: buyerEmail || 'test@test.com'
    });
});

// 결제 결과 처리
app.post("/inicis/return", async (req, res) => {
    console.log('📋 이니시스 결제 결과 수신:', req.body);
    
    if(req.body.resultCode === "0000"){
        const mid = req.body.mid;                       
        const signKey = "SU5JTElURV9UUklQTEVERVNfS0VZU1RS";
        const authToken = req.body.authToken;           
        const netCancelUrl = req.body.netCancelUrl;     
        const timestamp = new Date().getTime();         
        const charset = "UTF-8";                        
        const format = "JSON";                          

        const idc_name = req.body.idc_name || 'fc';             
        const authUrl2 = getAuthUrl(idc_name);

        // SHA256 Hash값
        const signature  = crypto.createHash("sha256").update("authToken="+authToken+"&timestamp="+timestamp).digest('hex');
        const verification  = crypto.createHash("sha256").update("authToken="+authToken+"&signKey="+signKey+"&timestamp="+timestamp).digest('hex');
    
        // 결제 승인 요청 
        let options = { 
            mid,
            authToken, 
            timestamp,
            signature,
            verification,
            charset,
            format
        };

        request.post({method: 'POST', uri: authUrl2, form: options, json: true}, (err, httpResponse, body) => { 
            try {
                let jsoncode = (err) ? err : JSON.stringify(body);
                let result = JSON.parse(jsoncode);
                
                console.log('✅ 이니시스 승인 결과:', result);
                
                // 백엔드 API로 결제 완료 처리 요청
                const backendUrl = 'http://localhost:8000/api/payment/inicis-complete';
                request.post({
                    uri: backendUrl,
                    json: true,
                    body: {
                        resultCode: result.resultCode,
                        resultMsg: result.resultMsg,
                        tid: result.tid,
                        MOID: result.MOID,
                        TotPrice: result.TotPrice
                    }
                }, (backendErr, backendResponse, backendBody) => {
                    if (backendErr) {
                        console.error('❌ 백엔드 API 호출 실패:', backendErr);
                    } else {
                        console.log('✅ 백엔드 결제 완료 처리:', backendBody);
                    }
                });
                
                // 결과 페이지 렌더링
                res.render('inicis_pay_return.ejs', {
                    resultCode: result.resultCode,
                    resultMsg: result.resultMsg,
                    tid: result.tid,
                    MOID: result.MOID,
                    TotPrice: result.TotPrice,
                    goodName: result.goodName,
                    applDate: result.applDate,
                    applTime: result.applTime
                });
            } catch(e) {
                console.error('❌ 결제 처리 중 오류:', e);
                const netCancelUrl2 = getNetCancel(idc_name);
                request.post({method: 'POST', uri: netCancelUrl2, form: options, json: true}, (err, httpResponse, body) => {
                    let result = (err) ? err : JSON.stringify(body);
                    console.log("망취소 결과:", result);
                });
                
                res.render('inicis_pay_return.ejs', {
                    resultCode: '9999',
                    resultMsg: '결제 처리 중 오류가 발생했습니다.',
                    tid: '',
                    MOID: req.body.oid,
                    TotPrice: req.body.price,
                    goodName: '',
                    applDate: '',
                    applTime: ''
                });
            }
        });
    } else {
        // 결제 실패
        res.render('inicis_pay_return.ejs', {
            resultCode: req.body.resultCode,
            resultMsg: req.body.resultMsg,
            tid: req.body.tid || '',
            MOID: req.body.MOID || req.body.oid,
            TotPrice: req.body.TotPrice || req.body.price,
            goodName: req.body.goodName || '',
            applDate: req.body.applDate || '',
            applTime: req.body.applTime || ''
        });
    }
});

// 결제창 닫기
app.get('/inicis/close', (req, res) => {
    res.send('<script language="javascript" type="text/javascript" src="https://stdpay.inicis.com/stdjs/INIStdPay_close.js" charset="UTF-8"></script>');
});

const PORT = 8002;
app.listen(PORT, (err) => {
    if(err) return console.log(err);
    console.log(`✅ 이니시스 결제 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
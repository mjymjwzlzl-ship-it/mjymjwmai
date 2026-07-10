@echo off
echo =====================================
echo ARATA 프로덕션 서버 시작
echo =====================================
echo.

REM prerender-manifest.json 파일 체크 및 생성
if not exist ".next\prerender-manifest.json" (
    echo prerender-manifest.json 파일이 없습니다. 생성 중...
    echo {"version":3,"routes":{},"dynamicRoutes":{},"notFoundRoutes":[],"preview":{"previewModeId":"preview-mode-id","previewModeSigningKey":"signing-key","previewModeEncryptionKey":"encryption-key"}} > .next\prerender-manifest.json
    echo 파일 생성 완료!
    echo.
)

REM 프로덕션 서버 시작
echo 프로덕션 서버를 시작합니다...
npm run start
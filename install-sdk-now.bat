@echo off
echo ========================================
echo Android SDK 자동 설치 스크립트
echo ========================================
echo.

REM Android SDK 위치 설정
set ANDROID_SDK_ROOT=C:\Android\sdk
set ANDROID_HOME=%ANDROID_SDK_ROOT%

echo Android SDK를 다음 위치에 설치합니다: %ANDROID_SDK_ROOT%
echo.

REM SDK 디렉토리 생성
echo [1/5] SDK 디렉토리 생성...
mkdir "%ANDROID_SDK_ROOT%" 2>nul
mkdir "%ANDROID_SDK_ROOT%\cmdline-tools" 2>nul

echo.
echo [2/5] Command Line Tools 다운로드 필요
echo.
echo ========================================
echo 수동 다운로드가 필요합니다:
echo ========================================
echo.
echo 1. 브라우저 열기
echo 2. 다음 주소로 이동:
echo    https://developer.android.com/studio#command-line-tools-only
echo.
echo 3. Windows 버전 다운로드:
echo    commandlinetools-win-11076708_latest.zip
echo.
echo 4. 다운로드한 ZIP 파일 압축 해제 위치:
echo    %ANDROID_SDK_ROOT%\cmdline-tools\
echo.
echo 5. 압축 해제 후 폴더 이름을 'latest'로 변경:
echo    %ANDROID_SDK_ROOT%\cmdline-tools\latest\
echo.
pause

REM 설치 확인
if not exist "%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo.
    echo [오류] sdkmanager를 찾을 수 없습니다.
    echo Command Line Tools가 올바르게 설치되었는지 확인하세요.
    pause
    exit /b 1
)

echo.
echo [3/5] 환경변수 설정...
setx ANDROID_HOME "%ANDROID_SDK_ROOT%" >nul
setx ANDROID_SDK_ROOT "%ANDROID_SDK_ROOT%" >nul
set PATH=%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin;%ANDROID_SDK_ROOT%\platform-tools;%ANDROID_SDK_ROOT%\build-tools\34.0.0;%PATH%

echo.
echo [4/5] SDK 패키지 설치 중... (10-15분 소요)
cd /d "%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin"

echo.
echo 라이센스 동의 (모든 질문에 'y' 입력)...
call sdkmanager --licenses

echo.
echo 필수 SDK 패키지 설치...
call sdkmanager "platform-tools" "platforms;android-33" "platforms;android-34" "build-tools;33.0.0" "build-tools;34.0.0"

echo.
echo [5/5] local.properties 파일 업데이트...
echo sdk.dir=%ANDROID_SDK_ROOT%> "D:\ARATA\arata-mobile\android\local.properties"

echo.
echo ========================================
echo 설치 완료!
echo ========================================
echo.
echo ANDROID_HOME: %ANDROID_SDK_ROOT%
echo.
echo 이제 다시 빌드를 실행하세요:
echo D:\ARATA\simple-build.bat
echo.
pause
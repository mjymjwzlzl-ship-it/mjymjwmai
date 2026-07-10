@echo off
echo ========================================
echo Android SDK 빠른 설치 (자동)
echo ========================================
echo.

REM Java 확인
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot
"%JAVA_HOME%\bin\java" -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Java를 찾을 수 없습니다.
    pause
    exit /b 1
)
echo [✓] Java 확인 완료

REM Android SDK 경로 설정
set ANDROID_HOME=C:\Android\sdk
set ANDROID_CMDLINE_TOOLS=%ANDROID_HOME%\cmdline-tools

echo.
echo [1/4] Android SDK 디렉토리 생성...
mkdir "%ANDROID_HOME%" 2>nul
mkdir "%ANDROID_CMDLINE_TOOLS%" 2>nul

echo.
echo [2/4] Command Line Tools 다운로드 중...
echo.
echo 다음 단계를 따라주세요:
echo.
echo 1. 웹브라우저 열기
echo 2. 다음 주소로 이동: https://developer.android.com/studio#command-line-tools-only
echo 3. "Download options" 섹션에서 Windows 버전 다운로드
echo    파일명: commandlinetools-win-11076708_latest.zip (또는 최신 버전)
echo.
echo 4. 다운로드한 ZIP 파일의 압축을 다음 위치에 풀기:
echo    %ANDROID_CMDLINE_TOOLS%\
echo.
echo 5. 압축 해제 후 폴더 구조가 다음과 같아야 함:
echo    %ANDROID_CMDLINE_TOOLS%\cmdline-tools\bin\
echo    %ANDROID_CMDLINE_TOOLS%\cmdline-tools\lib\
echo.
echo 압축 해제가 완료되면 Enter를 누르세요...
pause >nul

REM cmdline-tools를 latest로 이동
echo.
echo [3/4] SDK 도구 설정 중...
if exist "%ANDROID_CMDLINE_TOOLS%\cmdline-tools" (
    move "%ANDROID_CMDLINE_TOOLS%\cmdline-tools" "%ANDROID_CMDLINE_TOOLS%\latest" 2>nul
    echo [✓] SDK 도구 설정 완료
) else (
    echo [!] cmdline-tools 폴더를 찾을 수 없습니다.
    echo     압축이 올바르게 해제되었는지 확인하세요.
    pause
    exit /b 1
)

REM 환경변수 설정
echo.
echo [4/4] 환경변수 설정 중...
setx ANDROID_HOME "%ANDROID_HOME%" >nul 2>&1
setx ANDROID_SDK_ROOT "%ANDROID_HOME%" >nul 2>&1

REM 현재 세션용 PATH 설정
set PATH=%ANDROID_CMDLINE_TOOLS%\latest\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo [✓] 환경변수 설정 완료
echo.
echo ========================================
echo SDK 구성요소 설치
echo ========================================
echo.

cd /d "%ANDROID_CMDLINE_TOOLS%\latest\bin"

echo 라이센스 동의 (모든 라이센스에 'y' 입력)...
call sdkmanager --licenses

echo.
echo 필수 SDK 패키지 설치 중... (5-10분 소요)
call sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0" "platforms;android-34" "build-tools;34.0.0"

echo.
echo ========================================
echo 설치 완료!
echo ========================================
echo.
echo ANDROID_HOME: %ANDROID_HOME%
echo.
echo 이제 다음 명령으로 APK를 빌드할 수 있습니다:
echo D:\ARATA\arata-mobile\android\build-apk.bat
echo.
pause
@echo off
echo ========================================
echo Android SDK Command Line Tools 설치
echo ========================================
echo.

set ANDROID_HOME=C:\Android\sdk
set PATH=%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo [1/5] Android SDK 디렉토리 생성...
mkdir %ANDROID_HOME% 2>nul
cd /d %ANDROID_HOME%

echo.
echo [2/5] Command Line Tools 다운로드...
echo 브라우저에서 다음 링크를 열어 다운로드하세요:
echo https://developer.android.com/studio#command-line-tools-only
echo.
echo Windows용 commandlinetools-win-*.zip 파일을 다운로드하세요.
echo.
echo 다운로드 완료 후 이 위치에 압축을 푸세요:
echo %ANDROID_HOME%\cmdline-tools\
echo.
pause

echo.
echo [3/5] 환경변수 설정...
setx ANDROID_HOME "%ANDROID_HOME%"
setx PATH "%PATH%"

echo.
echo [4/5] SDK 구성요소 설치...
echo 다음 명령을 실행하세요:
echo.
echo cd %ANDROID_HOME%\cmdline-tools\latest\bin
echo sdkmanager --licenses
echo sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
echo.
pause

echo.
echo [5/5] 설치 확인...
echo ANDROID_HOME: %ANDROID_HOME%
echo.
echo 설치가 완료되면 D:\ARATA\arata-mobile\android\build-apk.bat을 실행하세요.
echo.
pause
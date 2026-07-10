# ARATA 웹툰 Android 앱 빌드 가이드

## 현재 상태
- ✅ Java JDK 21 설치됨 (Eclipse Adoptium)
- ✅ React Native + Expo 프로젝트 생성 완료
- ✅ Android 네이티브 코드 생성 완료
- ❌ Android SDK 미설치

## APK 빌드 방법

### 방법 1: Android Studio 설치 (권장)
1. Android Studio 다운로드 및 설치
   - https://developer.android.com/studio
   - 설치 시 Android SDK 자동 설치됨

2. 환경변수 설정
   ```
   ANDROID_HOME=C:\Users\user\AppData\Local\Android\Sdk
   ```

3. APK 빌드
   ```bash
   cd D:\ARATA\arata-mobile\android
   build-apk.bat
   ```

### 방법 2: Command Line Tools만 설치
1. Android Command Line Tools 다운로드
   - https://developer.android.com/studio#command-tools
   
2. SDK 설치
   ```bash
   sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
   ```

3. APK 빌드
   ```bash
   cd D:\ARATA\arata-mobile\android
   build-apk.bat
   ```

### 방법 3: Expo EAS Build 사용 (온라인 빌드)
1. Expo 계정 생성
   - https://expo.dev 가입

2. EAS CLI 로그인
   ```bash
   eas login
   ```

3. 빌드 실행
   ```bash
   cd D:\ARATA\arata-mobile
   eas build -p android --profile production
   ```

4. 빌드 완료 후 APK 다운로드

## 빠른 시작
Android Studio를 설치하는 것이 가장 간단합니다:
1. https://developer.android.com/studio 에서 다운로드
2. 설치 (기본 설정 사용)
3. `D:\ARATA\arata-mobile\android\build-apk.bat` 실행

## 빌드된 APK 위치
- 빌드 성공 시: `D:\ARATA\arata-mobile\android\app\build\outputs\apk\release\app-release.apk`
- 웹사이트 배포용: `D:\ARATA\public\downloads\arata-webtoon-1.0.0.apk`로 복사
// 관리자 센터 CSS 빌드 설정 (없으면 Next 가 Tailwind 를 돌리지 않아 화면이 스타일 없이 나온다)
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

# NovelStory

> 서비스명: **WhiteNoard**

웹소설 작가를 위한 스토리 설계 웹 서비스. 화이트보드에 쓰듯 작중 사건, 캐릭터 변화, 설정을 한 화면에서 정리.

## 핵심 기능
- **소설별 관리**: 서재에서 작품 단위로 보드·위키·메모 관리
- **화이트보드 타임라인**: 무한 캔버스의 시간축 위에 사건 블록, 아래에 캐릭터 등장·변화·퇴장 블록 배치. 포스트잇·화살표·프레임 자유 배치
- **서술 순서 관리**: 작중 시간순과 별개로 회차별 서술 순서 구성, 회상·복선 표시
- **설정 위키**: 캐릭터·사건·장소·세계관 문서, 속성·템플릿·`@` 링크. 보드 블록과 연동

## 기술 스택
React + TypeScript + Vite + Tailwind CSS v4 + React Flow, Cloudflare Workers(Static Assets) 무료 티어 배포

## 문서
- [기능 명세](docs/design/features_spec.md)
- [기술 스택](docs/design/tech-stack.md)
- [UI 가이드](docs/design/UIGuide.md)
- [기술 스파이크 검증 방법](docs/design/spikes.md)
- [레퍼런스](docs/references.md)
- [할 일](docs/TODO.md)
- [진행 상태](docs/STATUS.md)

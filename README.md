# 🎉 스마트 발표자 뽑기 (Smart Speaker Picker)

제공해주신 파이썬 코드를 기반으로 제작된 **스마트 발표자 추첨 프로그램**입니다.  
환경에 따라 가장 편하게 사용하실 수 있도록 **2가지 GUI 버전(Python Tkinter 데스크톱 앱 & 웹 브라우저 앱)**을 모두 준비했습니다.

---

## 📂 파일 구성

- **[main.py](file:///c:/Users/iwink/OneDrive/Desktop/발표자뽑기/main.py)**: Python `tkinter` 기반의 데스크톱 GUI 프로그램
- **[run.bat](file:///c:/Users/iwink/OneDrive/Desktop/발표자뽑기/run.bat)**: 파이썬 앱을 한 번의 더블 클릭으로 실행할 수 있는 실행 배치 파일
- **[index.html](file:///c:/Users/iwink/OneDrive/Desktop/발표자뽑기/index.html)**: 웹 브라우저(크롬, 엣지 등)에서 바로 열어 사용할 수 있는 웹 GUI
- **[style.css](file:///c:/Users/iwink/OneDrive/Desktop/발표자뽑기/style.css)**: 네온 글래스모피즘 & 모던 디자인 스타일시트
- **[app.js](file:///c:/Users/iwink/OneDrive/Desktop/발표자뽑기/app.js)**: 룰렛 애니메이션, Web Audio 효과음, 폭죽(Confetti) 로직

---

## 🚀 사용 방법

### 1. 웹 브라우저 GUI 버전 (추천 - 무설치 즉시 실행)
1. 폴더 내의 **`index.html`** 파일을 더블 클릭하여 크롬(Chrome)이나 엣지(Edge)로 엽니다.
2. 별도의 프로그램이나 파이썬 설치 없이 모든 애니메이션, 사운드, 폭죽 효과를 바로 이용할 수 있습니다.
3. **주요 기능:**
   - 🔢 **번호 모드**: 전체 사람 수 입력, 제외할 번호 입력 (쉼표 또는 공백 구분), 발표자 수 설정
   - 🏷️ **이름 모드**: 참가자 명단(줄바꿈/쉼표 구분)을 직접 넣어 이름으로 추첨 가능
   - 🎲 **두구두구 룰렛 애니메이션**: 버튼 클릭 시 긴장감 넘치는 슬롯 롤링 연출
   - 🎊 **폭죽 파티클 & 사운드**: 당첨자 확정 시 폭죽 효과와 팡파레 축하음 연출
   - 📌 **이전 당첨자 자동 제외**: 연쇄 추첨 시 이미 당첨된 번호를 자동으로 제외 목록에 누적
   - 📋 **결과 복사**: 카카오톡, 슬랙 등에 바로 공유할 수 있는 서식 복사

---

### 2. Python 데스크톱 GUI 버전 (`main.py`)
기존에 작성하신 `get_settings()`와 `select_speakers()` 파이썬 로직을 그대로 확장하여 제작된 Tkinter GUI입니다.

**실행 방법:**
- **방법 A**: **`run.bat`** 파일을 더블 클릭
- **방법 B**: 터미널/PowerShell에서 다음 명령 실행:
  ```bash
  python main.py
  ```
  또는
  ```bash
  py main.py
  ```

---

## 💡 적용된 핵심 로직 코드

```python
import random

# 사용자 입력값 검증 및 제외 번호 필터링
def parse_settings(total_input, speaker_input, exclude_input):
    num1 = int(total_input.strip())
    num2 = int(speaker_input.strip())
    
    # 제외할 번호 처리 (공백 또는 쉼표 구분)
    raw_exclude = exclude_input.replace(',', ' ').split()
    exclude_numbers = set(map(int, raw_exclude))
    
    # 전체 사람 번호
    total_numbers = set(range(1, num1 + 1))
    
    # 제외 번호 제거
    allowed_numbers = sorted(list(total_numbers - exclude_numbers))
    
    return num1, num2, allowed_numbers

# 발표자 추출
def select_speakers(num2, allowed_numbers):
    return sorted(random.sample(allowed_numbers, num2))
```

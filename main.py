import random
import sys
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk

# 윈도우 환경 비프음 지원 (실패 시 무시)
try:
    import winsound
except ImportError:
    winsound = None


# ==========================================
# 1. 기존 사용자의 핵심 로직 함수
# ==========================================
def parse_settings(total_input, speaker_input, exclude_input):
    """
    사용자가 입력한 값들을 검증하고 추출하는 함수
    기존 get_settings() 로직을 GUI 입력값에 맞게 확장
    """
    # 1) 전체 사람 수
    try:
        num1 = int(total_input.strip())
        if num1 <= 0:
            raise ValueError("전체 인원 수는 1 이상이어야 합니다.")
    except ValueError:
        raise ValueError("전체 인원 수를 올바른 숫자로 입력해주세요.")

    # 2) 발표자 수
    try:
        num2 = int(speaker_input.strip())
        if num2 <= 0:
            raise ValueError("발표자 수는 1 이상이어야 합니다.")
    except ValueError:
        raise ValueError("발표자 수를 올바른 숫자로 입력해주세요.")

    # 3) 제외할 번호 처리 (공백 또는 쉼표로 구분)
    exclude_numbers = set()
    raw_exclude = exclude_input.replace(",", " ").split()
    for item in raw_exclude:
        item = item.strip()
        if item:
            try:
                val = int(item)
                exclude_numbers.add(val)
            except ValueError:
                raise ValueError(f"제외 번호 중 올바르지 않은 값('{item}')이 있습니다.")

    # 전체 사람 번호 세트 생성
    total_numbers = set(range(1, num1 + 1))

    # 제외 번호 제거 후 후보자 리스트 추출
    allowed_numbers = sorted(list(total_numbers - exclude_numbers))

    # 유효성 검사: 후보자 수 vs 뽑을 인원 수
    if len(allowed_numbers) == 0:
        raise ValueError("제외 후 남은 후보자가 0명입니다. 제외 번호를 확인해주세요.")

    if num2 > len(allowed_numbers):
        raise ValueError(
            f"뽑을 발표자 수({num2}명)가 제외 후 남은 인원({len(allowed_numbers)}명)보다 많습니다!"
        )

    return num1, num2, allowed_numbers


def select_speakers(num2, allowed_numbers):
    """
    발표자 뽑기 함수
    num2명만큼 allowed_numbers에서 중복 없이 무작위 추출
    """
    return sorted(random.sample(allowed_numbers, num2))


# ==========================================
# 2. Tkinter GUI 애플리케이션
# ==========================================
class SpeakerPickerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🎉 스마트 발표자 뽑기 (Speaker Picker)")
        self.root.geometry("640x760")
        self.root.minsize(560, 680)

        # 색상 테마 (모던 인디고 / 다크 슬레이트 & 화이트)
        self.colors = {
            "bg": "#f8fafc",
            "card_bg": "#ffffff",
            "card_border": "#e2e8f0",
            "primary": "#4f46e5",
            "primary_hover": "#4338ca",
            "primary_light": "#e0e7ff",
            "secondary": "#06b6d4",
            "accent": "#f59e0b",
            "text_main": "#1e293b",
            "text_muted": "#64748b",
            "success": "#10b981",
            "badge_bg": "#ede9fe",
            "badge_text": "#6d28d9",
        }

        self.root.configure(bg=self.colors["bg"])
        self.is_animating = False
        self.history = []

        self.setup_styles()
        self.build_ui()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        # 기본 폰트 설정
        self.font_title = ("Malgun Gothic", 18, "bold")
        self.font_subtitle = ("Malgun Gothic", 10)
        self.font_label = ("Malgun Gothic", 11, "bold")
        self.font_desc = ("Malgun Gothic", 9)
        self.font_btn = ("Malgun Gothic", 13, "bold")
        self.font_result = ("Malgun Gothic", 24, "bold")

    def play_sound(self, sound_type="drum"):
        """간단한 사운드 효과 (비동기)"""
        if not winsound:
            return

        def _sound():
            try:
                if sound_type == "drum":
                    winsound.Beep(450, 40)
                elif sound_type == "fanfare":
                    for freq in [523, 659, 784, 1046]:
                        winsound.Beep(freq, 120)
            except Exception:
                pass

        threading.Thread(target=_sound, daemon=True).start()

    def build_ui(self):
        # 헤더 컨테이너
        header_frame = tk.Frame(self.root, bg=self.colors["bg"], pady=16)
        header_frame.pack(fill="x", padx=24)

        title_lbl = tk.Label(
            header_frame,
            text="🎯 스마트 발표자 추첨기",
            font=self.font_title,
            fg=self.colors["primary"],
            bg=self.colors["bg"],
        )
        title_lbl.pack()

        subtitle_lbl = tk.Label(
            header_frame,
            text="공정하고 흥미진진한 랜덤 발표자 선정 프로그램",
            font=self.font_subtitle,
            fg=self.colors["text_muted"],
            bg=self.colors["bg"],
        )
        subtitle_lbl.pack(pady=4)

        # 설정 입력 카드
        card_frame = tk.Frame(
            self.root,
            bg=self.colors["card_bg"],
            highlightbackground=self.colors["card_border"],
            highlightthickness=1,
            padx=24,
            pady=20,
        )
        card_frame.pack(fill="x", padx=24, pady=8)

        # 1) 총 인원 수
        row1 = tk.Frame(card_frame, bg=self.colors["card_bg"])
        row1.pack(fill="x", pady=6)

        lbl1 = tk.Label(
            row1,
            text="👥 전체 인원 수 (총 번호 1 ~ N)",
            font=self.font_label,
            fg=self.colors["text_main"],
            bg=self.colors["card_bg"],
        )
        lbl1.pack(anchor="w")

        self.entry_total = tk.Entry(
            row1,
            font=("Malgun Gothic", 12),
            bg="#f1f5f9",
            relief="flat",
            highlightthickness=1,
            highlightcolor=self.colors["primary"],
        )
        self.entry_total.insert(0, "30")
        self.entry_total.pack(fill="x", pady=4, ipady=4)

        # 2) 발표자 수
        row2 = tk.Frame(card_frame, bg=self.colors["card_bg"])
        row2.pack(fill="x", pady=6)

        lbl2 = tk.Label(
            row2,
            text="🎤 뽑을 발표자 수 (명)",
            font=self.font_label,
            fg=self.colors["text_main"],
            bg=self.colors["card_bg"],
        )
        lbl2.pack(anchor="w")

        self.entry_speakers = tk.Entry(
            row2,
            font=("Malgun Gothic", 12),
            bg="#f1f5f9",
            relief="flat",
            highlightthickness=1,
            highlightcolor=self.colors["primary"],
        )
        self.entry_speakers.insert(0, "3")
        self.entry_speakers.pack(fill="x", pady=4, ipady=4)

        # 3) 제외할 번호
        row3 = tk.Frame(card_frame, bg=self.colors["card_bg"])
        row3.pack(fill="x", pady=6)

        lbl3 = tk.Label(
            row3,
            text="🚫 제외할 번호 (쉼표 또는 공백 구분, 예: 4, 12 15)",
            font=self.font_label,
            fg=self.colors["text_main"],
            bg=self.colors["card_bg"],
        )
        lbl3.pack(anchor="w")

        self.entry_exclude = tk.Entry(
            row3,
            font=("Malgun Gothic", 12),
            bg="#f1f5f9",
            relief="flat",
            highlightthickness=1,
            highlightcolor=self.colors["primary"],
        )
        self.entry_exclude.insert(0, "")
        self.entry_exclude.pack(fill="x", pady=4, ipady=4)

        # 옵션 체크박스들
        opts_frame = tk.Frame(card_frame, bg=self.colors["card_bg"])
        opts_frame.pack(fill="x", pady=8)

        self.var_sound = tk.BooleanVar(value=True)
        chk_sound = tk.Checkbutton(
            opts_frame,
            text="🔊 효과음 켜기",
            variable=self.var_sound,
            font=self.font_desc,
            bg=self.colors["card_bg"],
            fg=self.colors["text_main"],
            activebackground=self.colors["card_bg"],
        )
        chk_sound.pack(side="left", padx=4)

        self.var_auto_exclude = tk.BooleanVar(value=True)
        chk_auto = tk.Checkbutton(
            opts_frame,
            text="📌 뽑힌 번호 자동 제외 목록에 추가",
            variable=self.var_auto_exclude,
            font=self.font_desc,
            bg=self.colors["card_bg"],
            fg=self.colors["text_main"],
            activebackground=self.colors["card_bg"],
        )
        chk_auto.pack(side="left", padx=12)

        # 추첨 실행 버튼
        self.btn_pick = tk.Button(
            self.root,
            text="🎲 두구두구... 발표자 뽑기!",
            font=self.font_btn,
            bg=self.colors["primary"],
            fg="#ffffff",
            activebackground=self.colors["primary_hover"],
            activeforeground="#ffffff",
            relief="flat",
            cursor="hand2",
            command=self.start_draw,
        )
        self.btn_pick.pack(fill="x", padx=24, pady=12, ipady=8)

        # 결과 영역 카드
        result_card = tk.Frame(
            self.root,
            bg=self.colors["card_bg"],
            highlightbackground=self.colors["card_border"],
            highlightthickness=1,
            padx=20,
            pady=16,
        )
        result_card.pack(fill="both", expand=True, padx=24, pady=8)

        self.lbl_status = tk.Label(
            result_card,
            text="인원을 설정하고 [발표자 뽑기] 버튼을 눌러주세요!",
            font=self.font_subtitle,
            fg=self.colors["text_muted"],
            bg=self.colors["card_bg"],
        )
        self.lbl_status.pack()

        # 당첨 번호 표시 컨테이너
        self.badges_frame = tk.Frame(result_card, bg=self.colors["card_bg"])
        self.badges_frame.pack(pady=16)

        # 결과 복사 및 리셋 버튼 영역
        bottom_btn_frame = tk.Frame(result_card, bg=self.colors["card_bg"])
        bottom_btn_frame.pack(fill="x", pady=6)

        self.btn_copy = tk.Button(
            bottom_btn_frame,
            text="📋 결과 복사",
            font=self.font_desc,
            bg="#f1f5f9",
            fg=self.colors["text_main"],
            relief="flat",
            cursor="hand2",
            state="disabled",
            command=self.copy_result,
        )
        self.btn_copy.pack(side="left", padx=6)

        self.btn_clear_exclude = tk.Button(
            bottom_btn_frame,
            text="🔄 제외 목록 초기화",
            font=self.font_desc,
            bg="#f1f5f9",
            fg=self.colors["text_main"],
            relief="flat",
            cursor="hand2",
            command=self.clear_exclude,
        )
        self.btn_clear_exclude.pack(side="left", padx=6)

        # 히스토리 요약
        self.lbl_history = tk.Label(
            result_card,
            text="최근 당첨 기록: 없음",
            font=self.font_desc,
            fg=self.colors["text_muted"],
            bg=self.colors["card_bg"],
            wraplength=480,
        )
        self.lbl_history.pack(side="bottom", fill="x", pady=4)

    def start_draw(self):
        if self.is_animating:
            return

        total_str = self.entry_total.get()
        speaker_str = self.entry_speakers.get()
        exclude_str = self.entry_exclude.get()

        try:
            # 기존 get_settings()의 확장 파싱 로직 호출
            num1, num2, allowed_numbers = parse_settings(
                total_str, speaker_str, exclude_str
            )
        except ValueError as e:
            messagebox.showwarning("입력 오류", str(e))
            return

        self.is_animating = True
        self.btn_pick.config(state="disabled", bg="#94a3b8")
        self.btn_copy.config(state="disabled")
        self.lbl_status.config(
            text="🥁 긴장의 순간... 발표자를 추첨 중입니다!",
            fg=self.colors["accent"],
        )

        # 기존 배지 제거
        for widget in self.badges_frame.winfo_children():
            widget.destroy()

        # 롤링 애니메이션 설정
        animation_duration = 1.6  # 초 단위
        start_time = time.time()

        # 임시 배지 위젯 미리 생성
        temp_labels = []
        for i in range(num2):
            lbl = tk.Label(
                self.badges_frame,
                text="?",
                font=self.font_result,
                bg=self.colors["primary_light"],
                fg=self.colors["primary"],
                width=4,
                height=1,
                relief="groove",
                bd=0,
                padx=10,
                pady=10,
            )
            lbl.grid(row=i // 4, column=i % 4, padx=8, pady=8)
            temp_labels.append(lbl)

        def roll_step():
            elapsed = time.time() - start_time
            if elapsed < animation_duration:
                # 무작위 번호 롤링 표시
                sample_preview = random.sample(
                    allowed_numbers, min(len(allowed_numbers), num2)
                )
                for idx, lbl in enumerate(temp_labels):
                    if idx < len(sample_preview):
                        lbl.config(text=f"{sample_preview[idx]}번")

                if self.var_sound.get():
                    self.play_sound("drum")

                # 점진적으로 딜레이 증가 (자연스러운 감속 효과)
                delay = int(60 + (elapsed / animation_duration) * 120)
                self.root.after(delay, roll_step)
            else:
                # 최종 추첨 완료!
                self.finish_draw(num2, allowed_numbers, temp_labels)

        roll_step()

    def finish_draw(self, num2, allowed_numbers, temp_labels):
        # 기존 select_speakers 함수 호출!
        selected = select_speakers(num2, allowed_numbers)

        # 배지 최종 업데이트
        for idx, lbl in enumerate(temp_labels):
            winner = selected[idx]
            lbl.config(
                text=f"{winner}번",
                bg=self.colors["badge_bg"],
                fg=self.colors["badge_text"],
                font=("Malgun Gothic", 24, "bold"),
            )

        self.last_selected = selected
        self.lbl_status.config(
            text=f"✨ 축하합니다! 발표자 {len(selected)}명이 선정되었습니다! ✨",
            fg=self.colors["success"],
            font=("Malgun Gothic", 12, "bold"),
        )

        if self.var_sound.get():
            self.play_sound("fanfare")

        # 자동 제외 옵션 활성화 시 제외 목록에 추가
        if self.var_auto_exclude.get():
            curr_exclude = self.entry_exclude.get().strip()
            new_exclude_set = set()
            if curr_exclude:
                for x in curr_exclude.replace(",", " ").split():
                    try:
                        new_exclude_set.add(int(x))
                    except ValueError:
                        pass
            new_exclude_set.update(selected)
            sorted_excluded = sorted(list(new_exclude_set))
            self.entry_exclude.delete(0, tk.END)
            self.entry_exclude.insert(0, ", ".join(map(str, sorted_excluded)))

        # 히스토리 기록
        result_text = ", ".join(f"{n}번" for n in selected)
        self.history.append(result_text)
        recent_history_str = " | ".join(self.history[-3:])
        self.lbl_history.config(
            text=f"최근 당첨 기록 (최대 3회): {recent_history_str}"
        )

        self.btn_pick.config(
            state="normal",
            bg=self.colors["primary"],
            text="🎲 다시 발표자 뽑기!",
        )
        self.btn_copy.config(state="normal")
        self.is_animating = False

    def copy_result(self):
        if hasattr(self, "last_selected") and self.last_selected:
            text = "🎉 발표자 선정 결과: " + ", ".join(
                f"{n}번" for n in self.last_selected
            )
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            messagebox.showinfo(
                "복사 완료", "당첨 결과가 클립보드에 복사되었습니다!\n\n" + text
            )

    def clear_exclude(self):
        self.entry_exclude.delete(0, tk.END)
        messagebox.showinfo("알림", "제외 목록이 초기화되었습니다.")


def main():
    root = tk.Tk()
    app = SpeakerPickerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()

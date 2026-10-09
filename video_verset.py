"""
Génère une vidéo verticale TikTok (1080x1920) : verset arabe, traduction et identité visuelle.

Installation :
    pip install moviepy

Polices : télécharge une police arabe (ex. "Amiri-Regular.ttf" sur Google Fonts)
et une police latine (ex. "Poppins-Regular.ttf"), puis ajuste les chemins ci-dessous.
Microsoft Edge est utilisé pour placer correctement les signes vocaliques arabes.

Lancer :
    python video_verset.py
"""

import html
import moviepy
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

if int(moviepy.__version__.split(".", 1)[0]) >= 2:
    from moviepy import AudioFileClip, ImageClip, afx, concatenate_videoclips, vfx
    MOVIEPY_V2 = True
else:
    from moviepy.editor import AudioFileClip, ImageClip, concatenate_videoclips
    MOVIEPY_V2 = False

# ---------- RÉGLAGES ----------
W, H = 1080, 1920
PAGE_NAME = "versets_de_lumiere"
ATTRIBUTION = "Le Noble Coran)"

FONT_AR = "Amiri-Regular.ttf"
FONT_FR = "Poppins-Regular.ttf"
AUDIO = None  # ex. "recitation.mp3" (mets None pour une vidéo muette)
OUTPUT = "verset.mp4"
FPS = 24


def find_edge():
    """Trouve Edge, requis pour le façonnage et le positionnement des harakāt."""
    executable = shutil.which("msedge")
    if executable:
        return Path(executable)

    roots = [
        Path(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"))
        / "Microsoft",
        Path(os.environ.get("PROGRAMFILES", r"C:\Program Files")) / "Microsoft",
        Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local"))
        / "Microsoft",
    ]
    for root in roots:
        for relative in (
            Path("Edge/Application/msedge.exe"),
            Path("EdgeCore"),
            Path("EdgeWebView/Application"),
        ):
            candidate = root / relative
            if candidate.is_file():
                return candidate
            if candidate.is_dir():
                versions = sorted(
                    candidate.glob("*/msedge.exe"),
                    key=lambda item: tuple(
                        int(part) for part in item.parent.name.split(".")
                        if part.isdigit()
                    ),
                    reverse=True,
                )
                if versions:
                    return versions[0]
    raise FileNotFoundError(
        "Microsoft Edge est requis pour afficher correctement les signes "
        "vocaliques arabes. Installez Edge puis relancez le script."
    )


# (texte arabe, traduction française, référence, durée en secondes)
SLIDES = [
    ("وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا",
     "Ton Seigneur a décrété : n'adorez que Lui, et soyez bons envers vos parents.",
     "Sourate Al-Isra • 17:23", 6),
    ("فَلَا تَقُل لَّهُمَا أُفٍّ وَلَا تَنْهَرْهُمَا وَقُل لَّهُمَا قَوْلًا كَرِيمًا",
     "Ne leur dis pas « ouf », ne les repousse pas, et adresse-leur des paroles respectueuses.",
     "Sourate Al-Isra • 17:23", 6),
    ("وَاخْفِضْ لَهُمَا جَنَاحَ الذُّلِّ مِنَ الرَّحْمَةِ",
     "Abaisse pour eux l'aile de l'humilité, par miséricorde.",
     "Sourate Al-Isra • 17:24", 5),
    ("وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
     "Et dis : « Seigneur, fais-leur miséricorde, comme ils m'ont élevé tout petit. »",
     "Sourate Al-Isra • 17:24", 5),
]


def make_frame(arabic, french, ref, path, edge, work_dir):
    """Rend une image avec le moteur de texte arabe d'Edge."""
    font_ar_uri = (Path(__file__).resolve().parent / FONT_AR).as_uri()
    font_fr_uri = (Path(__file__).resolve().parent / FONT_FR).as_uri()
    header_ref = ref.replace("Sourate ", "").replace(" • ", "  ")
    page = Path(work_dir) / f"{Path(path).stem}.html"
    profile = Path(work_dir) / "edge-profile"
    source = f"""<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<style>
@font-face {{ font-family: Amiri; src: url("{font_ar_uri}"); }}
@font-face {{ font-family: Poppins; src: url("{font_fr_uri}"); }}
* {{ box-sizing: border-box; }}
html, body {{
    margin: 0; width: {W}px; height: {H}px; overflow: hidden;
    color: #fff;
    background: linear-gradient(135deg, #395778 0%, #051234 100%);
}}
.header {{
    position: absolute; top: 38px; left: 36px; right: 36px;
    display: flex; justify-content: space-between;
    font: 34px Poppins, sans-serif;
}}
.arabic {{
    position: absolute; top: 445px; left: 65px; width: 950px;
    text-align: center; direction: rtl; unicode-bidi: plaintext;
    font: 100px/1.35 Amiri, serif;
}}
.translation {{
    position: absolute; top: 970px; left: 45px; width: 990px;
    text-align: center; font: 600 48px/1.4 Poppins, sans-serif;
}}
.attribution {{
    position: absolute; top: 1320px; left: 40px; right: 40px;
    text-align: center; font: 30px Poppins, sans-serif;
}}
</style>
<div class="header"><span>{html.escape(PAGE_NAME)}</span>
<span>{html.escape(header_ref)}</span></div>
<div class="arabic" lang="ar" dir="rtl">{html.escape(arabic)}</div>
<div class="translation">{html.escape(french)}</div>
<div class="attribution">{html.escape(ATTRIBUTION)}</div>
</html>
"""
    page.write_text(source, encoding="utf-8")
    screenshot = Path(path).resolve()
    command = [
        str(edge),
        "--headless",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--hide-scrollbars",
        f"--user-data-dir={profile}",
        f"--window-size={W},{H}",
        f"--screenshot={screenshot}",
        page.as_uri(),
    ]
    result = subprocess.run(
        command, capture_output=True, text=True, timeout=60, check=False
    )
    if result.returncode != 0 or not screenshot.is_file():
        detail = result.stderr.strip()[-1000:]
        raise RuntimeError(
            f"Edge n'a pas pu générer l'image {screenshot.name}. {detail}"
        )


# ---------- MONTAGE ----------
def main():
    edge = find_edge()
    with tempfile.TemporaryDirectory(prefix="versets_de_lumiere_") as work_dir:
        clips = []
        for i, (ar, fr, ref, dur) in enumerate(SLIDES):
            path = Path(work_dir) / f"slide_{i}.png"
            make_frame(ar, fr, ref, path, edge, work_dir)
            clip = ImageClip(str(path))
            if MOVIEPY_V2:
                clip = clip.with_duration(dur).with_effects(
                    [vfx.FadeIn(0.5), vfx.FadeOut(0.5)]
                )
            else:
                clip = clip.set_duration(dur).fadein(0.5).fadeout(0.5)
            clips.append(clip)

        video = concatenate_videoclips(clips, method="compose")

        if AUDIO:
            audio = AudioFileClip(AUDIO)
            if MOVIEPY_V2:
                audio = audio.subclipped(0, video.duration)
                video = video.with_audio(
                    audio.with_effects([afx.AudioFadeOut(1)])
                )
            else:
                audio = audio.subclip(0, video.duration)
                video = video.set_audio(audio.audio_fadeout(1))

        video.write_videofile(OUTPUT, fps=FPS, codec="libx264", audio_codec="aac")


if __name__ == "__main__":
    main()

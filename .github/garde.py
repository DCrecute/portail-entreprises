"""Remet en état index.html après une republication : page cassée, Tally coupé, extensions.js retiré."""
import pathlib, subprocess, sys

P = pathlib.Path("index.html")
BALISE = '<script src="extensions.js"></script>'
TALLY = pathlib.Path(".github/tally.json").read_text().strip()


def saine(t: str) -> bool:
    return len(t) > 40000 and "</body>" in t and "{{LOCAL:" not in t and "const CONFIG" in t


def derniere_saine() -> str:
    for sha in subprocess.run(["git", "log", "--format=%H", "--", "index.html"], capture_output=True, text=True, check=True).stdout.split():
        t = subprocess.run(["git", "show", f"{sha}:index.html"], capture_output=True, text=True).stdout
        if saine(t):
            print(f"page cassée : reprise de {sha[:7]}")
            return t
    sys.exit("aucune version saine d'index.html dans l'historique")


t = P.read_text(encoding="utf-8")
avant = t
if not saine(t):
    t = derniere_saine()
if '"tally": null' in t:
    t = t.replace('"tally": null', '"tally": ' + TALLY, 1)
    print("réglage Tally remis")
if BALISE not in t:
    t = t.replace("</body>", BALISE + "</body>", 1)
    print("extensions.js rebranché")
if t != avant:
    P.write_text(t, encoding="utf-8")

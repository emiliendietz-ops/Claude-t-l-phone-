#!/usr/bin/env python3
"""Builds crapette/ipad/: a stand-alone, installable (home screen, offline) copy of the game for GitHub Pages."""
import pathlib, re
here = pathlib.Path(__file__).parent
game = (here / "index.html").read_text(encoding="utf-8")
title = re.search(r"<title>.*?</title>", game).group(0)
body = game.replace(title, "", 1)
head = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{title}
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Crapette">
<meta name="theme-color" content="#163829">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
</head>
<body>
"""
tail = """
<script>if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js").catch(function(){})}</script>
</body>
</html>
"""
(here / "ipad" / "index.html").write_text(head + body + tail, encoding="utf-8")
import shutil, zipfile
shutil.copy(here / "api.php", here / "ipad" / "api.php")
files = ["index.html", "api.php", "manifest.webmanifest", "sw.js", "icon-180.png", "icon-192.png", "icon-512.png"]
with zipfile.ZipFile(here / "crapette-o2switch.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for f in files: z.write(here / "ipad" / f, f)
print("crapette/ipad/ et crapette-o2switch.zip écrits")

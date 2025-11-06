#!/usr/bin/env python3
# coding: utf-8
"""VALORANT theme update for app.js"""

content = open('c:/Users/tie-p/takumi1/app.js', 'r', encoding='utf-8-sig').read()
content = content.replace('sf6_gallery', 'valorant_gallery')
open('c:/Users/tie-p/takumi1/app.js', 'w', encoding='utf-8').write(content)
print(f'Replaced: sf6_gallery -> valorant_gallery ({content.count("valorant_gallery")} times)')

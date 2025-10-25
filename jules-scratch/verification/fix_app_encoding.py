#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
app.jsの破損したUTF-8エンコーディングを修正
"""
from pathlib import Path

def fix_app_js():
    app_file = Path('c:/Users/tie-p/takumi1/app.js')
    
    print(f"Reading {app_file}...")
    
    # バイナリモードで読み込み
    with open(app_file, 'rb') as f:
        data = f.read()
    
    print(f"Original size: {len(data)} bytes")
    
    # 不正なバイトシーケンスを探して修正
    # パターン: UTF-8の文字の途中に 0x45 ('E') が挿入されている
    # 例: \xe4\xba\x81E\x81\x99 -> \xe4\xba\x86\xe3\x81\x99 (完了す)
    
    # 既知の不正パターンを修正
    corrections = [
        # (不正なバイト列, 正しいバイト列, 説明)
        (b'\xe5\x81E', b'\xe5\x81\x84', '倄'),  # 例: 完倄 -> 完全
        (b'\xe4\xba\x81E', b'\xe4\xba\x86', '了'),  # 完了
        (b'\xe4\xbb\x96\xe3\x81E', b'\xe4\xbb\x96\xe3\x81\xae', '他の'),
        (b'\xe5\x87\xa6\xe7\x90\x81E', b'\xe5\x87\xa6\xe7\x90\x86', '処理'),
        (b'\xe5\xae\x8c\xe4\xba\x81E', b'\xe5\xae\x8c\xe4\xba\x86', '完了'),
    ]
    
    # より一般的なアプローチ: UTF-8シーケンス後の不正な 'E' を削除
    # UTF-8の3バイト文字: \xE0-\xEF \x80-\xBF \x80-\xBF
    # 不正パターン: \xE0-\xEF \x00-\x7F E \x80-\xBF -> 中間バイトが間違っている
    
    import re
    
    # パターン1: \x81E -> 正しい2バイト目に修正（頻出）
    # これは文字ごとに正しいマッピングが必要なので、まずは手動で修正
    
    manual_fixes = {
        b'\xe5\x81E': b'\xe5\x81\x84',  # 偁
        b'\xe4\xba\x81E': b'\xe4\xba\x86',  # 了
        b'\xe3\x81E': b'\xe3\x81\xae',  # の (よくあるパターン)
        b'\xe7\x90\x81E': b'\xe7\x90\x86',  # 理
        b'\xe6\x88\x81E': b'\xe6\x88\x90',  # 成
        b'\xe6\x95\x81E': b'\xe6\x95\x97',  # 敗
        b'\xe4\xba\xbaE': b'\xe4\xba\xba\xe3\x81\xae',  # 人の
    }
    
    modified = data
    for bad, good in manual_fixes.items():
        if bad in modified:
            count = modified.count(bad)
            modified = modified.replace(bad, good)
            print(f"  Fixed: {bad.hex()} -> {good.hex()} ({count} times)")
    
    # UTF-8として再デコードを試みる
    try:
        text = modified.decode('utf-8', errors='replace')
        print(f"\nDecoded successfully")
        print(f"Replaced characters: {text.count('�')}")
        
        # 再エンコードして保存
        with open(app_file, 'wb') as f:
            f.write(modified)
        
        print(f"\nSaved fixed file: {app_file}")
        print(f"New size: {len(modified)} bytes")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    fix_app_js()

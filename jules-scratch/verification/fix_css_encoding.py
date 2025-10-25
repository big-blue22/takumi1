#!/usr/bin/env python3
"""
CSSファイルの文字化けしたcontent値を修正するスクリプト
"""
import re
from pathlib import Path

def fix_css_content():
    css_file = Path(__file__).parent.parent.parent / 'styles.css'
    
    # 複数のエンコーディングを試す
    content = None
    for encoding in ['utf-8', 'utf-8-sig', 'cp932', 'shift-jis']:
        try:
            content = css_file.read_text(encoding=encoding)
            print(f"✅ {encoding}で読み込み成功")
            break
        except UnicodeDecodeError:
            continue
    
    if content is None:
        print("❌ ファイルの読み込みに失敗しました")
        return
    
    # 文字化けしたcontentを修正
    # パターン: content: "文字化け;  または content: '文字化け;
    patterns = [
        (r'content: ["\']✁E;', 'content: "✓";'),
        (r'content: ["\']âE;', 'content: "✓";'),
    ]
    
    modified = False
    for pattern, replacement in patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            print(f"✅ パターン {pattern} を修正しました")
            modified = True
    
    if modified:
        # UTF-8で保存
        css_file.write_text(content, encoding='utf-8')
        print(f"✅ {css_file}を保存しました")
        
        # 修正箇所を確認
        fixed_count = len(re.findall(r'content: "✓";', content))
        print(f"✅ {fixed_count}箇所のcontent: \"✓\";を確認しました")
    else:
        print("⚠️ 修正が必要な箇所が見つかりませんでした")

if __name__ == '__main__':
    fix_css_content()

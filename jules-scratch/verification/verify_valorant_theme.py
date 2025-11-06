#!/usr/bin/env python3
"""
VALORANT Theme Verification Script
VALORANTへのテーマ変更が正しく適用されているかを検証します
"""

import os
import re
import sys
from pathlib import Path

class VALORANTThemeVerifier:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.errors = []
        self.warnings = []
        self.success_count = 0
        
    def verify_all(self):
        """すべての検証を実行"""
        print("🎯 VALORANTテーマ検証を開始します...\n")
        
        self.verify_html_text()
        self.verify_css_colors()
        self.verify_javascript_storage()
        self.verify_gemini_prompts()
        self.verify_batch_feature_disabled()
        
        self.print_summary()
        
        return len(self.errors) == 0
    
    def verify_html_text(self):
        """HTMLファイル内のテキストが正しく変更されているか検証"""
        print("📄 index.htmlのテキストを検証中...")
        
        html_file = self.project_root / 'index.html'
        if not html_file.exists():
            self.errors.append("index.htmlが見つかりません")
            return
        
        content = html_file.read_text(encoding='utf-8')
        
        # SF6/Street Fighter 6の残存チェック
        sf6_patterns = [
            r'Street Fighter 6(?!\svs)',  # "Street Fighter 6 vs VALORANT"のような比較は除外
            r'\bSF6\b(?!_)',  # "SF6_"で始まる変数名は除外
            r'ストリートファイター6',
        ]
        
        for pattern in sf6_patterns:
            matches = list(re.finditer(pattern, content, re.IGNORECASE))
            if matches:
                for match in matches[:3]:  # 最初の3つのみ表示
                    line_num = content[:match.start()].count('\n') + 1
                    context = content[max(0, match.start()-30):match.end()+30]
                    self.errors.append(
                        f"SF6の表記が残っています (行{line_num}): ...{context.strip()}..."
                    )
        
        # VALORANTが正しく使用されているか確認
        valorant_count = len(re.findall(r'VALORANT', content, re.IGNORECASE))
        if valorant_count < 5:
            self.errors.append(f"VALORANTの表記が少なすぎます (現在: {valorant_count}個)")
        else:
            print(f"  ✅ VALORANTの表記が{valorant_count}箇所で使用されています")
            self.success_count += 1
    
    def verify_css_colors(self):
        """CSSファイルの配色がVALORANT風になっているか検証"""
        print("\n🎨 styles.cssの配色を検証中...")
        
        css_file = self.project_root / 'styles.css'
        if not css_file.exists():
            self.errors.append("styles.cssが見つかりません")
            return
        
        try:
            content = css_file.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError:
            try:
                content = css_file.read_text(encoding='cp932')
            except Exception as e:
                self.errors.append(f"styles.cssの読み込みに失敗しました: {e}")
                return
        
        # VALORANT風の青系色をチェック
        blue_patterns = [
            r'#0[0-9a-fA-F]{5}',  # 青系の色コード
            r'rgba?\(\s*[0-9]{1,2}\s*,\s*[1-9][0-9]{1,2}\s*,\s*[1-9][0-9]{2}\s*',  # 青が強いRGB
        ]
        
        blue_count = 0
        for pattern in blue_patterns:
            blue_count += len(re.findall(pattern, content))
        
        if blue_count < 10:
            self.warnings.append(f"青系の配色が少ない可能性があります (検出: {blue_count}箇所)")
        else:
            print(f"  ✅ 青系の配色が{blue_count}箇所で使用されています")
            self.success_count += 1
        
        # 旧SF6のレッド系色(#e94560など)の残存チェック
        old_red_pattern = r'#e94560|#c73650'
        old_red_matches = re.findall(old_red_pattern, content, re.IGNORECASE)
        if old_red_matches:
            self.warnings.append(
                f"旧SF6テーマの色({', '.join(set(old_red_matches))})が残っています"
            )
    
    def verify_javascript_storage(self):
        """JavaScriptのストレージ名が変更されているか検証"""
        print("\n💾 app.jsのデータストレージ名を検証中...")
        
        js_file = self.project_root / 'app.js'
        if not js_file.exists():
            self.errors.append("app.jsが見つかりません")
            return
        
        try:
            content = js_file.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError:
            try:
                content = js_file.read_text(encoding='cp932')
            except Exception as e:
                self.errors.append(f"app.jsの読み込みに失敗しました: {e}")
                return
        
        # valorant_galleryが使用されているか
        valorant_gallery_count = len(re.findall(r'valorant_gallery', content))
        if valorant_gallery_count < 10:
            self.errors.append(
                f"valorant_galleryの使用が不十分です (現在: {valorant_gallery_count}箇所)"
            )
        else:
            print(f"  ✅ valorant_galleryが{valorant_gallery_count}箇所で使用されています")
            self.success_count += 1
        
        # sf6_galleryが残っていないか
        sf6_gallery_matches = re.findall(r'sf6_gallery', content)
        if sf6_gallery_matches:
            self.errors.append(
                f"sf6_galleryが{len(sf6_gallery_matches)}箇所に残っています"
            )
    
    def verify_gemini_prompts(self):
        """Gemini AIのプロンプトがVALORANT用に更新されているか検証"""
        print("\n🤖 gemini-service.jsのプロンプトを検証中...")
        
        gemini_file = self.project_root / 'gemini-service.js'
        if not gemini_file.exists():
            self.errors.append("gemini-service.jsが見つかりません")
            return
        
        try:
            content = gemini_file.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError:
            try:
                content = gemini_file.read_text(encoding='cp932')
            except Exception as e:
                self.errors.append(f"gemini-service.jsの読み込みに失敗しました: {e}")
                return
        
        # VALORANTキーワードの存在確認
        valorant_keywords = ['VALORANT', 'エージェント', 'アビリティ', 'マップ']
        found_keywords = []
        for keyword in valorant_keywords:
            if keyword in content:
                found_keywords.append(keyword)
        
        if len(found_keywords) < 3:
            self.errors.append(
                f"AIプロンプトにVALORANT関連キーワードが不足しています "
                f"(検出: {', '.join(found_keywords)})"
            )
        else:
            print(f"  ✅ VALORANTキーワード({', '.join(found_keywords)})が使用されています")
            self.success_count += 1
        
        # SF6キーワードの残存チェック
        sf6_keywords = ['Street Fighter', 'SF6', 'ドライブラッシュ', '対空']
        remaining_sf6 = [kw for kw in sf6_keywords if kw in content]
        if remaining_sf6:
            self.warnings.append(
                f"SF6関連キーワード({', '.join(remaining_sf6)})がAIプロンプトに残っています"
            )
    
    def verify_batch_feature_disabled(self):
        """画像分析機能が無効化されているか検証"""
        print("\n📸 画像分析機能の無効化を検証中...")
        
        html_file = self.project_root / 'index.html'
        if not html_file.exists():
            return
        
        content = html_file.read_text(encoding='utf-8')
        
        # まとめて入力セクションがコメントアウトされているか
        batch_section_commented = '<!--' in content and 'batch-match-card' in content
        
        if batch_section_commented:
            print("  ✅ まとめて入力機能が正しくコメントアウトされています")
            self.success_count += 1
        else:
            self.warnings.append(
                "まとめて入力機能がまだ有効な可能性があります"
            )
    
    def print_summary(self):
        """検証結果のサマリーを表示"""
        print("\n" + "="*60)
        print("📊 検証結果サマリー")
        print("="*60)
        
        print(f"\n✅ 成功: {self.success_count}項目")
        
        if self.warnings:
            print(f"\n⚠️  警告: {len(self.warnings)}項目")
            for warning in self.warnings:
                print(f"  - {warning}")
        
        if self.errors:
            print(f"\n❌ エラー: {len(self.errors)}項目")
            for error in self.errors:
                print(f"  - {error}")
        
        if not self.errors and not self.warnings:
            print("\n🎉 すべての検証に合格しました！")
            print("VALORANTテーマへの移行が完了しています。")
        elif not self.errors:
            print("\n✅ 重大なエラーはありませんが、いくつか警告があります。")
        else:
            print("\n❌ 修正が必要なエラーがあります。")


def main():
    # プロジェクトルートを取得
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    verifier = VALORANTThemeVerifier(project_root)
    success = verifier.verify_all()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()

# rubiwofuru

`kuromoji.js` の辞書（`dict/`）を **自サイトに同梱**して、Cloudflare Pages で **初回だけダウンロード**・以降はキャッシュで高速化する構成です。

## セットアップ（辞書を同梱）

PowerShell:

```powershell
cd "C:\Users\tanak\OneDrive\ドキュメント\rubiwofuru"
.\scripts\setup-kuromoji-dict.ps1
```

これでプロジェクト直下に `dict/` が作成されます。

## Cloudflare Pages のキャッシュ

ルートの `_headers` で、`/dict/*` と `*.js` / `*.css` を長期キャッシュするようにしています。

## 動作確認

- `index.html` を開く
- 画面の「辞書データを読み込み中...」が消えればOK


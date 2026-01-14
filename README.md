# TeamSpirit Quick Punch

TeamSpiritの打刻をワンクリックで行えるChrome拡張機能です。

## 機能

- 拡張機能アイコンからポップアップで出勤・退勤打刻
- 勤務場所の選択（リモート、オフィス、直行→オフィス、オフィス→直帰、直行直帰）
- 選択した勤務場所を記憶
- 現在の打刻状態を表示

## インストール方法

1. このリポジトリをクローンまたはダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 右上の「デベロッパーモード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. ダウンロードしたフォルダを選択

## 使い方

1. TeamSpiritのページ (`https://teamspirit-74532.lightning.force.com/`) を開く
2. Chrome右上の拡張機能アイコンをクリック
3. 勤務場所を選択
4. 「出勤」または「退勤」ボタンをクリック

## 注意事項

- TeamSpiritのタブが開いている必要があります
- 初回使用時はページを再読み込みしてください

## ファイル構成

```
teamspirit-extension/
├── manifest.json      # 拡張機能の設定
├── popup.html         # ポップアップUI
├── popup.css          # ポップアップのスタイル
├── popup.js           # ポップアップのロジック
├── content.js         # TeamSpiritページ操作スクリプト
├── background.js      # バックグラウンドサービス
└── icons/             # アイコン画像
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

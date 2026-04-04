# Strava to Google Calendar Sync (GAS)

![icon](icon.png)

Stravaのアクティビティ（トレーニング記録）を自動的に取得し、指定したGoogleカレンダーに予定として登録するGoogle Apps Script (GAS) アプリケーションです。

## 🌟 主な機能

* **Strava API連携**: OAuth2.0を利用して安全にStravaデータへアクセスします。

* **アクティビティの自動登録**: 直近（昨日）のトレーニングデータを取得し、距離、時間、詳細リンクを含めてカレンダーに予定として登録します。

* **カレンダー指定**: メインのカレンダーだけでなく、トレーニング専用の特定カレンダーを指定して登録することが可能です。

* **自動デプロイ (CI/CD)**: GitHub Actionsと `clasp` を連携し、`main` ブランチに変更がPushされると自動的にGAS環境へデプロイされます。

## 🚀 環境構築とデプロイ手順

このプロジェクトを自身の環境で動かすための手順です。

### 1. 前提条件

* Googleアカウント

* StravaアカウントおよびAPI設定（クライアントID、シークレットの取得）

* [Node.js](https://nodejs.org/) (ローカル開発用)

### 2. GASプロジェクトの準備

1. GASの新規プロジェクトを作成します（ブラウザで `script.new` にアクセス）。

2. ライブラリに `OAuth2` を追加します。

   * スクリプトID: `<OAuth2ライブラリのスクリプトID>` （※[Google公式のOAuth2リポジトリ](https://github.com/googleworkspace/apps-script-oauth2)等で公開されているIDをご利用ください）

3. GASの「プロジェクトの設定」>「スクリプト プロパティ」に以下の環境変数を設定します。

   * `STRAVA_CLIENT_ID` : Strava API設定画面で取得したクライアントID

   * `STRAVA_CLIENT_SECRET` : Strava API設定画面で取得したクライアントシークレット

   * `TARGET_CALENDAR_ID` : 登録先カレンダーのID（未設定の場合はデフォルトのカレンダーになります）

### 3. ローカル開発環境のセットアップ

リポジトリをクローンし、Google公式ツールの `clasp` を使ってGASと連携します。

```bash
# リポジトリのクローン
git clone https://github.com/kurousa/strava-calendar-app.git
cd strava-calendar-app

# claspのインストールとログイン
npm install -g @google/clasp
clasp login
```

## 📝ライセンス

MIT License

## 📢 貢献

CONTRIBUTING.md を参照してください。

## 🔗 関連リンク

* [Strava API](https://developers.strava.com/)
* [Google Apps Script](https://developers.google.com/apps-script)
* [clasp](https://github.com/google/clasp)

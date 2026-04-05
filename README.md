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

# vitestのインストール
pnpm install --frozen-lockfile --ignore-scripts
```

### 4. 実行設定（自動同期）

アクティビティを毎日自動的に取得するための設定です。

1. GASエディタの左メニューから「トリガー」（時計アイコン）を選択します。
2. 右下の「トリガーを追加」をクリックします。
3. 以下の設定を行い、保存します。
   * 実行する関数を選択: `main`
   * 実行するデプロイを選択: `Head`
   * イベントのソースを選択: `時間主導型`
   * トリガーのタイプを選択: `日付ベースのタイマー`
   * 時刻を選択: （例：午前6時〜7時）

### 5. 過去データのインポート

![import](import.png)
ウェブアプリとしてデプロイすることで、画面から任意の期間を指定してデータをまとめてインポートできます。

#### ウェブアプリのデプロイ
1. GASエディタ右上の「デプロイ」>「新しいデプロイ」を選択します。
2. 種類の選択（歯車アイコン）で「ウェブアプリ」を選択します。
3. 設定を以下のように行い、「デプロイ」をクリックします。
   * 説明: （任意）
   * 実行ユーザー: `自分`
   * アクセスできるユーザー: `自分のみ`
4. 発行された「ウェブアプリのURL」をコピーしてブラウザで開きます。

#### 手動インポートの実行
1. 表示された画面で「開始日」と「終了日」を選択します。
2. 「インポート開始」ボタンをクリックします。
   * **重複検知**: 既にカレンダーに登録済みのアクティビティ（Stravaの活動URLが詳細欄にあるもの）は自動的にスキップされます。
   * **処理時間**: 数ヶ月以上の長期データを一括取得する場合、処理に数分かかることがあります。

### 6. 単体テスト

開発時のテストには Vitest を使用しています。

```bash
# テストの実行
pnpm test
```

* テスト対象の関数を `*.spec.js` から呼び出すため、各ファイルの末尾で以下のように export してください。

    ```javascript
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ... };
    }
    ```

## 📝 ライセンス

MIT License

## 📢 貢献

CONTRIBUTING.md を参照してください。

## 🔗 関連リンク

* [Strava API](https://developers.strava.com/)
* [Google Apps Script](https://developers.google.com/apps-script)
* [clasp](https://github.com/google/clasp)

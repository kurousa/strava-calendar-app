# Strava Activity Dashboard

このプロジェクトは、Google Apps Script (GAS) 経由で取得した Strava のアクティビティデータを可視化する React ベースのダッシュボードです。

## プロジェクト構成

```text
dashboard/
├── public/                # 静的アセット (favicon, アイコンなど)
├── src/
│   ├── api/               # API クライアントと型定義
│   │   ├── client.ts      # Google Apps Script Web App 用 API クライアント
│   │   └── types.ts       # API レスポンスの型定義
│   ├── components/        # UI コンポーネント (再利用可能な部品)
│   │   ├── ActivityDetail.tsx # 活動詳細画面
│   │   ├── ErrorBoundary.tsx  # エラー境界
│   │   ├── GearItem.tsx       # ギア表示コンポーネント
│   │   └── Stats.tsx          # 統計表示用ヘルパー
│   ├── lib/               # ユーティリティ
│   │   └── utils.ts       # Tailwind 結合用ユーティリティ (cn)
│   ├── assets/            # 画像・アセット
│   ├── App.tsx            # メインコンポーネント (ルーティング・全体構成)
│   ├── App.css            # アプリケーション固有のスタイル
│   ├── index.css          # グローバルスタイル (Tailwind 指令含む)
│   └── main.tsx           # React エントリーポイント
├── index.html             # HTML テンプレート
├── package.json           # 依存関係・スクリプト
├── tsconfig.json          # TypeScript 設定
├── vercel.json            # Vercel デプロイ設定
└── vite.config.ts         # Vite 設定
```

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の変数を設定してください。

```shell
cp .env.example .env.local
```

```
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
VITE_GAS_DEPLOY_ID=YOUR_GAS_DEPLOY_ID
VITE_DASHBOARD_API_KEY=YOUR_DASHBOARD_API_KEY
```

- `VITE_GOOGLE_CLIENT_ID`: Google Cloud Consoleで作成したOAuth2クライアントID。
- `VITE_GAS_DEPLOY_ID`: Google Apps Script のウェブアプリとしてデプロイした際のデプロイ ID。
- `VITE_DASHBOARD_API_KEY`: GAS 側で設定した API キー。

## 開発と実行

### 開発サーバーの起動

```bash
pnpm dev
```

### ビルド

```bash
pnpm build
```

## デプロイ

このダッシュボードは Vercel にデプロイされるように設定されています。

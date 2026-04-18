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
│   ├── assets/            # コンポーネント用アセット
│   ├── App.tsx            # メインコンポーネント (ダッシュボード UI)
│   ├── App.css            # ダッシュボード固有のスタイル
│   ├── index.css          # グローバルスタイル
│   └── main.tsx           # React エントリーポイント
├── index.html             # アプリケーションのエントリーポイント
├── package.json           # 依存関係とスクリプト
├── tsconfig.json          # TypeScript 設定
├── vercel.json            # Vercel デプロイ設定
└── vite.config.ts         # Vite ビルド設定
```

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の変数を設定してください。

```text
VITE_GAS_DEPLOY_ID=YOUR_GAS_DEPLOY_MENT_ID
VITE_API_KEY=YOUR_API_KEY
```

- `VITE_GAS_DEPLOY_ID`: Google Apps Script のウェブアプリとしてデプロイした際のデプロイ ID。
- `VITE_API_KEY`: GAS 側で設定した API キー。

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

このダッシュボードは Vercel にデプロイされるように設定されています。`.github/workflows/deploy-dashboard.yml` を通じて、`main` ブランチへのプッシュ時に自動的にデプロイされます。

# ダッシュボードSPA構築計画 (GAS API連携)

この計画では、Google Apps Script (GAS) で実装されたヘッドレスAPIからデータを取得し、Stravaのアクティビティや機材ステータスを可視化するReact SPAを構築します。

## 概要

現在 `dashboard` ディレクトリにある React プロジェクトを拡張し、GAS の Web アプリエンドポイントからフィットネスデータ（TSS）、直近のアクティビティ、機材のメンテナンス状況を取得・表示するダッシュボードを実装します。

## アーキテクチャ

### 1. データ取得層 (Service Layer)

- `src/api/client.ts`: GAS APIへの fetch リクエストを担当。
- `src/api/types.ts`: GAS側と同期した型定義（`ApiResponse`, `DashboardSummary` など）。

### 2. デザインシステム (DESIGN.mdに基づく)

- **コンセプト**: 「The Kinetic Editorial」（躍動感と高級の両立）。
- **スタイリング**: Tailwind CSS を使用し、`DESIGN.md` のトークンを定義。
  - カラー: Strava Orange (`#fc6100`), Primary (`#a43d00`), Background (`#f9f9fa`)。
  - タイポグラフィ: Lexend (見出し), Inter (本文)。
- **デザイン哲学**: 境界線（border）を極力使わず、背景色のトーンの重なりや Glassmorphism で階層を表現。
- **アイコン**: Lucide React を使用。
- **グラフ**: Recharts を使用し、デザインシステムに合わせた配色で TSS 推移を描画。

### 3. 認証・セキュリティ (Google 認証導入)

- **フロントエンド**: `@react-oauth/google` を使用。
  - Google Identity Services を介して ID トークンを取得。
- **バックエンド (GAS)**: リクエストヘッダーの ID トークンを検証。
  - Google のトークン検証エンドポイントを利用して有効性を確認。
  - 許可されたユーザーメールアドレスとの照合。
- **設定管理**: `.env.local` に `VITE_GOOGLE_CLIENT_ID` を追加。

### 4. コンポーネント構成

- `TssCard`: 直近30日のフィットネス（TSS）を表示。
- `LastActivityCard`: 最新のアクティビティ情報（名前、距離、時間、天気、AIコメントなど）を表示。
- `GearStatusList`: バイクやシューズの走行距離と、メンテナンス閾値までの進捗を表示。

## 実装ステップ

### 5. セキュリティ対策 (脆弱性のないアプリ)

- **認証の厳格化**: ID トークンの検証において、`iss` (発行者), `aud` (クライアントID), `exp` (有効期限) を確実にチェック。
- **認可の制御**: GAS 側で許可されたメールアドレス（自身の Google アカウント等）のみにデータ取得を制限。
- **XSS 対策**: React のデフォルトのエスケープ機能を信頼し、`dangerouslySetInnerHTML` の使用を避ける。
- **CSRF 対策**: ヘッドレス API では一般的に `Authorization` ヘッダーを使用するため、Cookie ベースの攻撃（CSRF）に対して耐性がありますが、ステートレスな設計を維持。
- **依存関係の監視**: `Snyk` を使用して脆弱性のあるライブラリを継続的にスキャン。
- **サニタイズ**: 外部（Strava等）から取得したデータに HTML が含まれる可能性がある場合（アクティビティ名など）、表示時に注意する。

## 導入予定の依存関係

### フロントエンド (npm packages)

- **開発用依存関係 (devDependencies)**
  - `tailwindcss`, `postcss`, `autoprefixer`: スタイリング用。
- **実行用依存関係 (dependencies)**
  - `@react-oauth/google`: Google 認証用。
  - `recharts`: データ可視化（グラフ）用。
  - `lucide-react`: アイコン表示用。
  - `clsx`, `tailwind-merge`: Tailwind のクラス結合用ユーティリティ。

### バックエンド (GAS)

- 特に追加のライブラリ（ライブラリID形式）は不要ですが、`UrlFetchApp` を使用して Google の OAuth2 tokeninfo API を呼び出すロジックを追加します。

### フェーズ 1: 環境構築と認証基盤の整備

- [ ] Tailwind CSS, `recharts`, `lucide-react`, `@react-oauth/google` のインストール。
- [ ] Google Cloud Console で OAuth 2.0 クライアント ID を作成・設定。
- [ ] GAS 側でのトークン検証ロジックの実装（`router.ts` の更新）。
- [ ] API クライアントおよび型定義の作成。

### フェーズ 2: UI コンポーネントの開発 (エディトリアルデザイン)

- [ ] **Global Style**: 境界線を排したレイヤリング構造の実装。
- [ ] **Chart**: デザインシステムに合わせた配色による TSS グラフの実装。
- [ ] **Components**: ガラスモフィズムを採用したカード、非対称なエディトリアルレイアウトの構築。

### フェーズ 3: データ連携と磨き込み

- [ ] 取得したデータのカード表示。
- [ ] 機材ステータスの警告表示（閾値越えの強調など）。

## ユーザー確認事項

> [!IMPORTANT]
>
> - GAS の API キーが `PropertiesService` に設定されている必要があります。
> - Windows 側からアクセスする場合、WSL2 のネットワーク転送が正常に動作している必要があります（現在の `host: true` 設定を維持します）。

## 検証計画

### 開発環境での確認

- `npm run dev` で起動し、ネットワークリクエストが成功して GAS からデータが取得できるか確認。
- データのローディング中にスケルトンスクリーンやスピナーが表示されるか確認。

### 表示内容の確認

- フィットネスの数値が正しいか。
- 機材リストが期待通り表示されるか。

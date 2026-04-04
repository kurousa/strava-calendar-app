# 🤝Contributing Guidelines

このプロジェクト（Strava to Google Calendar Sync）に興味を持っていただき、ありがとうございます！

私たちは、バグ報告、新機能の提案、コードの修正など、皆様からのあらゆる貢献（コントリビュート）を歓迎します。

開発にスムーズに参加していただくため、以下のガイドラインをご一読ください。

## 🐛 バグ報告と機能要望 (Issues)

バグを見つけた場合や、新しい機能を提案したい場合は、GitHubの [Issues](https://github.com/kurousa/strava-calendar-app/issues) タブからお知らせください。

* **バグ報告**: どのような操作をした時に、どのようなエラー（または意図しない動作）が発生したか、再現手順を具体的に記載してください。
* **機能要望**: なぜその機能が必要なのか、どのような課題が解決されるのかを分かりやすく記載してください。

## 💻 開発に参加する手順 (Pull Requests)

コードの修正や機能追加を行っていただく場合の流れは以下の通りです。

### 1. リポジトリのフォークとクローン

1. このリポジトリを自身のGitHubアカウントにフォーク（Fork）します。
2. フォークしたリポジトリをローカル（自分のパソコン）にクローンします。

```bash
git clone https://github.com/<your-username>/strava-calendar-app.git
cd strava-calendar-app
```

### 2. 開発環境の準備

開発には `Node.js` とGoogleの公式ツール `clasp` を使用します。
（詳しくは `README.md` の「ローカル開発環境のセットアップ」を参照して、自身の検証用GASプロジェクトと紐付けてください）

### 3. ブランチの作成

作業を始める前に、新しくブランチを作成してください。ブランチ名は作業内容がわかるような名前にすることをお勧めします。

bash

#### 例：新しい機能を追加する場合
git checkout -b feature/add-new-calendar-format

#### 例：バグを修正する場合
git checkout -b fix/auth-error


### 4. コードの変更とテスト

* GAS（Google Apps Script）の標準的なJavaScript（ES6）構文に従ってコードを記述してください。
* ご自身の検証用GASプロジェクトに `clasp push` を行い、意図通りに動作するかテストを行ってください。
* 機密情報（クライアントIDやシークレットなど）をコード内に直接書き込まないよう（ハードコードしないよう）十分注意してください。
* テストの実行には、vitestを使用しています。
* `tests`ディレクトリ以下に、`*.spec.js`の形式でテストファイルを作成してください。
* `pnpm test` でテストを実行できます。
    * テスト対象の関数は、それぞれモジュールの末尾で以下のようにexportしてください。
    ```javascript
    // Node.js環境（テスト時）のみエクスポートする
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            makeDefaultDescription,
            getActivityStyle,
            makeDescription
        };
    }
    ```

### 5. コミットとプッシュ

変更が完了したら、変更内容をコミットし、フォークした自身のリポジトリへプッシュします。

```bash
git add .
git commit -m "〇〇の機能を実装"
git push origin <ブランチ名>
```

### 6. Pull Requestの作成

GitHub上で、本プロジェクトの `main` ブランチに対して Pull Request (PR) を作成してください。
PRの説明欄には、以下の情報を含めていただくとレビューがスムーズになります。

* 変更の目的（どのIssueを解決するものか）
* 変更内容の概要
* 動作確認の方法

## 📝 コーディング規約

* インデントはスペース2つを使用しています。
* 変数名や関数名は分かりやすい英単語を使用し、キャメルケース（`camelCase`）で記述してください。
* 複雑な処理には、処理の意図を説明するコメントを適宜追加してください。

import fs from 'fs';

let content = fs.readFileSync('auth.ts', 'utf8');

const replacement = `
    if (!idToken) return false;

    // JWT形式 (Header.Payload.Signature) かどうかを簡単な正規表現で検証
    // Base64Urlエンコードされた文字列の3つの部分がドットで連結されていることを確認
    const jwtRegex = /^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$/;
    if (!jwtRegex.test(idToken)) {
        Logger.log('エラー: IDトークンの形式が正しくありません。');
        return false;
    }

    try {`;

content = content.replace(`    if (!idToken) return false;

    try {`, replacement);

fs.writeFileSync('auth.ts', content);
console.log('auth.ts updated.');

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true, // describe, it, expect などをインポートなしで使えるようにする
        setupFiles: ['./vitest.setup.js'], // モックのセットアップファイルを指定
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'json'],
            exclude: [
                'tests/**',
                'vitest.*.js',
                '*.cjs',
                '*.html',
                '*.md',
                '*.json',
                '.github/**',
                '.jules/**'
            ],
            include: [
                '*.js',
                'formatters/**/*.js'
            ]
        }
    },
});

import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true, // describe, it, expect などをインポートなしで使えるようにする
        setupFiles: ['./vitest.setup.ts'], // モックのセットアップファイルを指定
        exclude: [
            ...configDefaults.exclude,
            'dashboard/**'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'json'],
            reportOnFailure: true,
            exclude: [
                'tests/**',
                'dashboard/**',
                'vitest.*.ts',
                '*.cjs',
                '*.html',
                '*.md',
                '*.json',
                '.github/**',
                '.jules/**'
            ],
            include: [
                "**/*.ts"
            ]
        }
    },
});

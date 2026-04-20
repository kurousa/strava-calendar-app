import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true, // describe, it, expect などをインポートなしで使えるようにする
        setupFiles: ['./vitest.setup.ts'], // モックのセットアップファイルを指定
        exclude: [
            ...configDefaults.exclude
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'json'],
            reportOnFailure: true,
            exclude: [
                'tests/**',
                'dashboard/tests/**',
                'vitest.*.ts',
                '*.cjs',
                '*.html',
                '*.md',
                '*.json',
                '.github/**',
                '.jules/**'
            ],
            include: [
                "**/*.ts",
                "dashboard/src/**/*.ts",
                "dashboard/src/**/*.tsx"
            ]
        }
    },
});

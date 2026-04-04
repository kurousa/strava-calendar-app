import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true, // describe, it, expect などをインポートなしで使えるようにする
        setupFiles: ['./vitest.setup.js'], // モックのセットアップファイルを指定
    },
});
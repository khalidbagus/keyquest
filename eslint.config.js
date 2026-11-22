import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'vendor']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Only the lazy WorldScene chunk may import Phaser, so the entry chunk and
    // the pure rules and physics modules never pull it in (Requirement 24.13).
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/components/WorldScene/phaser/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'phaser',
              message:
                'Import Phaser only inside src/components/WorldScene/phaser/ so it stays in the lazy chunk.',
            },
          ],
          patterns: [
            {
              group: ['phaser/*'],
              message:
                'Import Phaser only inside src/components/WorldScene/phaser/ so it stays in the lazy chunk.',
            },
          ],
        },
      ],
    },
  },
])

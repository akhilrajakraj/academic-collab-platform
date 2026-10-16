import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  // Next.js generates this file, including triple-slash references required by TypeScript.
  // It is generated metadata rather than application source, so it should not be linted.
  { ignores: ['next-env.d.ts', '.next/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;

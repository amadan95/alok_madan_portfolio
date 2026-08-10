import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  {
    ignores: ["out/**", ".next/**", ".next*/**", "next-env.d.ts", "public/_generated/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;

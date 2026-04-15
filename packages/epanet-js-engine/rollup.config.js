const versions = [
  'v2.2', 'v2.2-msx',
  'v2.3', 'v2.3-msx',
  'v2.3.1', 'v2.3.1-msx',
  'v2.3.2', 'v2.3.2-msx',
  'v2.3.3', 'v2.3.3-msx',
  'v2.3.4', 'v2.3.4-msx',
  'v2.3.5', 'v2.3.5-msx',
  'master', 'master-msx',
  'dev', 'dev-msx',
];

const versionedConfigs = versions.map(version => ({
  input: `dist/${version}/index.js`,
  output: [
    { file: `dist/${version}/index.mjs`, format: 'es' },
    { file: `dist/${version}/index.cjs`, format: 'cjs', exports: 'default' },
  ],
}));

export default [
  {
    input: 'dist/index.js',
    output: [
      { file: 'dist/index.mjs', format: 'es' },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'default' },
    ],
  },
  ...versionedConfigs,
];

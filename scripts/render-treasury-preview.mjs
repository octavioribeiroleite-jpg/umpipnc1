import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
// Use the already installed build tool; no installation, server or network is needed.
const { build } = createRequire(require.resolve('vite'))('esbuild');

export const emptyProps = {
  entries: [], totalCount: 0, page: 0, filteredIncome: 0, filteredExpense: 0,
  filters: { search: '', kind: '', start: '', end: '' },
  onFund() {}, onNewEntry() {}, onNewFund() {}, onEdit() {}, onLogin() {},
  onLogout() {}, onShare() {}, onRefresh() {}, onFilter() {}, onPage() {},
};

let renderer;
export async function getTreasuryRenderer() {
  if (!renderer) {
    renderer = (async () => {
      const result = await build({
        absWorkingDir: root,
        stdin: {
          contents: `import React from 'react';
            import { renderToStaticMarkup } from 'react-dom/server';
            import { TreasuryDashboard } from './src/components/treasury/TreasuryDashboard';
            export const render = props => renderToStaticMarkup(React.createElement(TreasuryDashboard, props));`,
          resolveDir: root, sourcefile: 'treasury-static-render.tsx', loader: 'tsx',
        },
        bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', mainFields: ['module', 'main'],
        alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'dataurl' },
        plugins: [{
          name: 'reuse-installed-react',
          setup(build) {
            // The disconnected static preview has no service-worker runtime.
            build.onResolve({filter: /\/UpdateAppButton$/}, () => ({path: 'update-button', namespace: 'static-preview'}));
            build.onLoad({filter: /.*/, namespace: 'static-preview'}, () => ({contents: `import React from 'react'; export const UpdateAppButton=({className})=>React.createElement('button',{type:'button',className,disabled:true,'aria-label':'Atualizar aplicativo'},'Atualizar aplicativo');`, loader: 'js'}));
            build.onResolve({ filter: /^react(?:-dom)?(?:\/|$)/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
          },
        }],
      });
      return (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).render;
    })();
  }
  return renderer;
}

export async function renderTreasuryPreview() {
  const render = await getTreasuryRenderer();
  // A disconnected overview deliberately displays em dashes, never invented balances.
  const markup = render(emptyProps).replace(/href="\/(?:tesouraria)?"/g, 'href="#preview-notice"');
  const globalCss = await readFile(path.join(root, 'src/index.css'), 'utf8');
  const compiled = await postcss([tailwindcss(path.join(root, 'tailwind.config.ts')), autoprefixer()]).process(globalCss, { from: path.join(root, 'src/index.css') });
  const sources = [
    'src/responsive-foundation.css', 'src/auth-readability.css', 'src/society-selector.css',
    'src/identity-confirmation.css', 'src/camisas-separation.css',
    'src/components/layout/diretoria-theme.css', 'src/components/layout/diretoria-navigation.css',
    'src/components/layout/workspace-header.css', 'src/components/treasury/treasury-dashboard.css',
  ];
  const css = [compiled.css, ...await Promise.all(sources.map(source => readFile(path.join(root, source), 'utf8')))].join('\n');
  const notice = 'Prévia estática · sem conexão com banco · controles ilustrativos';
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
<title>Prévia estática — Tesouraria IPNC</title>
<style>${css}</style>
<style>.preview-notice{padding:12px 20px;background:#fff4d9;color:#634d22;border-bottom:1px solid #e4c887;font:13px/1.6 system-ui,sans-serif}.preview-notice strong{display:block;font-weight:700}.preview-notice p{margin:3px 0 0;font-size:12px}</style>
</head><body class="ipnc-workspace-theme"><div id="preview-notice" class="preview-notice" role="note"><strong>${notice}</strong><p>Esta é uma apresentação do layout real do aplicativo. Nenhum saldo ou lançamento foi carregado. Os valores aparecem como “—”; os botões não cadastram, consultam nem compartilham dados. Abra este arquivo diretamente no navegador, sem iniciar um servidor.</p></div><div id="root">${markup}</div></body></html>\n`;
  const destination = path.join(root, 'docs/treasury/preview.html');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html, 'utf8');
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(await renderTreasuryPreview());
}

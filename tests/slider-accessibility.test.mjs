import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const root = path.resolve(import.meta.dirname, '..');
const built = await build({
  absWorkingDir: root,
  stdin: {
    contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {Slider} from './src/components/ui/slider';
      export function render(props) { return renderToStaticMarkup(<Slider value={[1.5]} min={1} max={3} {...props}/>); }`,
    resolveDir: root, loader: 'tsx',
  },
  bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
  plugins: [{ name: 'local-react-boundary', setup(builder) {
    builder.onResolve({ filter: /^react(?:-dom)?(?:\/|$)/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
  } }],
});
const { render } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);

test('the focusable slider thumb receives its accessible name and human-readable value', () => {
  const html = render({ 'aria-label': 'Zoom da imagem', 'aria-valuetext': '1.50 vezes' });
  const thumb = html.match(/<span role="slider"[^>]*>/)?.[0];
  assert.ok(thumb);
  assert.match(thumb, /aria-label="Zoom da imagem"/);
  assert.match(thumb, /aria-valuetext="1.50 vezes"/);
  assert.match(thumb, /tabindex="0"/);
  assert.match(thumb, /h-\[48px\] w-\[48px\]/);
  assert.match(thumb, /before:inset-\[14px\]/);
});

test('the slider relays an external visible label to its thumb', () => {
  const thumb = render({ 'aria-labelledby': 'rotation-label' }).match(/<span role="slider"[^>]*>/)?.[0];
  assert.match(thumb, /aria-labelledby="rotation-label"/);
});

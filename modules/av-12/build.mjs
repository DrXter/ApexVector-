import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['entry.jsx'], bundle: true, minify: true, write: false, format: 'iife', loader: { '.jsx': 'jsx' }, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Human vs Agent Finding Classifier · ApexVector AV-12</title>
<style>
  :root{--av-bg:#0C0C0C;--av-panel:#0A140D;--av-panel-2:#0E1A12;--av-border:#1A3D2A;--av-border-bright:#2A6B3E;--av-green:#00FF41;--av-green-dim:#2E8B4E;--av-amber:#F5A623;--av-red:#FF4444;--av-text:#C8E6D0;--av-text-dim:#6A9A78;--av-faint:#3A6048;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--av-bg);min-height:100vh;padding:24px 20px 80px;}
  body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,rgba(0,255,65,0.015) 0,rgba(0,255,65,0.015) 1px,transparent 1px,transparent 3px);pointer-events:none;z-index:999;}
  textarea:focus,input:focus,select:focus{outline:none;border-color:var(--av-border-bright)!important;}
  button:hover{filter:brightness(1.1);}
</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script></body></html>
`;
writeFileSync('index.html', html);
console.log('index.html', html.length);

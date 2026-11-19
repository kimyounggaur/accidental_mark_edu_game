const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=path.join(root,'src');
const js=['01-theory.js','02-model.js','03-content.js','04-state.js','05-visuals.js','08-audio.js','10-storage.js','11-screens.js','12-app.js','13-tests.js'].map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('\n\n');
const html=fs.readFileSync(path.join(src,'shell.html'),'utf8').replace('/*STYLES*/',()=>fs.readFileSync(path.join(src,'style.css'),'utf8')).replace('/*SCRIPT*/',()=>js+'\nboot();\n');
if(Buffer.byteLength(html)>300*1024)throw Error('Single HTML exceeds 300KB budget');
if(/https?:\/\//.test(html.replaceAll('http://www.w3.org/2000/svg','')))throw Error('External request reference in single-file HTML');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist','index.html'),html);fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Built standalone index.html: '+Buffer.byteLength(html)+' bytes; no external dependencies.');

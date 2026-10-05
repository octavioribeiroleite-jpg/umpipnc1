import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const repo = path.resolve(process.argv[2] || process.cwd());
const out = path.resolve(process.argv[4] || '/tmp/ipnc-brand-pdf-qa');
fs.mkdirSync(out, {recursive:true});
const expectedLogoHash = process.argv[3] || null;
const logoPath = path.join(repo, 'src/assets/logo-ipnc.png');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const logoBytes = fs.readFileSync(logoPath);
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
if (!logoBytes.subarray(0,8).equals(signature)) throw Error('The production logo is not a PNG. Do not run final QA until root supplies the master PNG.');
const width = logoBytes.readUInt32BE(16), height = logoBytes.readUInt32BE(20);
if (width !== 1280 || height !== 1280) throw Error(`Waiting for the approved 1280 master; current PNG is ${width}x${height}.`);
if (expectedLogoHash && hash(logoBytes) !== expectedLogoHash) throw Error('The production logo hash does not match the master supplied by root.');

// This process contains only pure production PDF generators and local data.
// It does not instantiate an application client, an Auth context, or a browser.
globalThis.fetch = () => Promise.reject(Error('Network access is forbidden in this PDF QA process.'));
const require = createRequire(path.join(repo, 'package.json'));
const { build } = require('esbuild');
const { jsPDF } = require('jspdf');
const saved = [];
jsPDF.API.save = function(filename) {
  const target = path.join(out, path.basename(filename));
  fs.writeFileSync(target, Buffer.from(this.output('arraybuffer')));
  saved.push({ filename: path.basename(filename), pages: this.getNumberOfPages(), bytes: fs.statSync(target).size });
  return this;
};
const built = await build({
  absWorkingDir: repo,
  stdin: {
    contents: `export {generateCalendarPDF} from './src/utils/generateCalendarPDF';
      export {generateEbdAttendancePDF,generateEbdPeriodPDF,generateEbdQuarterlyPDF} from './src/utils/generateEbdPDF';
      export {captureEbdSnapshot,markEbdDataChanged} from './src/lib/ebd-attendance-queue';`,
    resolveDir: repo, sourcefile: 'isolated-pdf-brand-qa.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'cjs', write: false,
  alias: {'@': path.join(repo,'src')}, loader: {'.png':'dataurl'}, external: ['jspdf'],
  plugins: [{name:'reject-backend-imports',setup(builder){
    builder.onResolve({filter:/integrations\/supabase|contexts\/AuthContext|^supabase$/},args=>{
      throw Error(`Forbidden backend/auth import: ${args.path}`);
    });
  }}],
});
const bundlePath = path.join(out,'generators.cjs');
fs.writeFileSync(bundlePath,built.outputFiles[0].text);
// Preserve Vite's default-import contract when executing the bundle as CommonJS.
// Return the same real constructor whose save method was intercepted above.
const qaRequire = id => id === 'jspdf' ? jsPDF : require(id);
const pdfExports = {exports:{}};
const execute = new Function('require','module','exports','__filename','__dirname',built.outputFiles[0].text);
execute(qaRequire,pdfExports,pdfExports.exports,bundlePath,out);
const generators = pdfExports.exports;

const classes = [{id:'qa-class-a',name:'Adultos - turma fictícia A',order_index:1},{id:'qa-class-b',name:'Jovens - turma fictícia B',order_index:2}];
const students = classes.flatMap((cls,classIndex)=>Array.from({length:6},(_,index)=>({id:`qa-student-${classIndex}-${index}`,class_id:cls.id,name:`Aluno Fictício ${classIndex+1}-${index+1}`})));
const date = '2026-10-04';
const attendance = students.map((student,index)=>({student_id:student.id,class_id:student.class_id,date,present:index%3!==0}));
const dates = Array.from({length:13},(_,index)=>{const day=new Date(2026,0,4+7*index,12);return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;});
const days = dates.map((day,index)=>({date:day,present:8+(index%3),total:12,percentage:Math.round((8+(index%3))/12*100),visitorCount:index%4===0?1:0}));
const periodClasses = classes.map((cls,index)=>({name:cls.name,totalPresent:52+index*13,avgPercentage:67+index*17}));
const classesDetail = classes.map((cls,index)=>({
  ...periodClasses[index],totalVisitors:4,
  days:dates.map((day,dayIndex)=>({date:day,present:4+dayIndex%2,total:6,percentage:Math.round((4+dayIndex%2)/6*100),visitorCount:dayIndex%4===0?1:0,visitorNames:dayIndex%4===0?[`Visitante Fictício ${index+1}-${dayIndex+1}`]:[]})),
  students:students.filter(student=>student.class_id===cls.id).map((student,studentIndex)=>({name:student.name,present:8+studentIndex%3,total:13,percentage:Math.round((8+studentIndex%3)/13*100)})),
}));
const attendanceParams = {snapshotVersion:0,classes,students,attendance,date,formattedDate:'04/10/2026 - dados fictícios de QA',professorName:'Responsável Fictício de QA'};
const periodParams = {snapshotVersion:0,periodLabel:'1º trimestre de 2026 - dados fictícios de QA',days,classes:periodClasses};
const quarterlyParams = {snapshotVersion:0,periodLabel:periodParams.periodLabel,days,classesDetail};

// Exercise the real stale-snapshot guard before producing any EBD document.
const oldSnapshot = generators.captureEbdSnapshot();
generators.markEbdDataChanged();
const guardResults=[];
for (const [name,params] of [['generateEbdAttendancePDF',attendanceParams],['generateEbdPeriodPDF',periodParams],['generateEbdQuarterlyPDF',quarterlyParams]]) {
  let blocked=false;
  try {generators[name]({...params,snapshotVersion:oldSnapshot});} catch(error) {blocked=error.name==='EbdSnapshotChangedError';}
  if (!blocked) throw Error(`${name} did not preserve the real stale-snapshot guard.`);
  guardResults.push({generator:name,staleSnapshotBlocked:true});
}
if (saved.length) throw Error('A stale-snapshot check unexpectedly saved a PDF.');
const currentSnapshot=generators.captureEbdSnapshot();
generators.generateEbdAttendancePDF({...attendanceParams,snapshotVersion:currentSnapshot});
generators.generateEbdPeriodPDF({...periodParams,snapshotVersion:currentSnapshot});
generators.generateEbdQuarterlyPDF({...quarterlyParams,snapshotVersion:currentSnapshot});
generators.generateCalendarPDF({
  events:Array.from({length:28},(_,index)=>({id:`qa-event-${index}`,title:index===27?'EVENTO_CANCELADO_FICTICIO_NAO_EXPORTAR':`Encontro fictício ${String(index+1).padStart(2,'0')}`,start_date:`2026-10-${String(index+1).padStart(2,'0')}T18:00:00`,all_day:index%5===0,status:index===27?'cancelado':'confirmado',description:'Exclusivamente dados fictícios para QA da marca',location:'Local fictício'})),
  month:9,year:2026,societies:[{id:'qa-society',name:'Turma QA',color:'#197c53'}],getEventColor:()=> '#197c53',getEventSocietyName:()=> 'Turma QA',filterLabel:'IPNC - dados fictícios',
});
if (saved.length!==4) throw Error(`Expected 4 PDFs; received ${saved.length}.`);
const manifest={
  generatedAt:new Date().toISOString(),fixtureOnly:true,networkAccess:'disabled',
  repo,logo:{path:logoPath,sha256:hash(logoBytes),width,height},
  sources:['src/utils/generateCalendarPDF.ts','src/utils/generateEbdPDF.ts','src/lib/ebd-attendance-queue.ts'].map(file=>({file,sha256:hash(fs.readFileSync(path.join(repo,file)))})),
  guards:guardResults,documents:saved,
};
fs.writeFileSync(path.join(out,'generation.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({logo:manifest.logo,guards:guardResults,documents:saved},null,2));

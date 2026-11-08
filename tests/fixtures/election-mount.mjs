import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const project = path.resolve(import.meta.dirname, '../..');
export { React, TestRenderer, act };
export const flush = async () => { for (let i=0;i<16;i++) await Promise.resolve(); };
export function deferred() { let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; }
export const textOf = node => typeof node==='string'?node:(node.children||[]).map(textOf).join('');
export function button(tree, label) { return tree.root.findAllByType('button').find(node=>textOf(node).trim()===label); }

// Mounted React components and effects are real. Native portals and UI primitives
// are inert here; browser QA separately verifies DOM focus, layout and Radix.
export function mountedEnvironment(overrides={}) {
 const intervals=new Map(),timeouts=new Map();let tick=0,id=0;
 const timer=(collection,callback,delay)=>{const key=++id;collection.set(key,{callback,delay,next:tick+delay});return key;};
 const browser=Object.assign(new EventTarget(),{location:{origin:'https://fixture.local',href:'https://fixture.local/eleicoes/fixture'},
  setInterval:(callback,delay)=>timer(intervals,callback,delay),clearInterval:key=>intervals.delete(key),
  setTimeout:(callback,delay)=>timer(timeouts,callback,delay),clearTimeout:key=>timeouts.delete(key),open(){},
 });
 const document=Object.assign(new EventTarget(),{visibilityState:'visible'});
 const storage=new Map();const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const channels=[],navigations=[],mounts={dialog:0,candidate:0};
 const noop=()=>{};
 const client={from:()=>{throw new Error('unexpected table query');},functions:{invoke:()=>{throw new Error('unexpected function');}},
  channel:()=>{const entry={handlers:[],on(kind,filter,callback){entry.handlers.push({kind,filter,callback});return entry;},subscribe(){channels.push(entry);return entry;}};return entry;},
  removeChannel:channel=>{const index=channels.indexOf(channel);if(index>=0)channels.splice(index,1);},...overrides.client};
 const DialogContext=React.createContext(null);
 function Dialog({open,onOpenChange,children}){return React.createElement(DialogContext.Provider,{value:{open,onOpenChange}},children);}
 function Trigger({children}){const state=React.useContext(DialogContext);return React.cloneElement(children,{onClick:()=>state.onOpenChange(true)});}
 function Content({children,...props}){const state=React.useContext(DialogContext);return state?.open?React.createElement(MountedContent,props,children):null;}
 function MountedContent({children,...props}){React.useEffect(()=>{mounts.dialog++;},[]);return React.createElement('section',{role:'dialog',...props},children);}
 const primitive=tag=>({children,asChild,...props})=>asChild&&React.isValidElement(children)?React.cloneElement(children,props):React.createElement(tag,props,children);
 const ui={Button:primitive('button'),Input:primitive('input'),Label:primitive('label'),Badge:primitive('span'),Progress:primitive('progress'),
  Dialog,DialogTrigger:Trigger,DialogContent:Content,DialogTitle:primitive('h2'),DialogDescription:primitive('p'),DialogHeader:primitive('header'),DialogFooter:primitive('footer'),
  AlertDialog:Dialog,AlertDialogContent:Content,AlertDialogTitle:primitive('h2'),AlertDialogDescription:primitive('p'),AlertDialogHeader:primitive('header'),AlertDialogFooter:primitive('footer'),AlertDialogCancel:primitive('button'),AlertDialogAction:primitive('button'),
  Tabs:primitive('div'),TabsList:primitive('div'),TabsTrigger:primitive('button'),TabsContent:primitive('div'),Carousel:primitive('div'),CarouselContent:primitive('div'),CarouselItem:primitive('div'),
  QueryErrorState:props=>React.createElement('p',{role:'alert'},props.message),
 };
 const icons=new Map();const iconModule=new Proxy({},{get:(_,name)=>{if(!icons.has(name))icons.set(name,primitive('i'));return icons.get(name);}});
 const route={id:'fixture',electionId:'fixture'};
 const mocks={
  '@/integrations/supabase/client':{supabase:client},'@/contexts/AuthContext':{useAuth:()=>({user:{id:'organizer'}})},
  'react-router-dom':{useNavigate:()=>value=>navigations.push(value),useParams:()=>route,useSearchParams:()=>[new URLSearchParams()]},
  '@/hooks/use-toast':{useToast:()=>({toast:noop})},'@/lib/utils':{cn:(...args)=>args.filter(Boolean).join(' ')},
  '@/components/layout/AppLayout':{AppLayout:primitive('main')},'qrcode.react':{QRCodeSVG:primitive('svg')},
  '@/lib/election-sequence':{findElectionSequence:()=>null,UMP_POSITIONS:['Presidente','Vice-presidente','1º secretário','2º secretário','Tesoureiro']},
  './DeviceRegistration':{DeviceRegistration:primitive('div')},'./EditElectionDialog':{EditElectionDialog:()=>null},
  ...overrides.modules,
 };
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  function resolve(name){
   if(Object.hasOwn(mocks,name))return mocks[name];
   if(name==='react'||name==='react/jsx-runtime')return require(name);
   if(name==='lucide-react')return iconModule;
   if(name.startsWith('@/components/ui/'))return ui;
   if(/\.(mp3|png|jpg)$/.test(name))return {__esModule:true,default:'fixture-asset'};
   let target=name.startsWith('@/')?path.join(project,'src',name.slice(2)):name.startsWith('.')?path.resolve(path.dirname(file),name):null;
   if(target){if(!existsSync(target)){target=['.ts','.tsx','.mjs'].map(extension=>target+extension).find(existsSync);}if(target)return load(target);}
   throw new Error(`Unmocked mount import: ${name}`);
  }
  class Audio {load(){} play(){return Promise.resolve();} pause(){}}
  vm.runInNewContext(compiled,{module,exports:module.exports,require:resolve,window:browser,document,localStorage,crypto,URL,URLSearchParams,Audio,
   navigator:{},setInterval:browser.setInterval,clearInterval:browser.clearInterval,setTimeout:browser.setTimeout,clearTimeout:browser.clearTimeout,console,
   ...overrides.globals,
  },{filename:file});return module.exports;
 }
 return {browser,document,client,channels,route,navigations,mounts,localStorage,
  load:relative=>load(path.join(project,relative)),
  async advance(ms){const until=tick+ms;while(true){const all=[...intervals.entries(),...timeouts.entries()].sort((a,b)=>a[1].next-b[1].next);const next=all[0];if(!next||next[1].next>until)break;tick=next[1].next;const [key,value]=next;if(intervals.has(key))value.next+=value.delay;else timeouts.delete(key);value.callback();}tick=until;await flush();},
  timerCount:()=>intervals.size+timeouts.size,
 };
}

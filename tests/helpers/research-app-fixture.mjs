import { setMaxListeners } from 'node:events';

// Minimal native-dialog/map DOM for exercising the actual main.js module graph.
// No production source rewriting; time/image completion remain under test control.
export function createResearchAppFixture(seed) {
  const all=new Set(),nodes=new Map(),stored=new Map(seed),timers=new Map(),images=[];
  let now=0,nextTimer=0,holdImages=false,navigationCount=0;
  class Element extends EventTarget {
    constructor(dataset={}) {
      super();all.add(this);this.dataset=dataset;this.children=new Map();this.buttons=[];this.badges=[];
      this.attributes={};this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};
      this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),toggle:(c,v)=>v?this.classes.add(c):this.classes.delete(c)};
      this.open=false;this.disabled=false;this.isConnected=true;this.textContent='';this.value='';this.listeners=[];
      this.clientWidth=705;this.clientHeight=415;this.onclickAssignments=0;
    }
    addEventListener(type,callback,options) {
      if(options?.signal)setMaxListeners(0,options.signal);
      const entry={type,active:!options?.signal?.aborted};this.listeners.push(entry);
      options?.signal?.addEventListener('abort',()=>{entry.active=false;},{once:true});
      super.addEventListener(type,callback,options);
    }
    set onclick(value){this.clickHandler=value;this.onclickAssignments++;}get onclick(){return this.clickHandler;}
    set innerHTML(value) {
      this.html=value;
      this.children.forEach(child=>{child.isConnected=false;});this.children.clear();
      this.buttons=[...value.matchAll(/<button[^>]*data-(id|region)="([^"]+)"/g)].map(m=>new Element({[m[1]]:m[2]}));
      this.badges=[...value.matchAll(/data-badge="([^"]+)"/g)].map(m=>new Element({badge:m[1]}));
    }
    get innerHTML(){return this.html||'';}
    querySelector(selector) {
      if(selector==='details[open]')return null;
      if(selector==='[data-region]')return this.buttons.find(b=>b.dataset.region)||null;
      const region=selector.match(/^\[data-region="([^"]+)"\]$/);
      if(region)return this.buttons.find(b=>b.dataset.region===region[1])||null;
      if(selector==='.island')return get('.island');
      if(!this.children.has(selector))this.children.set(selector,new Element());
      return this.children.get(selector);
    }
    querySelectorAll(selector) {
      if(selector==='[data-startup-panel]')return this.panels||[];
      if(selector==='[data-badge]')return this.badges;
      if(this===nodes.get('#map-animals'))return selector==='.animal-marker'?this.buttons.filter(b=>b.dataset.id):this.buttons;
      if(selector==='[data-photo-slot]'||selector==='details')return [];
      return [];
    }
    setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
    getClientRects(){return [{}];}getBoundingClientRect(){return {left:0,top:0,right:705,bottom:415,width:parseFloat(this.style.width)||705,height:parseFloat(this.style.height)||415};}
    focus(){document.activeElement=this;}select(){}setPointerCapture(){}getAnimations(){return [];}
    closest(selector) {
      if(selector==='[data-region]'&&this.dataset.region)return this;
      if(selector==='.animal-marker'&&this.dataset.id)return this;
      return null;
    }
    showModal(){this.open=true;}
    close(){this.open=false;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}
    animate(){let finish;const finished=new Promise(resolve=>finish=resolve);this.animation={finished,finish,cancel(){}};return this.animation;}
  }
  const get=selector=>{if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);};
  const utility=get('#utility-dialog'),content=get('#dialog-content'),startup=get('#research-startup-dialog');
  startup.panels=['initialization','identification','assignment'].map(id=>new Element({startupPanel:id}));
  const toolbar=['guide','hints','records','profile'].map(dialog=>new Element({dialog}));
  const root={style:{overflow:'',scrollbarGutter:''}};
  globalThis.document={activeElement:null,documentElement:root,
    querySelector:selector=>selector==='dialog[open]'?[...all].find(node=>node.open)||null:selector==='[data-dialog="guide"]'?toolbar[0]:get(selector),
    querySelectorAll:selector=>selector==='[data-dialog]'?toolbar:[]};
  globalThis.window={addEventListener(){}};
  globalThis.requestAnimationFrame=callback=>callback();
  globalThis.matchMedia=()=>({matches:true});
  globalThis.location={search:'',reload(){navigationCount++;throw Error('Navigation forbidden');},replace(){navigationCount++;throw Error('Navigation forbidden');},assign(){navigationCount++;throw Error('Navigation forbidden');}};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key),
    clear(){throw Error('Storage.clear is forbidden');}
  }});
  globalThis.setTimeout=(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay,due:now+delay});return id;};
  globalThis.clearTimeout=id=>timers.delete(id);
  globalThis.Image=class {
    set src(value) {
      this.value=value;this.naturalWidth=value.includes('taiwan-ecological')?1024:1672;this.naturalHeight=value.includes('taiwan-ecological')?1536:941;
      const complete=()=>this.onload();
      if(holdImages)images.push(complete);else queueMicrotask(complete);
    }
    get src(){return this.value;}
  };
  const fire=(node,type='click',target=node)=>{
    const event=new Event(type,{cancelable:true});
    if(target!==node)Object.defineProperty(event,'target',{value:target});
    if(type==='click')node.onclick?.(event);
    node.dispatchEvent(event);return event;
  };
  const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  const dismiss=async()=>{fire(utility,'cancel');await settle();};
  const toolbarOpen=mode=>fire(toolbar.find(button=>button.dataset.dialog===mode));
  const advanceBy=elapsed=>{
    const target=now+elapsed;
    while(timers.size) {
      const [id,task]=[...timers].sort((a,b)=>a[1].due-b[1].due)[0];
      if(task.due>target)break;
      timers.delete(id);now=task.due;task.callback();
    }
    now=target;
  };
  const zoomTo=scale=>{
    const event=new Event('wheel',{cancelable:true});
    Object.defineProperties(event,{deltaY:{value:-Math.log(scale/Number(get('#map-world').style['--map-scale']))/.0015},clientX:{value:350},clientY:{value:200}});
    get('#map-viewport').dispatchEvent(event);
  };
  const enterRegion=async id=>{
    zoomTo(2.3);
    const button=get('#map-animals').buttons.find(b=>b.dataset.region===id);
    if(!button)throw Error('Missing entrance '+id);
    fire(get('#map-world'),'click',button);await settle();
  };
  return {get,all,stored,timers,utility,content,startup,toolbar,root,fire,settle,dismiss,toolbarOpen,advanceBy,zoomTo,enterRegion,
    holdImages(value){holdImages=value;},releaseImages(){images.splice(0).forEach(complete=>complete());},
    get navigationCount(){return navigationCount;}};
}

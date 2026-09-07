"use client";

import { useEffect, useRef, useState } from "react";

type Thread={title:string;detail:string};
type Result={threads:Thread[];synthesis:string;nextStep:string;confidence:number};

type SpeechRecognitionLike={lang:string;continuous:boolean;interimResults:boolean;start:()=>void;stop:()=>void;onresult:((e:any)=>void)|null;onend:(()=>void)|null;onerror:(()=>void)|null};
type SpeechWindow=Window & {SpeechRecognition?:new()=>SpeechRecognitionLike;webkitSpeechRecognition?:new()=>SpeechRecognitionLike};

const examples=['Estou com problema no trabalho e isso está virando briga em casa...','Tenho dinheiro para resolver uma coisa, mas estou travado entre duas decisões...','Minha cabeça está cheia e eu não sei qual problema resolver primeiro...'];

export default function Cowboy(){
  const [text,setText]=useState('');
  const [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [error,setError]=useState('');
  const recognitionRef=useRef<SpeechRecognitionLike|null>(null);

  useEffect(()=>()=>{recognitionRef.current?.stop();window.speechSynthesis?.cancel()},[]);

  async function reorganize(){
    const value=text.trim();
    if(!value||loading)return;
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/spiral/cowboy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Falha');
      setResult(d);
    }catch{setError('Não foi possível reorganizar agora. Tente novamente.')}
    finally{setLoading(false)}
  }

  function toggleVoice(){
    const w=window as SpeechWindow;
    if(listening){recognitionRef.current?.stop();setListening(false);return}
    const Recognition=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!Recognition){setError('O navegador não oferece voz. Você pode escrever normalmente.');return}
    const r=new Recognition();r.lang='pt-BR';r.continuous=true;r.interimResults=true;
    r.onresult=(e:any)=>{let s='';for(let i=e.resultIndex||0;i<e.results.length;i++)s+=e.results[i][0]?.transcript||'';if(s.trim())setText(s.trim())};
    r.onend=()=>setListening(false);r.onerror=()=>{setListening(false);setError('Não consegui ouvir. Verifique a permissão do microfone.')};
    recognitionRef.current=r;try{r.start();setListening(true)}catch{setListening(false)}
  }

  function speakResult(){
    if(!result||!window.speechSynthesis)return;
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);return}
    const u=new SpeechSynthesisUtterance(`${result.synthesis}. Próximo passo: ${result.nextStep}`);u.lang='pt-BR';u.rate=.95;u.onend=()=>setSpeaking(false);window.speechSynthesis.cancel();window.speechSynthesis.speak(u);setSpeaking(true);
  }

  return <main className="cowboy-shell"><div className="cowboy-stars" aria-hidden="true">{Array.from({length:55},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,top:`${(i*61)%92}%`,animationDelay:`${i%9}s`}}/>)}</div><header className="cowboy-header"><div className="cowboy-brand"><span className="cowboy-orb"/>SPIRAL</div><span>COWBOY</span></header><section className="cowboy-hero"><div className="cowboy-glow"/><p>SPIRAL TALK</p><h1>Fale do jeito que vier.<br/><em>Eu separo o que está misturado.</em></h1><div className="cowboy-panel"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Pode começar por onde quiser..." aria-label="Conte o que está acontecendo"/><div className="cowboy-actions"><button onClick={toggleVoice} className={listening?'cowboy-voice active':'cowboy-voice'}>{listening?'● Parar':'◉ Falar'}</button><button onClick={()=>void reorganize()} disabled={!text.trim()||loading} className="cowboy-primary">{loading?'Organizando...':'Separar o que está misturado →'}</button></div></div><div className="cowboy-examples">{examples.map(x=><button key={x} onClick={()=>setText(x)}>{x}</button>)}</div>{error&&<p className="cowboy-error">{error}</p>}</section>{result&&<section className="cowboy-result"><div className="cowboy-result-head"><span>O que apareceu no seu relato</span><small>{Math.round(result.confidence*100)}% de confiança</small></div><div className="cowboy-threads">{result.threads.map((t,i)=><article key={i}><b>0{i+1}</b><div><h2>{t.title}</h2><p>{t.detail}</p></div></article>)}</div><div className="cowboy-synthesis"><p>{result.synthesis}</p><strong>Próximo passo</strong><p>{result.nextStep}</p></div><div className="cowboy-result-actions"><button onClick={speakResult}>{speaking?'■ Parar voz':'◉ Ouvir o Spiral'}</button><button onClick={()=>{setResult(null);setText('')}}>Começar outra conversa</button></div></section>}<footer>Sem terapia. Sem diagnóstico. Sem pressão para continuar. <span>Seu espaço para organizar o que está acontecendo.</span></footer><style jsx>{` .cowboy-shell{min-height:100vh;background:#05070c;color:#eee;position:relative;overflow:hidden;font-family:Inter,system-ui,sans-serif}.cowboy-stars{position:fixed;inset:0;pointer-events:none;opacity:.8}.cowboy-stars i{position:absolute;width:2px;height:2px;border-radius:50%;background:#b9c0ce;opacity:.55;animation:twinkle 5s ease-in-out infinite}.cowboy-header{position:relative;z-index:1;display:flex;justify-content:space-between;padding:30px 7%;font-size:11px;letter-spacing:.22em;color:#777}.cowboy-brand{display:flex;gap:10px;align-items:center;color:#cdb77b}.cowboy-orb{width:9px;height:9px;border-radius:50%;box-shadow:0 0 18px #a99562;background:#d9c47c}.cowboy-hero,.cowboy-result{position:relative;z-index:1;width:min(760px,90%);margin:8vh auto 0}.cowboy-hero>p{font-size:11px;letter-spacing:.24em;color:#bca873}.cowboy-hero h1{font-size:clamp(32px,6vw,58px);line-height:1.12;font-weight:400;margin:18px 0 34px}.cowboy-hero h1 em{font-style:normal;color:#d3c8ae}.cowboy-panel{background:rgba(20,24,34,.76);border:1px solid #29303d;border-radius:24px;padding:18px;box-shadow:0 25px 80px rgba(0,0,0,.4)}.cowboy-panel textarea{width:100%;min-height:145px;background:transparent;border:0;outline:0;color:#eee;font:inherit;font-size:19px;line-height:1.55;resize:vertical}.cowboy-panel textarea::placeholder{color:#6d7380}.cowboy-actions{display:flex;gap:12px;margin-top:12px}.cowboy-actions button,.cowboy-result-actions button{border:0;border-radius:14px;padding:15px 20px;font:inherit;cursor:pointer}.cowboy-voice{background:#171d29;color:#cbd0d9}.cowboy-voice.active{color:#e1c57b}.cowboy-primary{flex:1;background:#d8bd6d;color:#101116;font-weight:600}.cowboy-primary:disabled{opacity:.45;cursor:default}.cowboy-examples{display:grid;gap:9px;margin-top:22px}.cowboy-examples button{background:transparent;border:1px solid #171d29;color:#777f8d;border-radius:18px;padding:14px 18px;text-align:left;font:inherit;cursor:pointer}.cowboy-error{color:#e9a1a1}.cowboy-result{margin-top:34px;background:rgba(14,18,26,.82);border:1px solid #272d39;border-radius:24px;padding:24px}.cowboy-result-head{display:flex;justify-content:space-between;gap:15px;color:#c8c1ad}.cowboy-result-head small{color:#7d8491}.cowboy-threads article{display:flex;gap:18px;padding:22px 0;border-bottom:1px solid #222833}.cowboy-threads b{color:#bba66f;font-size:13px}.cowboy-threads h2{font-size:20px;font-weight:500;margin:0 0 7px}.cowboy-threads p,.cowboy-synthesis p{color:#aeb4bf;line-height:1.55}.cowboy-synthesis{padding:22px 0}.cowboy-synthesis strong{display:block;color:#d8bd6d;margin-top:20px}.cowboy-result-actions{display:flex;gap:10px}.cowboy-result-actions button{background:#171d29;color:#ddd}.cowboy-result-actions button+button{background:transparent;color:#8e96a4}.cowboy-shell footer{position:relative;z-index:1;text-align:center;color:#555d69;font-size:11px;padding:60px 20px 30px}.cowboy-shell footer span{display:block;margin-top:5px}@keyframes twinkle{0%,100%{opacity:.25}50%{opacity:.8}}@media(max-width:600px){.cowboy-header{padding:24px}.cowboy-hero,.cowboy-result{margin-top:5vh}.cowboy-actions{flex-direction:column}.cowboy-result-actions{flex-direction:column}.cowboy-hero h1{font-size:34px}}`}</style></main>;
}

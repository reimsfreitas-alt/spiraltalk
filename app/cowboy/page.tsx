"use client";

import { useEffect, useRef, useState } from "react";

type Thread={title:string;detail:string};
type Result={
  threads:Thread[];
  synthesis:string;
  nextStep:string;
  confidence:number;
  reply?:string;
  conversation_state?:string;
  safety_state?:string;
};
type FeedbackType="helpful"|"misfit"|"alternative";
type Turn={role:"user"|"assistant";content:string};
type Learning={helpful:number;misfit:number;alternative:number;turns:number};

type SpeechRecognitionLike={
  lang:string;continuous:boolean;interimResults:boolean;
  start:()=>void;stop:()=>void;
  onresult:((e:any)=>void)|null;onend:(()=>void)|null;onerror:((e:any)=>void)|null
};
type SpeechWindow=Window & {SpeechRecognition?:new()=>SpeechRecognitionLike;webkitSpeechRecognition?:new()=>SpeechRecognitionLike};

const examples=[
  "Estou com problema no trabalho e isso está virando briga em casa...",
  "Tenho dinheiro para resolver uma coisa, mas estou travado entre duas decisões...",
  "Minha cabeça está cheia e eu não sei qual problema resolver primeiro..."
];

const emptyLearning=():Learning=>({helpful:0,misfit:0,alternative:0,turns:0});

export default function Cowboy(){
  const [text,setText]=useState("");
  const [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [error,setError]=useState("");
  const [history,setHistory]=useState<Turn[]>([]);
  const [learning,setLearning]=useState<Learning>(emptyLearning);
  const [feedback,setFeedback]=useState<FeedbackType|null>(null);
  const [voiceUrl,setVoiceUrl]=useState("");
  const [voiceLoading,setVoiceLoading]=useState(false);
  const recognitionRef=useRef<SpeechRecognitionLike|null>(null);
  const micStreamRef=useRef<MediaStream|null>(null);
  const audioRef=useRef<HTMLAudioElement|null>(null);

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("spiral-talk-learning-v2");
      if(raw)setLearning({...emptyLearning(),...JSON.parse(raw)});
    }catch{}
    return()=>{
      recognitionRef.current?.stop();
      micStreamRef.current?.getTracks().forEach(track=>track.stop());
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      if(voiceUrl)URL.revokeObjectURL(voiceUrl);
    };
  },[voiceUrl]);
  },[]);

  function saveLearning(next:Learning){
    setLearning(next);
    try{localStorage.setItem("spiral-talk-learning-v2",JSON.stringify(next));}catch{}
  }

  async function prepareVoice(reply:string,nextStep:string){
    const textToSpeak=[reply,nextStep?"Próximo passo: "+nextStep:""].filter(Boolean).join(". ").trim();
    if(!textToSpeak)return;
    setVoiceLoading(true);
    try{
      const r=await fetch("/api/spiral/cowboy/voice",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({text:textToSpeak})
      });
      if(!r.ok)throw new Error("voice");
      const blob=await r.blob();
      const url=URL.createObjectURL(blob);
      setVoiceUrl(prev=>{
        if(prev)URL.revokeObjectURL(prev);
        return url;
      });
    }catch{
      setVoiceUrl("");
    }finally{
      setVoiceLoading(false);
    }
  }

  async function reorganize(feedbackType?:FeedbackType, valueOverride?:string, learningOverride?:Learning){
    const value=(valueOverride??text).trim();
    if(!value||loading)return;
    const activeLearning=learningOverride??learning;
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/spiral/cowboy",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          text:value,
          history,
          learning:activeLearning,
          feedback:feedbackType?{type:feedbackType}:undefined
        })
      });
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Falha");
      setResult(d);
      setFeedback(feedbackType||null);
      void prepareVoice(String(d.reply||d.synthesis||""),String(d.nextStep||""));
      if(!feedbackType){
        setHistory(prev=>[...prev,{role:"user",content:value},{role:"assistant",content:String(d.reply||d.synthesis||"")}].slice(-12));
        setText("");
        saveLearning({...activeLearning,turns:activeLearning.turns+1});
      }
    }catch{setError("Não foi possível reorganizar agora. Tente novamente.")}
    finally{setLoading(false)}
  }

  async function rate(type:FeedbackType){
    if(!result||loading)return;
    const lastUser=[...history].reverse().find(m=>m.role==="user")?.content?.trim();
    if(!lastUser)return;
    const next={...learning,[type]:learning[type]+1};
    saveLearning(next);
    await reorganize(type,lastUser,next);
  }

  function stopVoice(){
    recognitionRef.current?.stop();
    recognitionRef.current=null;
    micStreamRef.current?.getTracks().forEach(track=>track.stop());
    micStreamRef.current=null;
    setListening(false);
  }

  async function toggleVoice(){
    if(listening){stopVoice();return}
    setError("");
    const w=window as SpeechWindow;
    const Recognition=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!Recognition){setError("A voz não está disponível neste navegador. Use Safari ou Chrome atualizado.");return}
    if(!window.isSecureContext){setError("O microfone só funciona em uma conexão segura. Abra pelo endereço https://spiraltalk.vercel.app/cowboy.");return}
    if(!navigator.mediaDevices?.getUserMedia){setError("Este navegador não disponibiliza acesso ao microfone.");return}

    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      micStreamRef.current=stream;
      const r=new Recognition();
      r.lang="pt-BR";r.continuous=true;r.interimResults=true;
      r.onresult=(e:any)=>{
        let s="";
        for(let i=e.resultIndex||0;i<e.results.length;i++)s+=e.results[i][0]?.transcript||"";
        if(s.trim())setText(s.trim());
      };
      r.onend=()=>{
        recognitionRef.current=null;
        micStreamRef.current?.getTracks().forEach(track=>track.stop());
        micStreamRef.current=null;
        setListening(false);
      };
      r.onerror=(e:any)=>{
        const code=e?.error||"";
        if(code==="not-allowed"||code==="service-not-allowed")setError("O microfone foi bloqueado. Permita o microfone para spiraltalk.vercel.app e toque em Falar novamente.");
        else if(code==="audio-capture")setError("O navegador não conseguiu acessar o microfone. Verifique se outro aplicativo está usando o microfone.");
        else if(code==="network")setError("O reconhecimento de voz precisa de internet. Verifique sua conexão e tente novamente.");
        else setError("Não consegui ouvir. Verifique a permissão do microfone e tente novamente.");
        stopVoice();
      };
      recognitionRef.current=r;r.start();setListening(true);
    }catch(e:any){
      micStreamRef.current?.getTracks().forEach(track=>track.stop());
      micStreamRef.current=null;setListening(false);
      const code=e?.name||"";
      if(code==="NotAllowedError"||code==="SecurityError")setError("O acesso ao microfone foi bloqueado. Permita o microfone para spiraltalk.vercel.app nas configurações do navegador e tente novamente.");
      else if(code==="NotFoundError")setError("Nenhum microfone foi encontrado neste dispositivo.");
      else if(code==="NotReadableError")setError("O microfone está ocupado por outro aplicativo. Feche-o e tente novamente.");
      else setError("Não consegui abrir o microfone. Verifique as permissões do navegador e tente novamente.");
    }
  }

  function speakResult(){
    if(!result)return;
    if(audioRef.current){
      if(!audioRef.current.paused){
        audioRef.current.pause();
        audioRef.current.currentTime=0;
        setSpeaking(false);
        return;
      }
      if(voiceUrl){
        audioRef.current.src=voiceUrl;
        audioRef.current.onplay=()=>setSpeaking(true);
        audioRef.current.onended=()=>setSpeaking(false);
        audioRef.current.onerror=()=>setSpeaking(false);
        void audioRef.current.play().catch(()=>setSpeaking(false));
        return;
      }
    }

    // Fallback local speech when server TTS is still preparing or unavailable.
    const synth=window.speechSynthesis;
    if(!synth){
      setError("A voz ainda está sendo preparada. Tente novamente em alguns segundos.");
      return;
    }
    if(speaking){synth.cancel();setSpeaking(false);return;}
    const textToSpeak=[result.synthesis,result.nextStep?"Próximo passo: "+result.nextStep:""]
      .filter(Boolean).join(". ").replace(/[#*_]/g,"").replace(/\s+/g," ").trim();
    if(!textToSpeak){setError("Não há resposta para ouvir ainda.");return;}
    synth.cancel();
    const voice=synth.getVoices().find(v=>/^pt-BR$/i.test(v.lang))||synth.getVoices().find(v=>/^pt/i.test(v.lang));
    const u=new SpeechSynthesisUtterance(textToSpeak);
    u.lang="pt-BR";u.rate=.92;u.pitch=1;
    if(voice)u.voice=voice;
    u.onend=()=>setSpeaking(false);
    u.onerror=()=>{setSpeaking(false);setError("A voz não pôde ser reproduzida neste dispositivo.");};
    setSpeaking(true);
    synth.speak(u);
  }

  function newConversation(){
    setResult(null);setText("");setHistory([]);setFeedback(null);setError("");
  }

  return <main className="cowboy-shell">
    <div className="cowboy-stars" aria-hidden="true">{Array.from({length:55},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,top:`${(i*61)%92}%`,animationDelay:`${i%9}s`}}/>)}</div>
    <header className="cowboy-header"><div className="cowboy-brand"><span className="cowboy-orb"/>SPIRAL</div><span>COWBOY</span></header>

    <section className="cowboy-hero">
      <div className="cowboy-glow"/>
      <p>SPIRAL TALK</p>
      <h1>Fale do jeito que vier.<br/><em>Eu separo o que está misturado.</em></h1>
      <div className="cowboy-panel">
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Pode começar por onde quiser..." aria-label="Conte o que está acontecendo"/>
        <div className="cowboy-actions">
          <button onClick={()=>void toggleVoice()} className={listening?"cowboy-voice active":"cowboy-voice"}>{listening?"● Parar":"◉ Falar"}</button>
          <button onClick={()=>void reorganize()} disabled={!text.trim()||loading} className="cowboy-primary">{loading?"Pensando...":"Separar o que está misturado →"}</button>
        </div>
      </div>
      <div className="cowboy-examples">{examples.map(x=><button key={x} onClick={()=>setText(x)}>{x}</button>)}</div>
      {error&&<p className="cowboy-error">{error}</p>}
    </section>

    {result&&<section className="cowboy-result">
      <div className="cowboy-result-head">
        <span>O que apareceu no seu relato</span>
        <small>{Math.round(result.confidence*100)}% de confiança</small>
      </div>
      <div className="cowboy-threads">{result.threads.map((t,i)=><article key={i}><b>0{i+1}</b><div><h2>{t.title}</h2><p>{t.detail}</p></div></article>)}</div>
      <div className="cowboy-synthesis"><p>{result.synthesis}</p><strong>Próximo passo</strong><p>{result.nextStep}</p></div>

      <div className="cowboy-feedback">
        <span>Como essa intervenção funcionou para você?</span>
        <div>
          <button className={feedback==="helpful"?"selected":""} onClick={()=>void rate("helpful")}>✓ Ajudou</button>
          <button className={feedback==="misfit"?"selected":""} onClick={()=>void rate("misfit")}>↺ Não foi isso</button>
          <button className={feedback==="alternative"?"selected":""} onClick={()=>void rate("alternative")}>↗ Outra abordagem</button>
        </div>
      </div>

      <div className="cowboy-result-actions">
        <button onClick={speakResult}>{speaking?"■ Parar voz":voiceLoading?"◌ Preparando voz…":"◉ Ouvir o Spiral"}</button><audio ref={audioRef} preload="auto" />
        <button onClick={()=>{setResult(null);setText("")}}>Continuar falando</button>
        <button onClick={newConversation}>Nova conversa</button>
      </div>
    </section>}

    <footer>Sem terapia. Sem diagnóstico. Sem pressão para continuar. <span>Seu espaço para organizar o que está acontecendo.</span></footer>

    <style jsx>{`
      .cowboy-shell{min-height:100vh;background:#05070c;color:#eee;position:relative;overflow:hidden;font-family:Inter,system-ui,sans-serif}
      .cowboy-stars{position:fixed;inset:0;pointer-events:none;opacity:.8}
      .cowboy-stars i{position:absolute;width:2px;height:2px;border-radius:50%;background:#b9c0ce;opacity:.55;animation:twinkle 5s ease-in-out infinite}
      .cowboy-header{position:relative;z-index:1;display:flex;justify-content:space-between;padding:30px 7%;font-size:11px;letter-spacing:.22em;color:#777}
      .cowboy-brand{display:flex;gap:10px;align-items:center;color:#cdb77b}.cowboy-orb{width:9px;height:9px;border-radius:50%;box-shadow:0 0 18px #a99562;background:#d9c47c}
      .cowboy-hero,.cowboy-result{position:relative;z-index:1;width:min(760px,90%);margin:8vh auto 0}.cowboy-hero>p{font-size:11px;letter-spacing:.24em;color:#bca873}
      .cowboy-hero h1{font-size:clamp(32px,6vw,58px);line-height:1.12;font-weight:400;margin:18px 0 34px}.cowboy-hero h1 em{font-style:normal;color:#d3c8ae}
      .cowboy-panel{background:rgba(20,24,34,.76);border:1px solid #29303d;border-radius:24px;padding:18px;box-shadow:0 25px 80px rgba(0,0,0,.4)}
      .cowboy-panel textarea{width:100%;min-height:145px;background:transparent;border:0;outline:0;color:#eee;font:inherit;font-size:19px;line-height:1.55;resize:vertical}.cowboy-panel textarea::placeholder{color:#6d7380}
      .cowboy-actions{display:flex;gap:12px;margin-top:12px}.cowboy-actions button,.cowboy-result-actions button,.cowboy-feedback button{border:0;border-radius:14px;padding:15px 20px;font:inherit;cursor:pointer}
      .cowboy-voice{background:#171d29;color:#cbd0d9}.cowboy-voice.active{color:#e1c57b}.cowboy-primary{flex:1;background:#d8bd6d;color:#101116;font-weight:600}.cowboy-primary:disabled{opacity:.45;cursor:default}
      .cowboy-examples{display:grid;gap:9px;margin-top:22px}.cowboy-examples button{background:transparent;border:1px solid #171d29;color:#777f8d;border-radius:18px;padding:14px 18px;text-align:left;font:inherit;cursor:pointer}
      .cowboy-error{color:#e9a1a1}.cowboy-result{margin-top:34px;background:rgba(14,18,26,.82);border:1px solid #272d39;border-radius:24px;padding:24px}
      .cowboy-result-head{display:flex;justify-content:space-between;gap:15px;color:#c8c1ad}.cowboy-result-head small{color:#7d8491}
      .cowboy-threads article{display:flex;gap:18px;padding:22px 0;border-bottom:1px solid #222833}.cowboy-threads b{color:#bba66f;font-size:13px}.cowboy-threads h2{font-size:20px;font-weight:500;margin:0 0 7px}.cowboy-threads p,.cowboy-synthesis p{color:#aeb4bf;line-height:1.55}
      .cowboy-synthesis{padding:22px 0}.cowboy-synthesis strong{display:block;color:#d8bd6d;margin-top:20px}
      .cowboy-feedback{border-top:1px solid #252b36;padding-top:20px;margin-top:8px}.cowboy-feedback>span{display:block;color:#858d99;font-size:12px;margin-bottom:11px}.cowboy-feedback>div{display:flex;gap:8px;flex-wrap:wrap}.cowboy-feedback button{background:#171d29;color:#b7bec8;padding:11px 14px}.cowboy-feedback button.selected{background:#2a2f3a;color:#e0c57a;border:1px solid #6b5a32}
      .cowboy-result-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}.cowboy-result-actions button{background:#171d29;color:#ddd}.cowboy-result-actions button+button{background:transparent;color:#8e96a4}
      .cowboy-shell footer{position:relative;z-index:1;text-align:center;color:#555d69;font-size:11px;padding:60px 20px 30px}.cowboy-shell footer span{display:block;margin-top:5px}
      @keyframes twinkle{0%,100%{opacity:.25}50%{opacity:.8}}
      @media(max-width:600px){.cowboy-header{padding:24px}.cowboy-hero,.cowboy-result{margin-top:5vh}.cowboy-actions{flex-direction:column}.cowboy-result-actions{flex-direction:column}.cowboy-hero h1{font-size:34px}}
    `}</style>
  </main>;
}

"use client";

import { useEffect, useRef, useState } from "react";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/aFa00c0s3eMM2BxeqvbbG03";

type Message = { role: "user" | "assistant"; content: string };
type Recognition = { lang:string; interimResults:boolean; continuous:boolean; start:()=>void; stop:()=>void; onresult:((event:any)=>void)|null; onend:(()=>void)|null; onerror:(()=>void)|null };
declare global { interface Window { SpeechRecognition?: new()=>Recognition; webkitSpeechRecognition?: new()=>Recognition } }

export default function Page(){
  const [listening,setListening]=useState(false);
  const [processing,setProcessing]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  const [voiceAvailable,setVoiceAvailable]=useState(true);
  const recognitionRef=useRef<Recognition|null>(null);
  const transcriptRef=useRef("");
  const keepListeningRef=useRef(false);

  useEffect(()=>()=>{keepListeningRef.current=false; recognitionRef.current?.stop(); window.speechSynthesis?.cancel();},[]);

  async function sendTranscript(text:string){
    const clean=text.trim();
    if(!clean||processing)return;
    const prior=messages.slice(-8);
    setMessages(m=>[...m,{role:"user",content:clean}]);
    setProcessing(true);
    try{
      const r=await fetch("/api/spiral/public",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:clean,history:prior})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data?.error||"Falha");
      setMessages(m=>[...m,{role:"assistant",content:data.reply||"Pode continuar por onde isso estiver pedindo para ir."}]);
    }catch{
      setMessages(m=>[...m,{role:"assistant",content:"Pode deixar isso repousar um instante. Tente novamente quando quiser."}]);
    }finally{setProcessing(false);}
  }

  function startListening(){
    if(processing||listening)return;
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){setVoiceAvailable(false);return;}
    transcriptRef.current="";
    keepListeningRef.current=true;
    const recognition=new Recognition();
    recognition.lang="pt-BR"; recognition.interimResults=true; recognition.continuous=false;
    recognition.onresult=(event:any)=>{let t="";for(let i=0;event.results?.[i];i+=1)t+=event.results[i][0]?.transcript||"";transcriptRef.current=t;};
    recognition.onend=()=>{setListening(false);const t=transcriptRef.current.trim();transcriptRef.current="";if(keepListeningRef.current&&t)void sendTranscript(t);};
    recognition.onerror=()=>{setListening(false);};
    recognitionRef.current=recognition;
    try{recognition.start();setListening(true);}catch{setListening(false);}
  }
  function stopListening(){keepListeningRef.current=true;recognitionRef.current?.stop();}
  function onPointerDown(){startListening();}
  function onPointerUp(){if(listening)stopListening();}

  const latest=[...messages].reverse().find(m=>m.role==="assistant");
  const showOffer=Boolean(latest);

  return <main className={`room-shell first-room ${listening?"is-listening":""} ${processing?"is-processing":""}`}>
    <div className="room-grain" aria-hidden="true"/>
    <section className="room-stage first-room-stage">
      <div className="room-presence" aria-live="polite"><span className="room-presence-dot"/><span>{processing?"Estou com você.":listening?"Estou ouvindo.":"Pode falar. Estou aqui."}</span></div>
      <button className="room-orb live-orb" type="button" aria-label="Pressione e segure para falar" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <span className="room-orb-ring ring-one"/><span className="room-orb-ring ring-two"/><span className="room-orb-core"/>
        <span className="voice-wave wave-one"/><span className="voice-wave wave-two"/><span className="voice-wave wave-three"/>
      </button>
      <p className="room-hint">{voiceAvailable?"toque e segure o círculo para falar":"a voz não está disponível neste navegador"}</p>
      <div className="room-response" aria-live="polite">{latest&&<p className="room-answer">{latest.content}</p>}</div>
      <div className={`room-offer ${showOffer?"visible":""}`}>
        <p>Você já sentiu como é ficar aqui por alguns minutos.</p>
        <a href={paymentLink}>Continuar por R$ 29,90/mês</a>
      </div>
    </section>
  </main>;
}

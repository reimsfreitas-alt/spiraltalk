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
  const recognitionRef=useRef<SpeechRecognitionLike|null>(null);
  const micStreamRef=useRef<MediaStream|null>(null);

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("spiral-talk-learning-v2");
      if(raw)setLearning({...emptyLearning(),...JSON.parse(raw)});
    }catch{}
    return()=>{
      recognitionRef.current?.stop();
      micStreamRef.current?.getTracks().forEach(track=>track.stop());
      window.speechSynthesis?.cancel();
    };
  },[]);

  function saveLearning(next:Learning){
    setLearning(next);
    try{localStorage.setItem("spiral-talk-learning-v2",JSON.stringify(next));}catch{}
  }

  async function reorganize(feedbackType?:FeedbackType){
    const value=text.trim();
    if(!value||loading)return;
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/spiral/cowboy",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          text:value,
          history,
          learning,
          feedback:feedbackType?{type:feedbackType}:undefined
        })
      });
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Falha");
      setResult(d);
      setFeedback(feedbackType||null);
      if(!feedbackType){
        setHistory(prev=>[...prev,{role:"user",content:value},{role:"assistant",content:String(d.reply||d.synthesis||"")}].slice(-12));
        setText("");
        saveLearning({...learning,turns:learning.turns+1});
      }
    }catch{setError("Não foi possível reorganizar agora. Tente novamente.")}
    finally{setLoading(false)}
  }

  async function rate(type:FeedbackType){
    if(!result||loading)return;
    const next={...learning,[type]:learning[type]+1};
    saveLearning(next);
    await reorganize(type);
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
      r.onend=()=>{if(listening)stopVoice()};
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
    const synth=window.speechSynthesis;
    if(!synth){
      setError("A voz não está disponível neste navegador. Abra o Spiral Talk no Safari ou Chrome atualizado.");
      return;
    }
    if(speaking){
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const raw=[result.synthesis,result.nextStep?\`Próximo passo: ${result.nextStep}\`:\"\"].filter(Boolean).join(". ");
    const textToSpeak=raw.replace(/[#*_]/g,"").replace(/\\s+/g," ").trim();
    if(!textToSpeak){
      setError("Não há resposta para ouvir ainda.");
      return;
    }

    setError("");
    synth.cancel();

    // iOS/Safari can expose voices asynchronously. Prefer a Portuguese voice
    // when one is available, but never require one to start speaking.
    const voices=synth.getVoices();
    const voice=
      voices.find(v=>/^pt-BR$/i.test(v.lang)) ||
      voices.find(v=>/^pt[-_]BR/i.test(v.lang)) ||
      voices.find(v=>/^pt/i.test(v.lang));

    const chunks=textToSpeak.match(/.{1,180}(?:\\s+|$)/g)||[textToSpeak];
    let index=0;
    setSpeaking(true);

    const speakNext=()=>{
      if(index>=chunks.length){
        setSpeaking(false);
        return;
      }
      const u=new SpeechSynthesisUtterance(chunks[index++].trim());
      u.lang="pt-BR";
      u.rate=.92;
      u.pitch=1;
      if(voice)u.voice=voice;
      u.onend=speakNext;
      u.onerror=()=>{
        synth.cancel();
        setSpeaking(false);
        setError("A resposta apareceu, mas o navegador bloqueou a reprodução da voz. Toque em “Ouvir o Spiral” novamente.");
      };
      synth.speak(u);
    };

    // Calling this from the button's click handler preserves the user gesture
    // required by mobile browsers for audible playback.
    speakNext();
  }


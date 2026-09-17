import { NextResponse } from "next/server";
import { runCanonicalEngine, type SpiralFeedback, type SpiralLearning } from "@/lib/spiral/engine";

type HistoryMessage={role:"user"|"assistant";content:string};

function safeHistory(value:unknown):HistoryMessage[]{
  if(!Array.isArray(value))return [];
  return value
    .filter((m:any)=>m&&((m.role==="user")||(m.role==="assistant"))&&typeof m.content==="string")
    .slice(-12)
    .map((m:any)=>({role:m.role,content:m.content.slice(0,12000)}));
}

function safeLearning(value:unknown):SpiralLearning{
  const x=(value&&typeof value==="object"?value:{}) as any;
  const n=(v:any)=>Number.isFinite(Number(v))?Math.max(0,Math.min(999,Number(v))):0;
  return{helpful:n(x.helpful),misfit:n(x.misfit),alternative:n(x.alternative),turns:n(x.turns)};
}

function threadsFromEngine(reply:string,structure:any){
  const candidates:string[]=[
    ...(Array.isArray(structure?.declared_factors)?structure.declared_factors:[]),
    ...(Array.isArray(structure?.constraints)?structure.constraints:[]),
    ...(Array.isArray(structure?.alternatives)?structure.alternatives:[])
  ].filter((x:any)=>typeof x==="string"&&x.trim());

  const unique=Array.from(new Set(candidates.map(x=>x.trim()))).slice(0,4);
  if(unique.length) return unique.map((x,i)=>({
    title:["O que aparece","O que pesa","O que limita","Caminhos possíveis"][i]||`Fio ${i+1}`,
    detail:x
  }));

  return [{
    title:"O fio principal",
    detail:reply.slice(0,420)
  }];
}

function fallbackResult(text:string){
  return {
    threads:[{title:"O que apareceu",detail:text.slice(0,300)||"Ainda não há relato suficiente."}],
    synthesis:"Ainda não foi possível processar este relato.",
    nextStep:"Tente novamente em alguns segundos.",
    confidence:.2,
    reply:"Ainda não consegui processar este relato."
  };
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const text=typeof body?.text==="string"?body.text.trim():"";
    if(!text)return NextResponse.json({error:"Informe o que está acontecendo."},{status:400});
    if(text.length>12000)return NextResponse.json({error:"Relato muito longo."},{status:413});

    const history=safeHistory(body?.history);
    const feedback=body?.feedback&&["helpful","misfit","alternative"].includes(body.feedback.type)
      ? body.feedback as SpiralFeedback
      : undefined;
    const learning=safeLearning(body?.learning);

    const engine=await runCanonicalEngine(history,text,feedback,learning);
    const threads=threadsFromEngine(engine.reply,engine.structure);
    const nextStep=engine.structure?.alternatives?.[0]
      || engine.structure?.open_questions?.[0]
      || (engine.conversation_state==="closing"?"Tudo bem deixar isso por aqui.":"Continue pelo ponto que estiver mais vivo agora.");

    return NextResponse.json({
      threads,
      synthesis:engine.reply,
      nextStep,
      confidence:Math.max(.05,Math.min(.99,Number(engine.structure?.confidence)||.65)),
      reply:engine.reply,
      conversation_state:engine.conversation_state,
      safety_state:engine.safety_state
    });
  }catch(error){
    return NextResponse.json(fallbackResult(""),{status:200});
  }
}

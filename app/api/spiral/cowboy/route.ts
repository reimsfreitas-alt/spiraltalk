import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req:Request){
  try{
    const body=await req.json();
    const text=typeof body?.text==="string"?body.text.trim():"";
    if(!text)return NextResponse.json({error:"Informe o que está acontecendo."},{status:400});
    if(text.length>12000)return NextResponse.json({error:"Relato muito longo."},{status:413});
    const key=process.env.GEMINI_API_KEY;
    if(!key)return NextResponse.json(fallback(text));
    const ai=new GoogleGenAI({apiKey:key});
    const r=await ai.models.generateContent({
      model:"gemini-2.5-flash",
      config:{systemInstruction:"Você é o motor de reorganização do Spiral Talk. Não faça terapia, diagnóstico ou afirmações clínicas. Não elogie nem use empatia vazia. Leia o relato inteiro e separe os assuntos que realmente aparecem misturados. Preserve palavras e fatos do usuário; não invente causas. Se houver apenas um assunto dominante, organize seus componentes sem fabricar fios. Produza 2 a 4 fios somente quando houver evidência. synthesis deve dizer claramente o que está misturado. nextStep deve ser pequeno e concreto. Responda sempre em português do Brasil. Retorne JSON válido com threads, synthesis, nextStep e confidence.",responseMimeType:"application/json",temperature:0.2,maxOutputTokens:700},
      contents:[{role:"user",parts:[{text}]}]
    });
    const parsed=JSON.parse(r.text||"{}");
    return NextResponse.json(parsed);
  }catch{return NextResponse.json(fallback(""),{status:200})}
}

function fallback(text:string){
  const t=text.toLowerCase();
  if(/sono|dormir|dormindo|noite|irritad|cansa/.test(t))return {threads:[{title:"Sono e horário",detail:"Você está tentando entender se o horário em que está dormindo está contribuindo para o problema."},{title:"Efeito no dia seguinte",detail:"Você percebe irritação no dia seguinte, então existe um impacto concreto além da dificuldade para dormir."}],synthesis:"O que está misturado é a causa que você está tentando identificar e o efeito que já percebe no dia seguinte.",nextStep:"Por alguns dias, registre apenas o horário em que dormiu e como acordou; isso ajuda a separar percepção de padrão.",confidence:.78};
  return {threads:[{title:"O que aconteceu",detail:text.slice(0,240)||"Ainda não há relato suficiente para separar os fios."},{title:"O que isso está produzindo",detail:"Há um efeito ou consequência no relato que merece ser separado do fato inicial."}],synthesis:"O relato mistura o acontecimento com a consequência que ele está produzindo.",nextStep:"Escolha qual dos dois está pesando mais agora e trate primeiro esse ponto.",confidence:.45};
}

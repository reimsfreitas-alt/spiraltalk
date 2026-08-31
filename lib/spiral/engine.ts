import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt";
import type { SpiralEngineOutput, SpiralStructure } from "./types";

function fallback(input:string): SpiralStructure {
  return {central_question:input.slice(0,120),declared_factors:[],constraints:[],alternatives:[],decision_state:"none",declared_decision:null,open_questions:[],declared_changes:[],memory_candidates:[],confidence:0.1};
}

export async function runCanonicalEngine(history:{role:"user"|"assistant";content:string}[],input:string):Promise<SpiralEngineOutput>{
  if(!process.env.GEMINI_API_KEY) return {reply:"Entendi. Vamos organizar o que você trouxe. Qual é o ponto principal que você quer colocar em foco agora?",structure:fallback(input),safety_state:"normal"};
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
  const contents=[...history.slice(-12),{role:"user" as const,content:input}].map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
  try{
    const r=await ai.models.generateContent({model:"gemini-2.5-flash",config:{systemInstruction:SYSTEM_PROMPT,responseMimeType:"application/json"},contents});
    const parsed=JSON.parse(r.text||"{}");
    if(!parsed || typeof parsed.reply!=="string" || !parsed.structure || typeof parsed.structure!=="object") throw new Error("Invalid Gemini response");
    if(parsed?.structure?.decision_state!=="decision") parsed.structure.declared_decision=null;
    return parsed;
  }catch{
    return {reply:"Não consegui processar esta mensagem agora. Tente novamente.",structure:fallback(input),safety_state:"normal"};
  }
}

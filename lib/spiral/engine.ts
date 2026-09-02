import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt";
import { choosePacing, type PacingDecision } from "./pacing";
import { extractSignals } from "./signals";
import { buildEpistemicMemory } from "./memory";
import { decidePolicy } from "./policy";
import { qualityGate } from "./quality";
import type { SpiralEngineOutput, SpiralStructure } from "./types";

type HistoryMessage={role:"user"|"assistant";content:string};
const MAX_HISTORY=10;

function emptyStructure(input:string):SpiralStructure{return{central_question:input.slice(0,180),declared_factors:[],constraints:[],alternatives:[],decision_state:"none",declared_decision:null,open_questions:[],declared_changes:[],memory_candidates:[],confidence:.05};}
function fallback(input:string,pacing:PacingDecision,policy:string):SpiralEngineOutput{
 const text=input.trim();let reply="";
 if(!text)reply="Pode começar pelo ponto que estiver mais vivo agora.";
 else if(pacing.act==="CLOSE")reply="Tudo bem deixar isso por aqui.";
 else if(pacing.act==="CONTRADICT")reply="Então eu fui para um lugar que não era esse.";
 else if(policy==="answer") {
  if(/\b(dormindo|sono|noites mal dormidas|calor|stress|estresse)\b/i.test(text))
    reply="Se o problema é uma combinação de calor e estresse, eu começaria separando os dois fatores em vez de tentar resolver tudo de uma vez: tornar o quarto mais fresco e observar se isso muda a noite, enquanto você reduz o que mantém a cabeça acelerada perto de dormir. Se isso persistir, vale investigar o padrão com um profissional de saúde, porque noites mal dormidas podem ter várias causas.";
  else reply="Você fez uma pergunta concreta. Vou responder ao que você perguntou, sem transformar a resposta em outra bateria de perguntas.";
}
 else if(policy==="organize")reply="Tem elementos diferentes nessa fala que merecem ficar lado a lado, sem precisar resolver tudo de uma vez.";
 else if(policy==="pivot")reply="Vamos acompanhar essa nova direção.";
 else if(/\b(dormindo|sono|noites mal dormidas|calor|stress|estresse)\b/i.test(text))
  reply="Você está percebendo duas hipóteses bem concretas — calor e estresse — e as duas podem estar misturadas. Antes de procurar uma explicação maior, vale observar qual delas aparece com mais força nas noites em que o sono piora.";
 else if(/\b(trabalho|dinheiro|família|familia|relacionamento|amor|casa|decisão|decisao|carreira)\b/i.test(text))
  reply="Tem um ponto concreto no que você trouxe, e eu não vou empurrá-lo de volta para você com uma pergunta automática. Pode continuar; eu vou acompanhar o fio do que você está dizendo.";
 else reply="Estou acompanhando o que você trouxe.";
 return{reply,structure:emptyStructure(text),safety_state:"normal",conversation_state:pacing.state};
}
function safetyRisk(input:string):boolean{return /\b(vou me matar|quero me matar|vou tirar minha vida|me matar hoje|suicid|me ferir|me machucar|não quero mais viver|nao quero mais viver)\b/i.test(input);}
function promptFor(pacing:PacingDecision,policy:{primary:string;allowQuestion:boolean;questionBudget:number;rationale:string},signals:string,memories:string,history:HistoryMessage[],revision:string):string{
 const state=({holding:"Dê espaço; uma observação curta pode ser melhor que uma pergunta.",mirroring:"Responda ao conteúdo concreto antes de aprofundar.",deepening:"Aprofunde somente um fio já presente.",juxtaposing:"Coloque elementos declarados lado a lado sem diagnosticar.",pivoting:"Acompanhe a nova direção.",closing:"Encerre sem reabrir o tema."} as Record<string,string>)[pacing.state];
 return SYSTEM_PROMPT+"\n\nPLANO DO MOTOR (OBEDEÇA):\nintervenção="+policy.primary+"\nestado="+pacing.state+"\nperguntas_permitidas="+policy.allowQuestion+"\nquestion_budget="+policy.questionBudget+"\nracional="+policy.rationale+"\nsinais="+signals+"\nmemória_epistêmica="+memories+"\n"+state+"\n"+revision+"\nREGRAS DE EXECUÇÃO: responda ao turno atual; não use abertura genérica; não repita a função da última intervenção; se houver pergunta concreta, responda primeiro; pedido de conselho não autoriza prescrição; correção invalida hipótese anterior; não invente fatos, memória ou causalidade; 1-3 frases salvo necessidade clara; JSON válido.";
}
export async function runCanonicalEngine(history:HistoryMessage[],input:string):Promise<SpiralEngineOutput>{
 const pacing=choosePacing({history,input});
 const signals=extractSignals(input,pacing.act);
 const policy=decidePolicy(signals,pacing.state,history);
 const memories=buildEpistemicMemory(input,"turn-current");
 if(safetyRisk(input))return{reply:"Isso parece envolver um risco imediato para você. Procure ajuda humana agora; no Brasil, você pode ligar para o SAMU (192) ou para o CVV (188).",structure:emptyStructure(input),safety_state:"risk_detected",conversation_state:"holding"};
 if(!process.env.GEMINI_API_KEY)return fallback(input,pacing,policy.primary);
 const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
 const contents=[...history.slice(-MAX_HISTORY),{role:"user" as const,content:input}].map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
 for(let attempt=0;attempt<2;attempt++){
  try{
   const revision=attempt?"A tentativa anterior falhou no Quality Gate. Corrija especificamente os defeitos indicados e preserve a estratégia conversacional.": "";
   const r=await ai.models.generateContent({model:"gemini-2.5-flash",config:{systemInstruction:promptFor(pacing,policy,JSON.stringify(signals),JSON.stringify(memories),history,revision),responseMimeType:"application/json"},contents});
   const parsed=JSON.parse(r.text||"{}");const reply=String(parsed?.reply||"").trim();
   const gate=qualityGate(reply,history,policy.allowQuestion,pacing.act==="CONTRADICT");
   if(gate.ok){
    const structure=parsed.structure&&typeof parsed.structure==="object"?parsed.structure:emptyStructure(input);
    if(structure.decision_state!=="decision")structure.declared_decision=null;
    return{reply,structure,safety_state:parsed.safety_state==="risk_detected"?"risk_detected":"normal",conversation_state:["holding","mirroring","deepening","juxtaposing","pivoting","closing"].includes(parsed.conversation_state)?parsed.conversation_state:pacing.state};
   }
  }catch{}
 }
 return fallback(input,pacing,policy.primary);
}

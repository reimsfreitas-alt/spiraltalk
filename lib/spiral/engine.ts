import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt";
import { choosePacing, type PacingDecision } from "./pacing";
import { extractSignals } from "./signals";
import { buildEpistemicMemory, buildTopicGraph } from "./memory";
import { decidePolicy } from "./policy";
import { planIntervention } from "./planner";
import { qualityGate } from "./quality";
import type { SpiralEngineOutput, SpiralStructure, ConversationState } from "./types";

type HistoryMessage={role:"user"|"assistant";content:string};
const MAX_HISTORY=12;

function emptyStructure(input:string):SpiralStructure{
  return{
    central_question:input.slice(0,220),
    declared_factors:[],
    constraints:[],
    alternatives:[],
    decision_state:"none",
    declared_decision:null,
    open_questions:[],
    declared_changes:[],
    memory_candidates:[],
    confidence:.05
  };
}

function fallback(input:string,pacing:PacingDecision,policy:string):SpiralEngineOutput{
  const text=input.trim();
  let reply="";
  if(!text)reply="Pode começar pelo ponto que estiver mais vivo agora.";
  else if(pacing.act==="CLOSE")reply="Tudo bem deixar isso por aqui.";
  else if(pacing.act==="CONTRADICT")reply="A leitura anterior não captou o que você quis dizer. Vou mudar o caminho.";
  else if(policy==="answer"){
    if(/\b(vendas|vender|comércio|comercio|cliente|clientes|marketing)\b/i.test(text))
      reply="Eu começaria por escolher uma dor muito específica que o seu produto resolve e vender uma experiência de teste para poucas pessoas. A resposta dessas pessoas vira evidência para corrigir produto e mensagem antes de aumentar o alcance.";
    else if(/\b(dormindo|sono|noites mal dormidas|calor|stress|estresse)\b/i.test(text))
      reply="Eu trataria primeiro o estresse como hipótese principal, sem ignorar o calor: reduza estímulos e trabalho perto de dormir, deixe o ambiente o mais fresco possível e observe por alguns dias se isso muda. Se o padrão persistir ou ficar intenso, vale procurar avaliação profissional para investigar outras causas.";
    else
      reply="Eu responderia ao problema concreto em vez de devolvê-lo para você: escolha a parte que mais pesa agora, defina uma ação pequena que você consiga executar hoje e use o resultado para decidir o próximo movimento.";
  } else if(policy==="organize")
    reply="Há mais de um elemento nessa fala, e eles não precisam ser tratados como se fossem a mesma coisa. Eu separaria o que está acontecendo, o que você sabe com segurança e o que ainda é hipótese antes de decidir o próximo movimento.";
  else if(policy==="pivot")
    reply="Vamos acompanhar essa nova direção, sem forçar a conversa a voltar ao assunto anterior.";
  else if(/\b(dormindo|sono|noites mal dormidas|calor|stress|estresse)\b/i.test(text))
    reply="Você está colocando calor e estresse como duas explicações possíveis para as noites ruins. O estresse parece estar ganhando força na sua própria leitura, então eu observaria esse fator primeiro.";
  else
    reply="Há algo concreto no que você trouxe. Vou acompanhar o fio sem transformar cada fala em uma pergunta automática.";
  return{reply,structure:emptyStructure(text),safety_state:"normal",conversation_state:pacing.state};
}

function safetyRisk(input:string):boolean{
  return /\b(vou me matar|quero me matar|vou tirar minha vida|me matar hoje|suicid|me ferir|me machucar|não quero mais viver|nao quero mais viver)\b/i.test(input);
}

function promptFor(
  pacing:PacingDecision,
  policy:{primary:string;allowQuestion:boolean;questionBudget:number;answerFirst:boolean;rationale:string},
  plan:{primary:string;rationale:string;userModel:unknown},
  signals:string,
  memories:string,
  topicGraph:string,
  revision:string
):string{
  const state=({
    holding:"Dê espaço; uma observação curta ou uma organização parcial pode ser melhor que uma pergunta.",
    mirroring:"Responda ao conteúdo concreto antes de aprofundar.",
    deepening:"Aprofunde somente um fio que já esteja presente.",
    juxtaposing:"Coloque elementos declarados lado a lado sem diagnosticar.",
    pivoting:"Acompanhe a nova direção sem puxar a pessoa de volta.",
    closing:"Encerre sem reabrir o tema."
  } as Record<string,string>)[pacing.state];

  return SYSTEM_PROMPT+
    "\n\nPLANO DO MOTOR (OBEDEÇA):"+
    "\nintervenção_policy="+policy.primary+
    "\nestado="+pacing.state+
    "\nintervenção_planner="+plan.primary+
    "\nperguntas_permitidas="+policy.allowQuestion+
    "\nquestion_budget="+policy.questionBudget+
    "\nanswer_first="+policy.answerFirst+
    "\nracional_policy="+policy.rationale+
    "\nracional_planner="+plan.rationale+
    "\nsinais="+signals+
    "\nmemória_epistêmica="+memories+
    "\ntopic_graph="+topicGraph+
    "\n"+state+
    "\n"+revision+
    "\nREGRAS DE EXECUÇÃO: responda ao turno atual; pedido de resposta ou solução exige resposta concreta antes de qualquer pergunta; não use abertura genérica; não repita a função da última intervenção; correção invalida hipótese anterior; não invente fatos, memória ou causalidade; se houver dúvida, declare a incerteza em vez de inventar; JSON válido.";
}

export async function runCanonicalEngine(history:HistoryMessage[],input:string):Promise<SpiralEngineOutput>{
  const cleanHistory=history.slice(-MAX_HISTORY);
  const pacing=choosePacing({history:cleanHistory,input});
  const signals=extractSignals(input,pacing.act);
  const memory=buildEpistemicMemory(cleanHistory,input,"turn-current");
  const topicGraph=buildTopicGraph(cleanHistory,input);
  const plan=planIntervention(signals,pacing.state,cleanHistory,null);
  const policy=decidePolicy(signals,pacing.state,cleanHistory,plan.userModel);

  if(safetyRisk(input))
    return{
      reply:"Isso parece envolver um risco imediato para você. Procure ajuda humana agora; no Brasil, você pode ligar para o SAMU (192) ou para o CVV (188).",
      structure:emptyStructure(input),
      safety_state:"risk_detected",
      conversation_state:"holding"
    };

  if(!process.env.GEMINI_API_KEY)return fallback(input,pacing,policy.primary);

  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
  const contents=[...cleanHistory,{role:"user" as const,content:input}]
    .map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));

  for(let attempt=0;attempt<2;attempt++){
    try{
      const revision=attempt
        ? "A tentativa anterior falhou no Quality Gate. Corrija especificamente os defeitos indicados. Preserve a estratégia e, se houver pedido de solução, entregue solução."
        : "";

      const r=await ai.models.generateContent({
        model:"gemini-2.5-flash",
        config:{
          systemInstruction:promptFor(pacing,policy,plan,JSON.stringify(signals),JSON.stringify(memory),JSON.stringify(topicGraph),revision),
          responseMimeType:"application/json"
        },
        contents
      });

      const parsed=JSON.parse(r.text||"{}");
      const reply=String(parsed?.reply||"").trim();
      const gate=qualityGate(reply,cleanHistory,policy.allowQuestion,pacing.act==="CONTRADICT",policy.answerFirst);

      if(gate.ok){
        const structure=parsed.structure&&typeof parsed.structure==="object"?parsed.structure:emptyStructure(input);
        if(structure.decision_state!=="decision")structure.declared_decision=null;
        const validStates=["holding","mirroring","deepening","juxtaposing","pivoting","closing"];
        const conversationState:ConversationState=validStates.includes(parsed.conversation_state)?parsed.conversation_state:pacing.state;

        return{
          reply,
          structure,
          safety_state:parsed.safety_state==="risk_detected"?"risk_detected":"normal",
          conversation_state:conversationState
        };
      }
    }catch{}
  }

  return fallback(input,pacing,policy.primary);
}

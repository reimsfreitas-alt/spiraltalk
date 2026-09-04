import { SYSTEM_PROMPT } from "./prompt";
import type { ConversationState } from "./types";
import type { PolicyAction } from "./policy";
import type { QualityFailure } from "./quality";
import type { TalkState } from "./state";
type Msg={role:"user"|"assistant";content:string};
export function buildPrompt(args:{state:TalkState;action:PolicyAction;allowQuestion:boolean;questionBudget:number;answerFirst:boolean;rationale:string;hypotheses:string;topicGraph:string;revision:string}):string{
 const s=args.state;
 return [SYSTEM_PROMPT,"ESTADO",`turno=${s.turn}`,`estado_anterior=${s.previousState??"nenhum"}`,`estado_atual=${s.currentState}`,`intervencao_anterior=${s.lastIntervention??"nenhuma"}`,`resultado=${s.lastInterventionResult}`,`intencao=${s.intent}`,`necessidade=${s.need}`,`sinais=${s.affect.statement}`,`temas=${s.topics.join(", ")}`,`hipoteses=${args.hypotheses}`,`acao=${args.action}`,`perguntas_permitidas=${args.allowQuestion}`,`question_budget=${args.questionBudget}`,`answer_first=${args.answerFirst}`,`racional=${args.rationale}`,args.revision,"REGRAS: responda ao turno atual; pedido de resposta exige proposta concreta; não repita a função anterior; não invente; não diagnostique; JSON válido.","Formato: {reply,structure,safety_state,conversation_state}"].join("\n");
}
export function revisionFor(failures:QualityFailure[]):string{return failures.length?"REPLANEJAMENTO: corrija os seguintes problemas: "+failures.join(", "):";" : "";}
export function fallbackReply(args:{input:string;history:Msg[];action:PolicyAction;answerFirst:boolean;state:ConversationState;need:TalkState["need"];ambivalent:boolean}):string{
 const text=args.input.trim();
 if(args.answerFirst||args.action==="answer") return "Eu começaria pelo ponto mais concreto que você consegue mudar agora. Escolha uma única ação pequena, execute-a e use o resultado para decidir o próximo passo, em vez de tentar resolver tudo de uma vez.";
 if(args.action==="close") return "Tudo bem deixar por aqui. O que ficou aberto pode continuar disponível quando você quiser voltar.";
 if(args.action==="pivot") return "Vamos acompanhar essa nova direção, sem forçar a conversa a voltar ao assunto anterior.";
 if(args.action==="organize") return args.ambivalent?"Há movimentos diferentes no que você trouxe. Eu separaria o que já aconteceu, o que ainda é escolha e o que é apenas receio.":"Há mais de um elemento nessa fala. Eu separaria fatos, escolhas em aberto e hipóteses antes de decidir.";
 if(args.action==="ask") return "O que exatamente você já tentou até aqui?";
 if(args.action==="confront_gently") return "Há duas coisas diferentes misturadas aí. Vale separar uma da outra antes de concluir.";
 if(args.need==="escuta") return "Estou seguindo o fio do que você trouxe, sem transformar isso automaticamente em tarefa.";
 return text?"O que você trouxe tem um fio concreto. Vou seguir esse fio em vez de devolver a questão para você." : "Pode começar pelo ponto que estiver mais vivo agora.";
}
export const SAFETY_REPLY="Isso parece envolver um risco imediato para você. Procure ajuda humana agora; no Brasil, você pode ligar para o SAMU (192) ou para o CVV (188), que atende 24 horas por dia.";

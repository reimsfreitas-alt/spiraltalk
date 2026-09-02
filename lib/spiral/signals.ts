import type { ConversationalAct } from "./pacing";

export type SignalIntent = "be_heard"|"organize"|"answer"|"decide";
export type HumanSignal = { act:"question"|"correction"|"closing"|"revelation"|"continuation"; topic:string[]; ambiguity:number; contradiction:{hasMarker:boolean}; intent:SignalIntent; density:number };

const topicWords = /\b(trabalho|dinheiro|familia|família|relacionamento|amor|casamento|filho|filha|saude|saúde|sono|rotina|ansiedade|medo|decisao|decisão|estudo|carreira|empresa|casa|mudanca|mudança|futuro|passado)\b/gi;

export function extractSignals(input:string, act:ConversationalAct):HumanSignal {
  const text=input.trim(), words=text?text.split(/\s+/).filter(Boolean):[];
  const question=/\?/.test(text)||/^(como|por que|porque|qual|quando|onde|será que)\b/i.test(text);
  const correction=act==="CONTRADICT", closing=act==="CLOSE";
  const revelation=/\b(percebi|descobri|lembrei|nunca contei|agora entendi|me dei conta)\b/i.test(text);
  const contradiction=/\b(mas|porém|só que|ao mesmo tempo|por outro lado|entretanto)\b/i.test(text);
  const directAction=/\b(o que faço|o que devo fazer|como resolvo|qual caminho|me ajuda a decidir|devo fazer|o que você faria)\b/i.test(text);
  const intent:SignalIntent=directAction?"decide":question?"answer":words.length>=35?"be_heard":contradiction?"organize":"be_heard";
  const topics=Array.from(new Set((text.match(topicWords)||[]).map(x=>x.toLowerCase())));
  const ambiguity=Math.min(1,Math.max(0,(text.match(/\b(acho|talvez|não sei|nao sei|parece|pode ser|será)\b/gi)||[]).length/Math.max(1,words.length/10)));
  return {act:closing?"closing":correction?"correction":question?"question":revelation?"revelation":"continuation",topic:topics,ambiguity,contradiction:{hasMarker:contradiction},intent,density:Math.min(1,words.length/120)};
}

export type MemoryKind="FACT"|"PERCEPTION"|"FEELING"|"GOAL"|"HYPOTHESIS";
export type MemoryItem={id:string;kind:MemoryKind;text:string;sourceTurnId:string;status:"active"|"superseded"|"hypothesis";confidence:number;recency:number;evidence:string};

export function buildEpistemicMemory(input:string,turnId:string):MemoryItem[]{
  const text=input.trim(),items:MemoryItem[]=[];
  const add=(kind:MemoryKind,value:string,confidence:number,status:MemoryItem["status"]="active")=>{if(value.trim())items.push({id:turnId+":"+items.length,kind,text:value.trim(),sourceTurnId:turnId,status,confidence,recency:1,evidence:"declaração explícita do usuário"});};
  text.split(/[.!?]+/).map(s=>s.trim()).filter(Boolean).filter(s=>/\b(eu|meu|minha|tenho|sou|trabalho|moro|fiz|vou|estou)\b/i.test(s)).slice(0,4).forEach(s=>add("FACT",s,.95));
  if(/\b(sinto|me sinto|estou me sentindo|tenho medo|estou ansioso|estou angustiado|feliz|triste|irritado|cansado)\b/i.test(text))add("FEELING",text,.82);
  if(/\b(quero|preciso|pretendo|gostaria|meu objetivo)\b/i.test(text))add("GOAL",text,.88);
  if(/\b(acho que|talvez|pode ser|deve ser|será que)\b/i.test(text))add("HYPOTHESIS",text,.65,"hypothesis");
  return items;
}
export function supersedeConflicting(memory:MemoryItem[],correction:string):MemoryItem[]{if(!correction.trim())return memory;const tokens=new Set(correction.toLowerCase().split(/\W+/).filter(Boolean));return memory.map(m=>tokens.size>0&&m.text.toLowerCase().split(/\W+/).filter(Boolean).filter(t=>tokens.has(t)).length>=3?{...m,status:"superseded"}:m);}

export type MemoryKind="FACT"|"PERCEPTION"|"FEELING"|"GOAL"|"HYPOTHESIS";
export type MemoryStatus="active"|"superseded"|"hypothesis";

export type MemoryItem={
  id:string;
  kind:MemoryKind;
  text:string;
  sourceTurnId:string;
  status:MemoryStatus;
  confidence:number;
  recency:number;
  evidence:string;
};

export type TopicNode={topic:string;confidence:number;recency:number;evidenceCount:number};
export type TopicEdge={from:string;to:string;weight:number;evidenceCount:number};
export type TopicGraph={nodes:TopicNode[];edges:TopicEdge[]};

const TOPICS=/\b(trabalho|dinheiro|família|familia|relacionamento|amor|casamento|filho|filha|saúde|saude|sono|rotina|ansiedade|medo|decisão|decisao|estudo|carreira|empresa|casa|mudança|mudanca|futuro|passado|vendas|negócio|negocio|cansaço|cansaco|culpa|tempo)\b/gi;

function topicsOf(text:string):string[]{
  return Array.from(new Set((text.match(TOPICS)||[]).map(x=>x.toLowerCase())));
}

function memoryFromSentence(text:string,turnId:string,index:number):MemoryItem[]{
  const s=text.trim();
  if(!s)return [];
  const out:MemoryItem[]=[];
  const add=(kind:MemoryKind,confidence:number,status:MemoryStatus="active")=>
    out.push({id:turnId+":"+index+":"+out.length,kind,text:s,sourceTurnId:turnId,status,confidence,recency:1,evidence:"declaração explícita do usuário"});

  if(/\b(acho que|talvez|pode ser|deve ser|será que)\b/i.test(s)) add("HYPOTHESIS",.68,"hypothesis");
  else if(/\b(sinto|me sinto|estou me sentindo|tenho medo|estou ansioso|estou angustiado|feliz|triste|irritado|cansado|cansada)\b/i.test(s)) add("FEELING",.84);
  else if(/\b(quero|preciso|pretendo|gostaria|meu objetivo|quero tentar)\b/i.test(s)) add("GOAL",.88);
  else if(/\b(eu|meu|minha|tenho|sou|trabalho|moro|fiz|vou|estou)\b/i.test(s)) add("FACT",.95);
  return out;
}

export function buildEpistemicMemory(
  history:{role:"user"|"assistant";content:string}[],
  input:string,
  turnId:string
):MemoryItem[]{
  const userTurns=history.filter(m=>m.role==="user").slice(-8);
  const all=[...userTurns,{role:"user" as const,content:input}];
  const items:MemoryItem[]=[];
  all.forEach((m,i)=>{
    const id=i===all.length-1?turnId:"history-"+i;
    m.content.split(/[.!?]+/).map(s=>s.trim()).filter(Boolean).slice(0,6)
      .forEach((s,j)=>items.push(...memoryFromSentence(s,id,j)));
  });
  return items.slice(-24);
}

export function buildTopicGraph(
  history:{role:"user"|"assistant";content:string}[],
  input:string
):TopicGraph{
  const turns=[...history.filter(m=>m.role==="user").slice(-10).map(m=>m.content),input];
  const counts=new Map<string,{count:number,last:number}>();
  turns.forEach((text,i)=>{
    topicsOf(text).forEach(t=>{
      const old=counts.get(t)||{count:0,last:0};
      counts.set(t,{count:old.count+1,last:i});
    });
  });

  const nodes=Array.from(counts.entries()).map(([topic,v])=>({
    topic,
    confidence:Math.min(.99,.45+v.count*.12),
    recency:(v.last+1)/turns.length,
    evidenceCount:v.count
  })).sort((a,b)=>b.confidence-a.confidence);

  const edgeCounts=new Map<string,number>();
  turns.forEach(text=>{
    const ts=topicsOf(text).sort();
    for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++){
      const key=ts[i]+"|"+ts[j];
      edgeCounts.set(key,(edgeCounts.get(key)||0)+1);
    }
  });
  const edges=Array.from(edgeCounts.entries()).map(([key,count])=>{
    const [from,to]=key.split("|");
    return {from,to,weight:Math.min(.95,.35+count*.15),evidenceCount:count};
  }).sort((a,b)=>b.weight-a.weight);

  return {nodes,edges};
}

export function supersedeConflicting(memory:MemoryItem[],correction:string):MemoryItem[]{
  if(!correction.trim())return memory;
  const tokens=new Set(correction.toLowerCase().split(/\W+/).filter(Boolean));
  return memory.map(m=>{
    const overlap=m.text.toLowerCase().split(/\W+/).filter(Boolean).filter(t=>tokens.has(t)).length;
    return overlap>=3?{...m,status:"superseded"}:m;
  });
}

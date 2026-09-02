import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {runCanonicalEngine} from "@/lib/spiral/engine";
import {choosePacing} from "@/lib/spiral/pacing";
import {extractSignals} from "@/lib/spiral/signals";
import {planIntervention} from "@/lib/spiral/planner";
import {makeLearningEvent} from "@/lib/spiral/learning/signal";

export async function POST(req:Request){
  try{
    const s=await createServerSupabaseClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user)return NextResponse.json({error:"Sessão expirada"},{status:401});

    const b=await req.json();
    if(typeof b.sessionId!=="string"||typeof b.input!=="string"||!b.input.trim())
      return NextResponse.json({error:"Mensagem inválida"},{status:400});

    const {data:session}=await s.from("sessions").select("*").eq("id",b.sessionId).eq("user_id",user.id).single();
    if(!session)return NextResponse.json({error:"Sessão não encontrada"},{status:404});

    const {data:history}=await s.from("messages").select("role,content")
      .eq("session_id",session.id).order("created_at",{ascending:true}).limit(30);

    const safeHistory=(history||[]) as {role:"user"|"assistant";content:string}[];
    const input=b.input.trim();
    const result=await runCanonicalEngine(safeHistory,input);

    const um=await s.from("messages").insert({session_id:session.id,role:"user",content:input});
    if(um.error)throw um.error;
    const am=await s.from("messages").insert({session_id:session.id,role:"assistant",content:result.reply});
    if(am.error)throw am.error;

    const st=await s.from("structures").insert({
      session_id:session.id,
      central_question:result.structure.central_question,
      declared_factors:result.structure.declared_factors,
      constraints:result.structure.constraints,
      alternatives:result.structure.alternatives,
      decision_state:result.structure.decision_state,
      declared_decision:result.structure.declared_decision,
      open_questions:result.structure.open_questions,
      declared_changes:result.structure.declared_changes,
      memory_candidates:result.structure.memory_candidates,
      confidence:result.structure.confidence
    });
    if(st.error)throw st.error;

    const pacing=choosePacing({history:safeHistory,input});
    const signals=extractSignals(input,pacing.act);
    const plan=planIntervention(signals,pacing.state,safeHistory,null);
    const signal=result.safety_state==="risk_detected"
      ?"intervention_served"
      :signals.act==="correction"
        ?"correction"
        :signals.act==="continuation"
          ?"intervention_served"
          :"topic_shift";

    const event=makeLearningEvent({
      userId:user.id,
      factorTypes:signals.topic,
      act:signals.act,
      intervention:plan.primary,
      signal
    });
    if(event)await s.from("learning_events").insert(event);

    return NextResponse.json({
      reply:result.reply,
      structure:result.structure,
      safety_state:result.safety_state,
      conversation_state:result.conversation_state
    });
  }catch{
    return NextResponse.json({error:"Não foi possível processar a conversa agora."},{status:500});
  }
}

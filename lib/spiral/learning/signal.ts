import crypto from "crypto";

export type LearningSignal=
  "intervention_served"|"correction"|"question_overload"|"topic_shift"|"recovery_success";

export type LearningEventInput={
  userId:string;
  factorTypes:string[];
  act:string;
  intervention:string;
  signal:LearningSignal;
};

function pseudonym(userId:string,dailySalt:string):string{
  return crypto.createHmac("sha256",dailySalt).update(userId).digest("hex").slice(0,16);
}

export function makeLearningEvent(input:LearningEventInput){
  const day=new Date().toISOString().slice(0,10);
  const secret=process.env.TELEMETRY_SALT;
  if(!secret)return null;
  return{
    pseudonym:pseudonym(input.userId,day+secret),
    factor_types:Array.from(new Set(input.factorTypes)).slice(0,8),
    act:input.act,
    intervention:input.intervention,
    signal:input.signal
  };
}

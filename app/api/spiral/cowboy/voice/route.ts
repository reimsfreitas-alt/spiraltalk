import { NextResponse } from "next/server";

function pcmToWavBase64(base64Pcm:string){
  const pcm=Buffer.from(base64Pcm,"base64");
  const header=Buffer.alloc(44);
  header.write("RIFF",0);
  header.writeUInt32LE(36+pcm.length,4);
  header.write("WAVE",8);
  header.write("fmt ",12);
  header.writeUInt32LE(16,16);
  header.writeUInt16LE(1,20);
  header.writeUInt16LE(1,22);
  header.writeUInt32LE(24000,24);
  header.writeUInt32LE(24000*2,28);
  header.writeUInt16LE(2,32);
  header.writeUInt16LE(16,34);
  header.write("data",36);
  header.writeUInt32LE(pcm.length,40);
  return Buffer.concat([header,pcm]).toString("base64");
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const text=typeof body?.text==="string"?body.text.trim():"";
    if(!text)return NextResponse.json({error:"Texto vazio."},{status:400});
    if(text.length>5000)return NextResponse.json({error:"Texto de voz muito longo."},{status:413});

    const apiKey=process.env.GEMINI_API_KEY;
    if(!apiKey)return NextResponse.json({error:"GEMINI_API_KEY não configurada."},{status:503});

    const response=await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-goog-api-key":apiKey
        },
        body:JSON.stringify({
          contents:[{parts:[{text:"Fale em português do Brasil, com voz humana, calma e próxima, sem teatralidade. Faça pausas naturais. Texto: "+text}]}],
          generationConfig:{
            responseModalities:["AUDIO"],
            speechConfig:{
              voiceConfig:{prebuiltVoiceConfig:{voiceName:"Achird"}}
            }
          }
        })
      }
    );

    const data=await response.json();
    if(!response.ok){
      return NextResponse.json({error:"Falha no motor de voz.",detail:data?.error?.message||"Gemini TTS error"},{status:502});
    }

    const pcm=data?.candidates?.[0]?.content?.parts?.find((p:any)=>p?.inlineData?.data)?.inlineData?.data;
    if(!pcm)return NextResponse.json({error:"O motor de voz não devolveu áudio."},{status:502});

    return new NextResponse(Buffer.from(pcmToWavBase64(pcm),"base64"),{
      status:200,
      headers:{
        "Content-Type":"audio/wav",
        "Cache-Control":"no-store"
      }
    });
  }catch{
    return NextResponse.json({error:"Não foi possível gerar a voz agora."},{status:500});
  }
}

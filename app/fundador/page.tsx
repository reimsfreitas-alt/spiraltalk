"use client";
import { useRouter } from "next/navigation";
export default function FounderEntry(){
 const router=useRouter();
 return <main className="min-h-screen flex items-center justify-center p-6"><button onClick={()=>router.replace("/chat/founder")} className="w-full max-w-md rounded-lg bg-white text-black py-3">Entrar como fundador · testar</button></main>;
}
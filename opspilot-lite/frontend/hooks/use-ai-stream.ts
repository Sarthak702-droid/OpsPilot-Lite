"use client";
import { useCallback, useState } from "react";
import { useToken } from "@/lib/auth-context";
import { env } from "@/lib/env";
export function useAIStream() { const token=useToken(); const [text,setText]=useState("");const [pending,setPending]=useState(false);const [error,setError]=useState("");const ask=useCallback(async(question:string)=>{setText("");setError("");setPending(true);try{const session=await token();const response=await fetch(`${env.apiUrl}/api/ai/stream`,{method:"POST",headers:{"Content-Type":"application/json",...(session?{Authorization:`Bearer ${session}`}:{})},body:JSON.stringify({question})});if(!response.ok||!response.body)throw new Error("Stream unavailable");const reader=response.body.getReader();const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;setText(current=>current+decoder.decode(value,{stream:true}));}}catch(e){setError(e instanceof Error?e.message:"Stream failed")}finally{setPending(false)}},[token]);return{text,pending,error,ask}; }


"use client";
import { useState } from "react";
import { uploadLessonMaterialAction } from "@/server/actions/materials";
export function MaterialUpload({lessonId}:{lessonId:string}){
 const [message,setMessage]=useState("");const [pending,setPending]=useState(false);
 return <details className="text-left text-xs"><summary className="cursor-pointer rounded p-2">Adicionar PDF</summary><form className="grid w-56 gap-2 p-2" onSubmit={async(event)=>{event.preventDefault();const form=event.currentTarget;setPending(true);try{const result=await uploadLessonMaterialAction(new FormData(form));setMessage(result.ok?"Material enviado.":result.error.message);if(result.ok)form.reset();}catch{setMessage("Falha de conexão. Tente novamente.");}finally{setPending(false);}}}>
 <input type="hidden" name="lessonId" value={lessonId}/><label>Título<input className="border-input w-full rounded border p-2" name="title" maxLength={160} required/></label><label>PDF, até 4 MB<input className="w-full" type="file" name="file" accept="application/pdf" required/></label><button type="submit" className="border-input rounded border p-2" disabled={pending}>{pending?"Enviando…":"Enviar material"}</button><p role="status">{message}</p></form></details>;
}

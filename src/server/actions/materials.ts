"use server";
import { addLessonMaterial, MAX_MATERIAL_BYTES } from "@/server/services/materials";
import { ok, fail } from "@/contracts/common";
import { isDomainError } from "@/server/errors";
export async function uploadLessonMaterialAction(form:FormData){
 try {const file=form.get("file");if(!(file instanceof File)||file.size>MAX_MATERIAL_BYTES)return fail("VALIDATION_ERROR","Envie um PDF de até 4 MB.");
 return ok({id:await addLessonMaterial(String(form.get("lessonId")??""),String(form.get("title")??""),file)});
 }catch(error){return isDomainError(error)?fail(error.code,error.message):fail("INTERNAL_ERROR","Não foi possível enviar. Verifique a configuração do armazenamento.");}
}

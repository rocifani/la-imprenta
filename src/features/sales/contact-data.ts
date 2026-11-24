export function contactData(form:FormData){
 return {...Object.fromEntries(["display_name","contact_name","phone","email","address","cuit","notes"].map(key=>[key,String(form.get(key)??"").trim()])),...(form.has("contact_flags")?{is_customer:form.get("is_customer")==="on",is_supplier:form.get("is_supplier")==="on"}:{})};
}

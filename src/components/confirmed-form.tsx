"use client";
import {useId,useRef,type ReactNode} from "react";

export function ConfirmedForm({action,title,description,pending,children,className}:{
 action:(form:FormData)=>void;title:string;description:string;pending:boolean;children:ReactNode;className?:string;
}){
 const formRef=useRef<HTMLFormElement>(null);
 const dialogRef=useRef<HTMLDialogElement>(null);
 const confirmed=useRef(false);
 const titleId=useId(),descriptionId=useId();
 function submit(){
  dialogRef.current?.close();
  confirmed.current=true;
  formRef.current?.requestSubmit();
  confirmed.current=false;
 }
 return <><form ref={formRef} action={action} className={className} onSubmit={event=>{
  if(pending){event.preventDefault();return;}
  if(!confirmed.current){event.preventDefault();dialogRef.current?.showModal();}
 }}>{children}</form>
 <dialog ref={dialogRef} className="confirmation-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
  <h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p>
  <div className="form-actions"><button type="button" className="button secondary" autoFocus onClick={()=>dialogRef.current?.close()}>No, volver</button><button type="button" className="button dark" disabled={pending} onClick={submit}>Sí, confirmar</button></div>
 </dialog></>;
}

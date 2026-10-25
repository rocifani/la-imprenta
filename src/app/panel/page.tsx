import { redirect } from "next/navigation";

// Hasta implementar autenticación y autorización, ningún panel se expone.
export default function PanelPage() {
  redirect("/acceso");
}

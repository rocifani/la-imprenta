import type {PDFFont} from "pdf-lib";
export class PdfCharacterError extends Error {}

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!paragraph.trim()) { result.push(""); continue; }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { line = candidate; continue; }
      if (line) { result.push(line); line = ""; }
      // También se dividen palabras largas, correos y códigos sin espacios.
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > maxWidth) { result.push(line); line = ""; }
        line += character;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

export function createTextGuard(font:PDFFont){
 const characters=new Set(font.getCharacterSet());
 return (value:string)=>{
 const text=value.normalize("NFC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"").replaceAll("\t"," ");
 if([...text].some(character=>character!=="\n"&&character!=="\r"&&!characters.has(character.codePointAt(0)!)))throw new PdfCharacterError("El documento tiene caracteres que no se pueden representar en el PDF.");
 return text;
 };
}

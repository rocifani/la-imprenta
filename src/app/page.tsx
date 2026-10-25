import Link from "next/link";
import { Brand } from "@/components/brand";
import { QuoteForm } from "@/features/quotes/quote-form";

const products = [
  { number: "01", name: "Tu marca, siempre a mano.", category: "Tarjetas personales", className: "cards", text: "Una buena presentación empieza con los detalles." },
  { number: "02", name: "Ideas que circulan.", category: "Folletos y volantes", className: "flyers", text: "Dale espacio a tu próxima promoción o proyecto." },
  { number: "03", name: "Ese toque que distingue.", category: "Etiquetas y stickers", className: "stickers", text: "Para tus productos, tus envases y todo lo que imaginás." },
];

export default function Home() {
  return <>
    <header className="site-header"><div className="container nav"><Brand /><nav aria-label="Navegación principal"><a href="#trabajos">Qué imprimimos</a><Link href="/acceso" className="team-link">Acceso del equipo ↗</Link></nav></div></header>
    <main>
      <section className="hero container"><div className="hero-copy"><span className="eyebrow"><span className="tiny-dot" /> PAPEL, TINTA Y BUENAS IDEAS</span><h1>Lo imaginás.<br />Lo <em>imprimimos.</em></h1><p>De la primera idea al último detalle. Impresiones y soluciones gráficas para darle forma a lo que querés contar.</p><a href="#presupuesto" className="button dark">Pidamos un presupuesto <span aria-hidden="true">↗</span></a><span className="hero-caption">A tu medida. Con atención personalizada.</span></div><div className="print-composition" role="img" aria-label="Composición gráfica de papeles de colores y una tarjeta de La Imprenta"><div className="paper cyan-paper" /><div className="paper yellow-paper"><span>MUCHO<br />MÁS QUE<br />PAPEL.</span></div><div className="paper pink-paper"><span>ideas<br /><i>en tinta.</i></span><div className="print-lines" /></div><div className="paper white-paper"><span className="crop top-left">+</span><span className="paper-brand">la imprenta.</span><span className="paper-caption">TUS IDEAS, EN PAPEL.</span><span className="crop bottom-right">+</span></div><span className="composition-label">C / M / Y / K — HECHO PARA VOS</span></div></section>
      <div className="ticker" aria-hidden="true"><span>BUENAS IDEAS</span><b>✳</b><span>BUENAS IMPRESIONES</span><b>✳</b><span>MUCHAS POSIBILIDADES</span><b>✳</b></div>
      <section id="trabajos" className="container products-section"><div className="section-heading"><div><span className="eyebrow">QUÉ IMPRIMIMOS</span><h2>Cada proyecto<br />tiene su papel.</h2></div><p>Pequeños detalles o grandes ideas.<br />Contanos qué necesitás y lo vemos juntos.</p></div><div className="products-grid">{products.map((product) => <article key={product.number} className="product-card"><div className={`product-art ${product.className}`} aria-hidden="true"><span>{product.category}</span><i /><i /></div><div className="product-content"><span className="eyebrow">{product.number} / {product.category}</span><h3>{product.name}</h3><p>{product.text}</p><a href="#presupuesto">Consultar por mi trabajo <span aria-hidden="true">↗</span></a></div></article>)}</div><p className="catalog-note">¿Buscás imanes, talonarios u otro trabajo especial? También podés contárnoslo en tu consulta.</p></section>
      <section id="presupuesto" className="quote-section"><div className="container quote-grid"><div className="quote-copy"><span className="eyebrow">EMPECEMOS POR UNA IDEA</span><h2>Tu próximo<br />trabajo empieza<br /><em>con un hola.</em></h2><p>Prepará tu consulta y seguí la conversación por WhatsApp. Revisamos las características y te respondemos con un presupuesto personalizado.</p><ol className="steps"><li><span>01</span>Contanos qué necesitás.</li><li><span>02</span>Revisá tu mensaje.</li><li><span>03</span>Conversemos por WhatsApp.</li></ol></div><QuoteForm /></div></section>
    </main><footer className="container footer"><Brand /><span>Tus ideas, en papel.</span><Link href="/acceso">Acceso del equipo ↗</Link></footer>
  </>;
}

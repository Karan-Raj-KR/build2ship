import { ArrowRight, ShieldCheck, FileCheck, Compass } from "lucide-react";
import Link from "next/link";
import styles from "./landing.module.css";

const FEATURES = [
  { icon: ShieldCheck, title: "Know what needs checking.", description: "See how recorded citizenship, residency, and education requirements compare with your profile. Missing facts stay visible, so you can confirm them before committing your time." },
  { icon: FileCheck, title: "Bring your own evidence.", description: "Keep your projects, research, and achievements together. Use your real background to prepare answers and connect your work to application requirements." },
  { icon: Compass, title: "Take your context with you.", description: "Export a structured context pack for your preferred AI assistant. Track preparation in your workspace, then submit directly with the official provider." },
];

export function ThreePillarsSection() {
  return <section id="pillars" className={styles.features}>
    <div><h2>A clearer picture.<br/>A better next move.</h2><p>From a promising listing to a thoughtful application, keep the important details close.</p><Link href="/signup" className={styles.textLink}>Get started <ArrowRight size={16} aria-hidden="true"/></Link></div>
    <div className={styles.featureList}>{FEATURES.map(feature => <article key={feature.title}><feature.icon size={23} aria-hidden="true"/><div><h3>{feature.title}</h3><p>{feature.description}</p></div></article>)}</div>
  </section>;
}

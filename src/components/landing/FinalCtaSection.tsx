import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./landing.module.css";

export function FinalCtaSection() {
  return <section className={styles.close}>
    <div><h2>Keep your possibilities open.</h2><p>Build your profile. Find one opportunity worth exploring. Take it from there.</p></div>
    <Link href="/signup" className="btn btn-primary">Get started <ArrowRight size={18} aria-hidden="true"/></Link>
  </section>;
}

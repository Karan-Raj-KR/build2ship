import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./landing.module.css";

export function LandingHeader() {
  return <header className={styles.header}>
    <div className={styles.headerInner}>
      <Link href="/" className={styles.wordmark} aria-label="build2ship home"><span aria-hidden="true">b</span>build2ship.</Link>
      <nav aria-label="Page navigation">
        <a href="#catalogue">Explore opportunities</a>
        <a href="#how-it-works">How it works</a>
        <a href="#faq">Questions</a>
      </nav>
      <div className={styles.headerActions}>
        <Link href="/login" className={styles.signIn}>Sign in</Link>
        <Link href="/signup" className="btn btn-primary">Get started <ArrowRight size={16} aria-hidden="true"/></Link>
      </div>
    </div>
  </header>;
}

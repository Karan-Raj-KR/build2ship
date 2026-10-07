"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Check, Compass, FileCheck, GraduationCap, Lightbulb, Search, ShieldCheck, UserRound } from "lucide-react";
import { APP_PREVIEW_BADGE } from "@/config/app";
import styles from "./landing.module.css";

const PROFILES = [
  { role: "Student", icon: GraduationCap, interest: "Computer science · Open source", title: "Google Summer of Code 2026", provider: "Google Open Source", category: "Open source programme", criteria: ["Age and residency rules", "Contributor experience", "Proposal requirements"] },
  { role: "Builder", icon: Lightbulb, interest: "Startups · Applied technology", title: "Thiel Fellowship 2026", provider: "The Thiel Foundation", category: "Fellowship", criteria: ["Current age requirement", "Education commitments", "Project and funding terms"] },
  { role: "Researcher", icon: UserRound, interest: "Postgraduate study · Research", title: "Rhodes Scholarship at Oxford", provider: "The Rhodes Trust", category: "Scholarship", criteria: ["Degree requirements", "Constituency and application window", "Admission and endorsement process"] },
];

export function LandingHero() {
  const [profileIndex, setProfileIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const profile = PROFILES[profileIndex];
  return <section className={styles.hero}>
    <div className={styles.heroCopy}>
      <h1>A world of possibilities.<br/><span>A next step that’s yours.</span></h1>
      <p>Find scholarships, fellowships, and grants that fit your background. Understand the requirements. Keep the ones worth pursuing.</p>
      <div className={styles.heroActions}>
        <Link href="/signup" className="btn btn-primary">Get started <ArrowRight size={18} aria-hidden="true"/></Link>
        <a href="#catalogue" className={styles.textLink}>Explore examples <ArrowRight size={16} aria-hidden="true"/></a>
      </div>
      <p className={styles.heroNote}><Check size={15} aria-hidden="true"/> Free discovery & shortlist <span>{APP_PREVIEW_BADGE}</span></p>
    </div>
    <div className={styles.preview} aria-label="Interactive example workspace">
      <div className={styles.previewBar}><span><Compass size={17} aria-hidden="true"/> Your discovery workspace</span><span className={styles.exampleBadge}>Example only</span></div>
      <div className={styles.previewBody}>
        <div className={styles.previewHeading}><h2>Something worth exploring.</h2><p>Try a different example background.</p></div>
        <div className={styles.profilePicker} aria-label="Example background" style={{ "--profile-index": profileIndex } as CSSProperties}>
          {PROFILES.map((item, index) => <button key={item.role} aria-pressed={index === profileIndex} onClick={() => { setProfileIndex(index); setSaved(false); }}><item.icon size={17} aria-hidden="true"/>{item.role}</button>)}
        </div>
        <p className={styles.profileContext}><Search size={14} aria-hidden="true"/>{profile.interest}</p>
        <article className={styles.previewOpportunity} aria-live="polite">
          <div className={styles.previewCategory}><span>{profile.category}</span><button className={`adventure-save ${saved ? "saved" : ""}`} aria-label={`${saved ? "Unsave" : "Save"} example opportunity`} aria-pressed={saved} onClick={() => setSaved(!saved)}><Bookmark size={20} fill={saved ? "currentColor" : "none"} aria-hidden="true"/></button></div>
          <div key={profile.role} className={styles.previewContent}><h3>{profile.title}</h3><p className={styles.provider}>{profile.provider}</p>
          <div className={styles.criteria}><strong><ShieldCheck size={16} aria-hidden="true"/> Requirements to confirm</strong><ul>{profile.criteria.map(criterion => <li key={criterion}>{criterion}</li>)}</ul></div></div>
          <div className={styles.previewFooter}><span>{saved ? "Bookmarked in this preview" : "Check dates with the provider"}</span><Link href="/signup">Prepare <ArrowRight size={15} aria-hidden="true"/></Link></div>
        </article>
        <p className={styles.previewNote}><FileCheck size={14} aria-hidden="true"/> A relevant programme is a starting point. Eligibility is a separate check.</p>
      </div>
    </div>
  </section>;
}

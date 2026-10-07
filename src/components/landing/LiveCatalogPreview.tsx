"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Bookmark, ExternalLink, ShieldCheck, MapPin, Wallet, X, ArrowRight } from "lucide-react";

import styles from "./landing.module.css";

interface CatalogItem {
  id: string;
  title: string;
  organizer: string;
  category: "fellowship" | "scholarship" | "grant" | "internship";
  location: string;
  mode: "remote" | "hybrid" | "in-person";
  funding: string;
  deadline: string;
  deadlineDays: number;
  eligibilityStatus: "likely_eligible" | "check_requirements";
  eligibilitySummary: string;
  requirements: string[];
  visa: string;
  officialUrl: string;
}

const CATALOG_DATA: CatalogItem[] = [
  {
    id: "gsoc-2026",
    title: "Google Summer of Code 2026",
    organizer: "Google Open Source",
    category: "internship",
    location: "Global",
    mode: "remote",
    funding: "$1,500 – $6,600 Stipend",
    deadline: "April 8, 2026",
    deadlineDays: 14,
    eligibilityStatus: "check_requirements",
    eligibilitySummary: "100% remote global participation. Open to students and beginner developers.",
    requirements: [
      "Age 18 or older at registration",
      "Eligible to work in country of residence",
      "Not an active employee of Google or mentor organization",
    ],
    visa: "None required (100% remote online participation)",
    officialUrl: "https://summerofcode.withgoogle.com",
  },
  {
    id: "thiel-2026",
    title: "Thiel Fellowship 2026",
    organizer: "The Thiel Foundation",
    category: "grant",
    location: "San Francisco, CA / Global",
    mode: "remote",
    funding: "$100,000 Equity-free Grant",
    deadline: "Rolling Deadline",
    deadlineDays: 30,
    eligibilityStatus: "check_requirements",
    eligibilitySummary: "Age 22 or younger. For builders pursuing big ideas instead of college.",
    requirements: [
      "Must be aged 22 or younger when applying",
      "Must stop out or drop out of higher education if awarded",
      "Open to international founders and builders",
    ],
    visa: "Support provided for US travel, or project may be operated globally",
    officialUrl: "https://thielfellowship.org",
  },
  {
    id: "rhodes-2026",
    title: "Rhodes Scholarship at Oxford",
    organizer: "The Rhodes Trust",
    category: "scholarship",
    location: "Oxford, United Kingdom",
    mode: "in-person",
    funding: "Full Tuition + £19,092 / yr",
    deadline: "October 1, 2026",
    deadlineDays: 24,
    eligibilityStatus: "check_requirements",
    eligibilitySummary: "Must apply through specific national constituency. Undergraduate degree required.",
    requirements: [
      "Completion of Bachelor degree with First Class or 3.7+ GPA",
      "Age constraints vary by constituency (typically 18–24)",
      "Formal institutional endorsement from university",
    ],
    visa: "Full UK Student Visa sponsorship supported by Oxford",
    officialUrl: "https://www.rhodeshouse.ox.ac.uk",
  },
  {
    id: "yc-summer-2026",
    title: "Y Combinator Summer Batch",
    organizer: "Y Combinator",
    category: "grant",
    location: "San Francisco, CA",
    mode: "in-person",
    funding: "$500,000 Standard Deal",
    deadline: "April 15, 2026",
    deadlineDays: 21,
    eligibilityStatus: "check_requirements",
    eligibilitySummary: "Early-stage founders from any country. Technical prototype recommended.",
    requirements: [
      "At least 10% equity ownership per founder",
      "In-person participation in San Francisco during 3-month batch",
      "Open to all nationalities",
    ],
    visa: "O-1 / B-1 visa guidance and sponsorship assistance provided",
    officialUrl: "https://www.ycombinator.com",
  },
  {
    id: "nsf-grfp-2026",
    title: "NSF Graduate Research Fellowship",
    organizer: "National Science Foundation",
    category: "fellowship",
    location: "United States",
    mode: "in-person",
    funding: "$37,000 / yr + $16,000 Tuition",
    deadline: "October 18, 2026",
    deadlineDays: 38,
    eligibilityStatus: "check_requirements",
    eligibilitySummary: "US Citizens and permanent residents pursuing research-based Master's or PhD.",
    requirements: [
      "Must be a US Citizen, National, or Permanent Resident",
      "Enrolled in or applying to accredited US STEM graduate program",
      "Maximum of one application across undergraduate/early graduate career",
    ],
    visa: "Domestic program; US permanent legal status mandatory",
    officialUrl: "https://www.nsfgrfp.org",
  },
  {
    id: "cern-summer-2026",
    title: "CERN Summer Student Programme",
    organizer: "CERN Geneva",
    category: "internship",
    location: "Geneva, Switzerland",
    mode: "in-person",
    funding: "90 CHF / day + Travel Expenses",
    deadline: "January 31, 2026",
    deadlineDays: 45,
    eligibilityStatus: "check_requirements",
    eligibilitySummary: "Bachelor or Master students in Physics, Computing, or Engineering.",
    requirements: [
      "At least 3 years of university-level studies completed",
      "Fluent in English or French",
      "Member state and non-member state quotas apply",
    ],
    visa: "Swiss/French official international status card provided",
    officialUrl: "https://careers.cern",
  },
];

export function LiveCatalogPreview() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [inspectItem, setInspectItem] = useState<CatalogItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (inspectItem && !dialog.current?.open) dialog.current?.showModal(); }, [inspectItem]);
  const items = useMemo(() => CATALOG_DATA.filter(item =>
    (category === "all" || item.category === category) &&
    `${item.title} ${item.organizer} ${item.location}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [category, search]);
  function toggleSave(id: string) {
    setSavedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return <section id="catalogue" className={styles.catalog}>
    <div className={styles.catalogInner}>
      <div className={styles.sectionHead}>
        <div><h2>A few possibilities to explore.</h2><p>Programme examples, not live recommendations. Funding, dates, and rules may have changed. Check the official provider before applying.</p></div>
        <Link href="/signup" className={styles.textLink}>Create your shortlist <ArrowRight size={16} aria-hidden="true"/></Link>
      </div>
      <div className={styles.catalogTools}>
        <div aria-label="Example programme type">{[['all','All examples'],['fellowship','Fellowships'],['scholarship','Scholarships'],['grant','Grants'],['internship','Internships']].map(([id, title]) => <button key={id} className={`adventure-chip ${id === category ? 'selected' : ''}`} aria-pressed={id === category} onClick={() => setCategory(id)}>{title}</button>)}</div>
        <label className="adventure-search"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Search programme examples" placeholder="Search programmes, providers…" value={search} onChange={event => setSearch(event.target.value)}/></label>
      </div>
      <div className={styles.catalogGrid}>
        {items.map(item => <article className="adventure-opportunity" key={item.id}>
          <div className="adventure-cardtop"><span className="adventure-cardtype">{item.category} <span className="badge adventure-demo-label">Example</span></span><button className={`adventure-save ${savedIds.has(item.id) ? 'saved' : ''}`} aria-label={`${savedIds.has(item.id) ? 'Unsave' : 'Save'} ${item.title} in this preview`} aria-pressed={savedIds.has(item.id)} onClick={() => toggleSave(item.id)}><Bookmark size={20} fill={savedIds.has(item.id) ? 'currentColor' : 'none'} aria-hidden="true"/></button></div>
          <h3>{item.title}</h3><p className="adventure-carddomain">{item.organizer}</p>
          <div className={styles.catalogFacts}><span><MapPin size={15} aria-hidden="true"/>{item.location} · {item.mode}</span><span><Wallet size={15} aria-hidden="true"/>{item.funding}</span></div>
          <p className="adventure-eligibility"><strong>Requirements to confirm</strong><br/>{item.eligibilitySummary}</p>
          <div className={styles.catalogBottom}><span>{savedIds.has(item.id) ? 'Bookmarked · preview only' : 'Dates and terms need confirmation'}</span><button className="adventure-text-link" onClick={() => setInspectItem(item)}>View details <ArrowRight size={15} aria-hidden="true"/></button></div>
        </article>)}
      </div>
      {!items.length && <div className="adventure-empty"><h3>No examples match your search.</h3><p>Try another programme type or clear your filters.</p><button className="btn btn-secondary" onClick={() => { setCategory('all'); setSearch(''); }}>Clear filters</button></div>}
      <dialog
        ref={dialog}
        className="adventure-detail"
        aria-labelledby="example-title"
        onClose={() => setInspectItem(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            dialog.current?.close();
          }
        }}
      >
        {inspectItem && <>
          <div className="adventure-dialoghead"><span className="adventure-cardtype">{inspectItem.category} · Example</span><button className="adventure-close" aria-label="Close programme details" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true"/></button></div>
          <h2 id="example-title">{inspectItem.title}</h2><p>{inspectItem.organizer}</p>
          <p className="adventure-note">This is a static programme example. Confirm current funding, deadlines, eligibility, and visa terms with the official provider.</p>
          <div className="adventure-detailfacts"><div><small>ILLUSTRATIVE FUNDING</small><strong>{inspectItem.funding}</strong></div><div><small>RECORDED DEADLINE · CONFIRM WITH PROVIDER</small><strong>{inspectItem.deadline}</strong></div><div><small>LOCATION</small><strong>{inspectItem.location}</strong></div><div><small>RECORDED VISA INFORMATION · CONFIRM</small><strong>{inspectItem.visa}</strong></div></div>
          <section><h3><ShieldCheck size={18} className="inline" aria-hidden="true"/> Requirements to confirm</h3><ul>{inspectItem.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul></section>
          <div className="action-row"><Link href="/signup" className="btn btn-primary">Get started <ArrowRight size={16} aria-hidden="true"/></Link><a href={inspectItem.officialUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Official provider <ExternalLink size={16} aria-hidden="true"/></a></div>
        </>}
      </dialog>
    </div>
  </section>;
}

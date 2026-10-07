import styles from "./landing.module.css";

export function JourneyStepsSection() {
  return <section id="how-it-works" className={styles.steps}>
    <h2>Your next chapter, one step at a time.</h2>
    <ol>
      <li><span>1</span><h3>Start with your background.</h3><p>Add your interests, education, and location. Your profile gives discovery a useful starting point.</p></li>
      <li><span>2</span><h3>Find your possibilities.</h3><p>Explore the catalogue or describe a goal to Scout. Check the requirements and save what catches your eye.</p></li>
      <li><span>3</span><h3>Make a plan to apply.</h3><p>Gather your evidence and follow a preparation checklist. Confirm the current rules and apply with the provider.</p></li>
    </ol>
  </section>;
}

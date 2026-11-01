import "./Home.css";

/* ── Edit these values in one place ─────────────────────────── */
const WEBSITE_URL = "https://r26-it-065-research-website-pulmoai.vercel.app/#home";
const CONTACT_EMAIL = "mmpddsystem@gmail.com";
const DEMO_MAIL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("PulmoAI demo request")}`;

const CONDITIONS = [
    { title: "Pneumothorax", plain: "Collapsed lung", scan: "Chest X-ray", color: "blue",
        text: "Flags possible air around the lung, marks the area on the image and shows an urgency level so urgent patients can be seen first." },
    { title: "Pneumonia", plain: "Lung infection", scan: "Chest X-ray", color: "teal",
        text: "Flags possible pneumonia and highlights the part of the lung that looks affected." },
    { title: "Tuberculosis", plain: "TB", scan: "Chest X-ray", color: "amber",
        text: "Flags possible TB, tells it apart from other lung problems and marks the suspected area." },
    { title: "Lung cancer", plain: "Cancer type", scan: "CT scan", color: "rose",
        text: "Suggests the likely type of lung cancer from CT images and lets you look through the full scan in 2D and 3D." },
];

const BENEFITS = [
    { title: "Results in seconds", text: "Upload a scan and get a result almost straight away, without waiting for a specialist report." },
    { title: "See the reason", text: "Every positive result highlights the area of the image that led to it, so you can check it yourself." },
    { title: "Three checks from one X-ray", text: "Full Screening checks one chest X-ray for collapsed lung, pneumonia and TB at the same time." },
    { title: "Wrong images are stopped", text: "Photos, documents and other types of scans are rejected before any result is given." },
    { title: "Patient history and reports", text: "Every result is saved to the patient's record and can be downloaded as a PDF report." },
    { title: "Private and secure", text: "Each doctor has their own login and sees only their own patients." },
    { title: "Nothing to install", text: "Works in any web browser on a normal computer. No special hardware is needed." },
    { title: "You stay in control", text: "PulmoAI gives a second opinion. The final decision is always made by the doctor." },
];

const STEPS = [
    { n: "1", title: "Log in", text: "Sign in with the account given to you by your hospital or clinic." },
    { n: "2", title: "Choose a patient", text: "Select an existing patient or add a new one." },
    { n: "3", title: "Upload a scan", text: "Upload a chest X-ray or CT image and choose the check you need." },
    { n: "4", title: "Review and report", text: "See the result, the highlighted area and the urgency, then download the report." },
];

/* ── Small inline icons (no extra packages needed) ──────────── */
const Pulse = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </svg>
);
const Arrow = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);
const Mail = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
    </svg>
);
const Globe = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
);
const Pin = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
);

export default function Home({ onLogin }) {
    return (
        <div className="lp">
            {/* ── Top bar ── */}
            <header className="lp-nav">
                <div className="lp-wrap lp-nav-inner">
                    <a href="#top" className="lp-brand">
                        <span className="lp-logo"><Pulse /></span>
                        <span>
              <strong>PulmoAI</strong>
              <small>Diagnostic System</small>
            </span>
                    </a>
                    <nav className="lp-links">
                        <a href="#checks">What it checks</a>
                        <a href="#benefits">Benefits</a>
                        <a href="#how">How it works</a>
                        <a href="#contact">Contact</a>
                    </nav>
                    <button type="button" onClick={onLogin} className="lp-btn lp-btn-primary lp-btn-sm">Login</button>
                </div>
            </header>

            {/* ── Hero ── */}
            <section id="top" className="lp-hero">
                <div className="lp-wrap lp-hero-inner">
                    <div className="lp-hero-text">
                        <span className="lp-pill">Chest X-ray and CT scan support for doctors</span>
                        <h1>A faster, clearer second opinion on chest scans</h1>
                        <p>
                            PulmoAI checks chest X-rays and CT scans for four lung conditions in seconds and
                            highlights the part of the image behind each result, so doctors can review urgent
                            cases sooner and with more confidence.
                        </p>
                        <div className="lp-actions">
                            <button type="button" onClick={onLogin} className="lp-btn lp-btn-primary">Login <Arrow /></button>
                            <a href="#contact" className="lp-btn lp-btn-ghost">Contact us</a>
                        </div>
                        <ul className="lp-badges">
                            <li>Results in seconds</li>
                            <li>Highlighted image areas</li>
                            <li>Works in any browser</li>
                            <li>Doctor makes the final decision</li>
                        </ul>
                    </div>

                    <div className="lp-hero-card" aria-hidden="true">
                        <div className="lp-hc-head">
                            <span className="lp-dot" /><span className="lp-dot" /><span className="lp-dot" />
                            <span className="lp-hc-title">Example: one chest X-ray, three checks</span>
                        </div>
                        {[
                            ["Collapsed lung", "Possible finding", "High", "red"],
                            ["Pneumonia", "Not seen", "Low", "green"],
                            ["Tuberculosis", "Not seen", "Low", "green"],
                        ].map(([name, res, urg, c]) => (
                            <div className="lp-hc-row" key={name}>
                                <span className={`lp-hc-ind lp-${c}`} />
                                <span className="lp-hc-name">{name}</span>
                                <span className="lp-hc-res">{res}</span>
                                <span className={`lp-hc-urg lp-${c}`}>{urg}</span>
                            </div>
                        ))}
                        <div className="lp-hc-foot">Saved to the patient record · PDF report ready</div>
                    </div>
                </div>
            </section>

            {/* ── What it checks ── */}
            <section id="checks" className="lp-section">
                <div className="lp-wrap">
                    <h2>What PulmoAI checks</h2>
                    <p className="lp-lead">Four common and serious lung conditions, all from one system.</p>
                    <div className="lp-grid lp-grid-4">
                        {CONDITIONS.map((c) => (
                            <article key={c.title} className={`lp-card lp-accent-${c.color}`}>
                                <span className="lp-tag">{c.scan}</span>
                                <h3>{c.title}</h3>
                                <p className="lp-model">{c.plain}</p>
                                <p>{c.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Benefits ── */}
            <section id="benefits" className="lp-section lp-alt">
                <div className="lp-wrap">
                    <h2>Why doctors use PulmoAI</h2>
                    <div className="lp-grid lp-grid-4">
                        {BENEFITS.map((f) => (
                            <div key={f.title} className="lp-feature">
                                <h3>{f.title}</h3>
                                <p>{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section id="how" className="lp-section">
                <div className="lp-wrap">
                    <h2>How it works</h2>
                    <ol className="lp-steps">
                        {STEPS.map((s) => (
                            <li key={s.n}>
                                <span className="lp-step-n">{s.n}</span>
                                <h3>{s.title}</h3>
                                <p>{s.text}</p>
                            </li>
                        ))}
                    </ol>
                    <p className="lp-note">
                        PulmoAI supports, but does not replace, the judgement of a qualified doctor. Every result
                        should be reviewed by a clinician before any treatment decision.
                    </p>
                </div>
            </section>

            {/* ── Contact ── */}
            <section id="contact" className="lp-section lp-alt">
                <div className="lp-wrap lp-contact">
                    <div>
                        <h2>Contact us</h2>
                        <p className="lp-lead">
                            Would you like to use PulmoAI at your hospital or clinic, or see a demo first? Send us
                            a message and we will get back to you.
                        </p>
                        <ul className="lp-contact-list">
                            <li><Mail /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
                            <li><Globe /><a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">More about PulmoAI</a></li>
                            <li><Pin /><span>Sri Lanka</span></li>
                        </ul>
                    </div>
                    <div className="lp-cta">
                        <h3>Request a demo</h3>
                        <p>We will show you how PulmoAI works with real examples and help you set up accounts for your doctors.</p>
                        <a href={DEMO_MAIL} className="lp-btn lp-btn-primary">Email us for a demo <Arrow /></a>
                        <p className="lp-cta-small">
                            Already have an account?{" "}
                            <button type="button" onClick={onLogin} className="lp-linkbtn">Log in here</button>
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-wrap lp-footer-inner">
                    <span>© 2026 PulmoAI Diagnostic System</span>
                    <span className="lp-footer-links">
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">Website</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
            <button type="button" onClick={onLogin} className="lp-linkbtn">Login</button>
          </span>
                </div>
            </footer>
        </div>
    );
}
import { useState, useEffect } from 'react';
import {
  Code,
  Briefcase,
  Mail,
  ExternalLink,
  ChevronDown,
  Server,
  Layers,
  Cloud,
  Database,
  GraduationCap,
  MapPin,
  Phone,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';
import './Home.css';

const GithubIcon = ({ size = 24, className = '', style = {} }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
  </svg>
);

// Typewriter Component
function Typewriter({ text, delay = 30, onComplete, startDelay = 0 }) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasStarted(true), startDelay);
    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!hasStarted) return;

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prevText => prevText + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, delay, text, hasStarted, onComplete]);

  return <>{currentText}</>;
}

function Home() {
  const [step, setStep] = useState(1);

  const jsonString = `{
  "company": "LTS Global (Feb 2026 - Present)",
  "role": "Software Engineer | .NET & Fullstack",
  "focus": ["Cloud API Gateways", "Distributed Systems", "Database Optimization", "Multi-Tenancy"],
  "backend": ["C#", ".NET 8/7/6", "ASP.NET Core", "EF Core", "Dapper", "Redis", "RabbitMQ"],
  "frontend": ["Vue 3", "React", "Angular"],
  "cloud": ["Azure (APIM, Key Vault)", "AWS", "Docker", "CI/CD"]
}`;

  // Animation configurations
  const fadeUpProps = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section container">
        {/* Terminal Window */}
        <motion.div
          className="terminal-window"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="terminal-header">
            <div className="mac-dot red"></div>
            <div className="mac-dot yellow"></div>
            <div className="mac-dot green"></div>
          </div>
          <div className="terminal-body">
            <div className="terminal-command">
              <span className="terminal-prompt">$</span> whoami
            </div>
            <div className="terminal-output">
              <Typewriter
                text="Kieu The Vinh - Software Engineer | .NET & Fullstack"
                delay={35}
                startDelay={300}
                onComplete={() => setStep(2)}
              />
            </div>

            {step >= 2 && (
              <>
                <div className="terminal-command">
                  <span className="terminal-prompt">$</span> cat experience.json
                </div>
                <div className="terminal-output" style={{ whiteSpace: 'pre-wrap' }}>
                  <Typewriter
                    text={jsonString}
                    delay={8}
                    startDelay={200}
                    onComplete={() => setStep(3)}
                  />
                </div>
              </>
            )}

            {step >= 3 && (
              <div className="terminal-command">
                <span className="terminal-prompt text-accent animate-pulse">_</span>
              </div>
            )}

            {step < 3 && (
              <span className="terminal-prompt text-accent animate-pulse">_</span>
            )}
          </div>
        </motion.div>

        {/* Greeting & Actions */}
        <motion.div
          className="hero-text-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="open-to-work">
            <span className="dot"></span> Open to work
          </div>
          <h1 className="hero-title">
            Hello, I'm <span className="text-accent">Vinh</span>
          </h1>
          <p className="hero-subtitle">
            Software Engineer with 4+ years of hands-on experience engineering high-throughput distributed systems, enterprise cloud architectures (Azure/AWS), and modern fullstack applications (.NET Core, Vue.js, React, Angular).
          </p>
          <div className="hero-actions">
            <a href="#experience" className="btn btn-primary">
              View Experience
            </a>
            <a href="#skills" className="btn btn-secondary">
              Technical Skills
            </a>
            <a href="https://github.com/vinhspm" target="_blank" rel="noreferrer" className="btn btn-secondary">
              <GithubIcon size={18} style={{ marginRight: '8px' }} />
              GitHub
            </a>
            <a href="https://linkedin.com/in/vinhkieu" target="_blank" rel="noreferrer" className="btn btn-secondary">
              <Briefcase size={18} style={{ marginRight: '8px' }} />
              LinkedIn
            </a>
          </div>

          <div style={{ marginTop: '3rem', color: 'var(--text-secondary)' }}>
            <ChevronDown size={24} className="animate-bounce mx-auto" />
          </div>
        </motion.div>
      </section>

      {/* Technical Skills Section */}
      <motion.section id="skills" className="section container" {...fadeUpProps}>
        <h2 className="section-title">Technical Skills</h2>
        <p className="section-subtitle">
          Core competencies across distributed backend systems, cloud API gateways, database optimization, and modern reactive frontends.
        </p>
        <motion.div
          className="skills-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          <motion.div className="glass-panel skill-card" variants={staggerItem}>
            <div className="skill-card-header">
              <div className="skill-icon"><Server size={22} /></div>
              <h3>Backend & Distributed</h3>
            </div>
            <div className="tech-stack">
              <span className="tech-pill">C#</span>
              <span className="tech-pill">.NET 8/7/6</span>
              <span className="tech-pill">ASP.NET Core</span>
              <span className="tech-pill">EF Core</span>
              <span className="tech-pill">Dapper</span>
              <span className="tech-pill">LINQ</span>
              <span className="tech-pill">Microservices</span>
              <span className="tech-pill">RabbitMQ</span>
              <span className="tech-pill">MassTransit</span>
              <span className="tech-pill">Redis (Pub/Sub & Distributed Locks)</span>
              <span className="tech-pill">SignalR</span>
            </div>
          </motion.div>

          <motion.div className="glass-panel skill-card" variants={staggerItem}>
            <div className="skill-card-header">
              <div className="skill-icon"><Layers size={22} /></div>
              <h3>Frontend Engineering</h3>
            </div>
            <div className="tech-stack">
              <span className="tech-pill">Vue.js (Vue 3, Pinia)</span>
              <span className="tech-pill">React</span>
              <span className="tech-pill">Angular</span>
              <span className="tech-pill">TypeScript</span>
              <span className="tech-pill">Composition API</span>
              <span className="tech-pill">Modern Responsive UI</span>
            </div>
          </motion.div>

          <motion.div className="glass-panel skill-card" variants={staggerItem}>
            <div className="skill-card-header">
              <div className="skill-icon"><Cloud size={22} /></div>
              <h3>Cloud & DevOps</h3>
            </div>
            <div className="tech-stack">
              <span className="tech-pill">Azure (APIM, Managed Identity, Key Vault)</span>
              <span className="tech-pill">Azure App Services</span>
              <span className="tech-pill">Azure ApiOps</span>
              <span className="tech-pill">AWS (EC2, S3, RDS)</span>
              <span className="tech-pill">Docker</span>
              <span className="tech-pill">Jenkins CI/CD</span>
            </div>
          </motion.div>

          <motion.div className="glass-panel skill-card" variants={staggerItem}>
            <div className="skill-card-header">
              <div className="skill-icon"><Database size={22} /></div>
              <h3>Databases & Practices</h3>
            </div>
            <div className="tech-stack">
              <span className="tech-pill">SQL Server</span>
              <span className="tech-pill">PostgreSQL</span>
              <span className="tech-pill">MySQL (Execution Plan Optimization)</span>
              <span className="tech-pill">Composite Indexing</span>
              <span className="tech-pill">Multi-Tenancy (Database-per-Tenant)</span>
              <span className="tech-pill">Clean Architecture</span>
              <span className="tech-pill">DDD</span>
              <span className="tech-pill">Unit Testing (xUnit, Moq)</span>
              <span className="tech-pill">Git Flow</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Experience Section */}
      <motion.section id="experience" className="section container" {...fadeUpProps}>
        <h2 className="section-title">Professional Experience</h2>
        <p className="section-subtitle">
          Demonstrated senior ownership across high-concurrency systems, cloud topologies, and cross-functional team leadership.
        </p>
        <motion.div
          style={{ maxWidth: '850px', margin: '0 auto' }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {/* LTS Global */}
          <motion.div className="experience-item" variants={staggerItem}>
            <div className="exp-date">Feb 2026 – Present</div>
            <h3 className="exp-role">Software Engineer</h3>
            <div className="exp-company">LTS Global</div>
            <ul className="exp-desc" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.7' }}>
              <li>Co-architected a zero-trust multi-stage API Gateway topology using Azure APIM Managed Identity Chaining and Azure ApiOps toolkit; unified Dev/QA routing to a shared enterprise Form.io engine while strictly isolating secrets via Azure Key Vault.</li>
              <li>Engineered custom .NET Stage-Resolution Middleware (<code>X-Origin-Env</code>) to dynamically inject vendor-scoped admin credentials, eliminating redundant server deployments and cutting duplicate infrastructure costs by ~40%.</li>
              <li>Triaged and resolved a high-severity production outage causing midnight 500 error spikes on the user provisioning endpoint (<code>createUser</code>); eliminated database deadlock race conditions during batch synchronization via Redis distributed locks and idempotency keys.</li>
              <li>Built responsive form administration and dynamic submission portals using Vue 3 (Composition API, Pinia) integrated with core .NET microservices.</li>
            </ul>
            <div className="tech-stack">
              <span className="tech-pill">C#</span>
              <span className="tech-pill">.NET</span>
              <span className="tech-pill">Azure APIM</span>
              <span className="tech-pill">Azure Key Vault</span>
              <span className="tech-pill">Redis (Distributed Locks)</span>
              <span className="tech-pill">Vue 3</span>
              <span className="tech-pill">Pinia</span>
              <span className="tech-pill">Microservices</span>
            </div>
          </motion.div>

          {/* CMC Global */}
          <motion.div className="experience-item" variants={staggerItem}>
            <div className="exp-date">Apr 2025 – Feb 2026</div>
            <h3 className="exp-role">Software Engineer</h3>
            <div className="exp-company">CMC Global</div>
            <ul className="exp-desc" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.7' }}>
              <li>Led an engineering team of 5 developers building a multi-tenant Learning Management System (LMS) for a major UK educational client; directed sprint task breakdowns, architecture decisions, and code review checklists.</li>
              <li>Designed Database-per-Tenant isolation and an event-driven pub/sub caching mechanism (RabbitMQ & Redis) to ensure strict data boundaries and real-time cache invalidation without stale reads.</li>
              <li>Eliminated critical N+1 query bottlenecks and reduced Quiz module API response time by 70% (from ~2.0s to 600ms) through complex DTO projections and bulk upsert operations in EF Core.</li>
              <li>Architected a granular, configurable Role-Based Access Control (RBAC) module across .NET backend and React frontend (dynamic permission matrices, route guards) supporting Admins, Teachers, and Headmasters.</li>
              <li>Mentored 2 fresher engineers to achieve promotion to Junior within 2 months, successfully clearing UK client technical onboarding.</li>
            </ul>
            <div className="tech-stack">
              <span className="tech-pill">.NET 8</span>
              <span className="tech-pill">C#</span>
              <span className="tech-pill">React</span>
              <span className="tech-pill">RabbitMQ</span>
              <span className="tech-pill">Redis</span>
              <span className="tech-pill">EF Core</span>
              <span className="tech-pill">SQL Server</span>
              <span className="tech-pill">Multi-Tenancy</span>
            </div>
          </motion.div>

          {/* FPT Software */}
          <motion.div className="experience-item" variants={staggerItem}>
            <div className="exp-date">Jan 2024 – Apr 2025</div>
            <h3 className="exp-role">Software Engineer</h3>
            <div className="exp-company">FPT Software</div>
            <ul className="exp-desc" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.7' }}>
              <li>Optimized healthcare workflow services, slashing API latency from 5,000ms to 400ms (&gt;90% gain) by replacing inefficient LINQ queries with compiled queries/direct projections and designing composite indexes.</li>
              <li>Developed calibration algorithms and telemetry data visualization for automated blood analyzer hardware using .NET Core and Angular, ensuring strict clinical precision standards.</li>
            </ul>
            <div className="tech-stack">
              <span className="tech-pill">.NET Core</span>
              <span className="tech-pill">C#</span>
              <span className="tech-pill">Angular</span>
              <span className="tech-pill">AWS</span>
              <span className="tech-pill">PostgreSQL</span>
              <span className="tech-pill">LINQ Optimization</span>
            </div>
          </motion.div>

          {/* Misa JSC */}
          <motion.div className="experience-item" variants={staggerItem}>
            <div className="exp-date">Aug 2022 – Dec 2023</div>
            <h3 className="exp-role">Software Engineer</h3>
            <div className="exp-company">Misa JSC</div>
            <ul className="exp-desc" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.7' }}>
              <li>Developed core financial and accounting modules utilizing ASP.NET Core, Vue.js, and Angular.</li>
              <li>Authored comprehensive test suites achieving &gt;80% code coverage using xUnit and Moq; resolved high-priority accounting ledger defects to guarantee enterprise data integrity.</li>
            </ul>
            <div className="tech-stack">
              <span className="tech-pill">ASP.NET Core</span>
              <span className="tech-pill">C#</span>
              <span className="tech-pill">Vue.js</span>
              <span className="tech-pill">Angular</span>
              <span className="tech-pill">xUnit</span>
              <span className="tech-pill">Moq</span>
              <span className="tech-pill">MySQL</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Featured Projects Section */}
      <motion.section id="projects" className="section container" {...fadeUpProps}>
        <h2 className="section-title">Featured Architectures & Projects</h2>
        <p className="section-subtitle">
          Real-world systems highlighting scalable microservices, multi-tenant databases, and mission-critical performance gains.
        </p>
        <motion.div
          className="feature-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {/* Project 1 */}
          <motion.div className="glass-panel feature-card" variants={staggerItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <Code size={24} color="var(--accent-color)" />
              <ExternalLink size={20} color="var(--text-secondary)" />
            </div>
            <h3>Zero-Trust Cloud API Gateway & Form Engine</h3>
            <p>
              Architected a zero-trust multi-stage API Gateway topology using Azure APIM Managed Identity and Azure ApiOps toolkit. Engineered custom .NET stage-resolution middleware (<code>X-Origin-Env</code>) to dynamically inject vendor credentials, cutting infrastructure cost by ~40%.
            </p>
            <div className="tech-stack" style={{ marginTop: '1.5rem' }}>
              <span className="tech-pill">Azure APIM</span>
              <span className="tech-pill">Azure Key Vault</span>
              <span className="tech-pill">.NET Core</span>
              <span className="tech-pill">Redis</span>
              <span className="tech-pill">Vue 3</span>
            </div>
          </motion.div>

          {/* Project 2 */}
          <motion.div className="glass-panel feature-card" variants={staggerItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <Code size={24} color="var(--accent-color)" />
              <ExternalLink size={20} color="var(--text-secondary)" />
            </div>
            <h3>Multi-Tenant Learning Management System (LMS)</h3>
            <p>
              Designed a Database-per-Tenant isolation model and event-driven caching (RabbitMQ & Redis) for a major UK educational client. Reduced Quiz API latency by 70% (2.0s to 600ms) with EF Core bulk upsert and DTO projection.
            </p>
            <div className="tech-stack" style={{ marginTop: '1.5rem' }}>
              <span className="tech-pill">.NET 8</span>
              <span className="tech-pill">RabbitMQ</span>
              <span className="tech-pill">Redis</span>
              <span className="tech-pill">React</span>
              <span className="tech-pill">SQL Server</span>
            </div>
          </motion.div>

          {/* Project 3 */}
          <motion.div className="glass-panel feature-card" variants={staggerItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <Code size={24} color="var(--accent-color)" />
              <ExternalLink size={20} color="var(--text-secondary)" />
            </div>
            <h3>Automated Blood Analyzer Calibration System</h3>
            <p>
              Calibration algorithms and telemetry visualization for automated medical blood analyzer hardware. Slashed healthcare workflow service latency from 5,000ms to 400ms (&gt;90% gain) through compiled LINQ queries and composite indexing.
            </p>
            <div className="tech-stack" style={{ marginTop: '1.5rem' }}>
              <span className="tech-pill">.NET Core</span>
              <span className="tech-pill">Angular</span>
              <span className="tech-pill">AWS</span>
              <span className="tech-pill">PostgreSQL</span>
            </div>
          </motion.div>

          {/* Project 4 */}
          <motion.div className="glass-panel feature-card" variants={staggerItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <Code size={24} color="var(--accent-color)" />
              <ExternalLink size={20} color="var(--text-secondary)" />
            </div>
            <h3>Enterprise Financial & Accounting Modules</h3>
            <p>
              Engineered core financial and accounting ledger modules ensuring high data integrity. Authored comprehensive test suites achieving &gt;80% code coverage using xUnit and Moq to resolve accounting ledger defects.
            </p>
            <div className="tech-stack" style={{ marginTop: '1.5rem' }}>
              <span className="tech-pill">ASP.NET Core</span>
              <span className="tech-pill">Vue.js</span>
              <span className="tech-pill">Angular</span>
              <span className="tech-pill">xUnit / Moq</span>
              <span className="tech-pill">MySQL</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Education Section */}
      <motion.section id="education" className="section container" {...fadeUpProps}>
        <h2 className="section-title">Education</h2>
        <motion.div
          className="glass-panel education-card"
          variants={staggerItem}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="education-icon">
            <GraduationCap size={36} />
          </div>
          <div className="education-content">
            <h3 className="education-school">
              University of Engineering and Technology, Vietnam National University (UET - VNU)
            </h3>
            <div className="education-degree">
              Bachelor of Science in Information Technology (Honors Program)
            </div>
            <div className="education-date">Aug 2019 – Jun 2023</div>
            <div>
              <span className="gpa-badge">
                <Award size={14} /> GPA: 3.43 / 4.0
              </span>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Contact Section */}
      <motion.section id="contact" className="section container" {...fadeUpProps}>
        <h2 className="section-title">Get In Touch</h2>
        <p className="section-subtitle">
          Feel free to reach out for collaboration, opportunities, or technical discussions.
        </p>
        <motion.div
          className="contact-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          <motion.a href="mailto:vinhkieu.uet@gmail.com" className="glass-panel contact-card" variants={staggerItem}>
            <Mail size={28} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>Email</h3>
            <p className="font-mono text-sm text-secondary">vinhkieu.uet@gmail.com</p>
          </motion.a>

          <motion.a href="tel:+84912890536" className="glass-panel contact-card" variants={staggerItem}>
            <Phone size={28} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>Phone</h3>
            <p className="font-mono text-sm text-secondary">(+84) 912 890 536</p>
          </motion.a>

          <motion.a href="https://linkedin.com/in/vinhkieu" target="_blank" rel="noreferrer" className="glass-panel contact-card" variants={staggerItem}>
            <Briefcase size={28} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>LinkedIn</h3>
            <p className="font-mono text-sm text-secondary">linkedin.com/in/vinhkieu</p>
          </motion.a>

          <motion.a href="https://github.com/vinhspm" target="_blank" rel="noreferrer" className="glass-panel contact-card" variants={staggerItem}>
            <GithubIcon size={28} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>GitHub</h3>
            <p className="font-mono text-sm text-secondary">github.com/vinhspm</p>
          </motion.a>

          <motion.div className="glass-panel contact-card" variants={staggerItem}>
            <MapPin size={28} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>Location</h3>
            <p className="font-mono text-sm text-secondary">Hanoi, Vietnam</p>
          </motion.div>
        </motion.div>
      </motion.section>
    </div>
  );
}

export default Home;

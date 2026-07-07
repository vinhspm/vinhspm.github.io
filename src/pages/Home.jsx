import { useState, useEffect } from 'react';
import { Code, Briefcase, Mail, ExternalLink, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import './Home.css';

const GithubIcon = ({ size = 24, className = '', style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
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
  "company": "CMC Global (Mar 2025 - Present)",
  "focus": ["Microservices", "API Design & Optimization", "CI/CD Pipelines"],
  "backend": ["C#", ".NET Core", "AWS", "Jenkins", "Docker", "SQL Server"],
  "frontend": ["Next.JS", "TypeScript", "Angular", "Vue"],
  "infrastructure": ["AWS", "Jenkins", "Docker"]
}`;

  // Animation configurations
  const fadeUpProps = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
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
                text="Kieu The Vinh - Software Engineer"
                delay={40}
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
                    delay={10}
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
            Software engineer with experience building scalable backend systems, optimizing database interactions, and developing robust web applications.
          </p>
          <div className="hero-actions">
            <a href="#experience" className="btn btn-primary">
              View Experience
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

      {/* Experience Section */}
      <motion.section id="experience" className="section container" {...fadeUpProps}>
        <h2 className="section-title">Experience</h2>
        <motion.div
          style={{ maxWidth: '800px', margin: '0 auto' }}
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          <motion.div className="experience-item" variants={staggerItem}>
            <div className="exp-date">03/2025 - Present</div>
            <h3 className="exp-role">Software Engineer</h3>
            <div className="exp-company">CMC Global</div>
            <ul className="exp-desc" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
              <li>Led a team of 5 developers, improving sprint velocity by 20% through effective task estimation and rigorous code reviews.</li>
              <li>Architected core LMS modules (Task Scheduling, Event Pub-Sub), handling 1,000+ concurrent user events with high reliability.</li>
              <li>Constructed automated CI/CD pipelines using Jenkins and Docker, reducing deployment time.</li>
              <li>Optimized database interactions with complex DTO projections and bulk upserts, reducing API response times by 70%.</li>
            </ul>
            <div className="tech-stack">
              <span className="tech-pill">C#</span>
              <span className="tech-pill">.NET Core</span>
              <span className="tech-pill">Jenkins</span>
              <span className="tech-pill">Docker</span>
              <span className="tech-pill">SQL Server</span>
            </div>
          </motion.div>

          <motion.div className="experience-item" variants={staggerItem}>
            <div className="exp-date">02/2024 - 02/2025</div>
            <h3 className="exp-role">Software Engineer</h3>
            <div className="exp-company">FPT Software</div>
            <ul className="exp-desc" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
              <li>Optimized workflow service: reduced response time from 5 seconds to 400ms.</li>
              <li>Developed main logic of calibration functions for blood analyzers.</li>
              <li>Supported DevOps in building CI/CD pipelines on AWS.</li>
              <li>Applied best practices to clean and optimize codebase for improved maintainability.</li>
            </ul>
            <div className="tech-stack">
              <span className="tech-pill">C#</span>
              <span className="tech-pill">AWS</span>
              <span className="tech-pill">CI/CD</span>
            </div>
          </motion.div>

          <motion.div className="experience-item" variants={staggerItem}>
            <div className="exp-date">04/2022 - 02/2024</div>
            <h3 className="exp-role">Full-stack Developer</h3>
            <div className="exp-company">Misa JSC</div>
            <ul className="exp-desc" style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
              <li>Developed, maintained, fixed bugs and implement change requests in Agile Scrum.</li>
              <li>Created Unit Tests, ensuring code coverage limit at 80%.</li>
              <li>Identified and resolved critical bugs to ensure seamless system functionality.</li>
            </ul>
            <div className="tech-stack">
              <span className="tech-pill">JavaScript</span>
              <span className="tech-pill">Vue/Angular</span>
              <span className="tech-pill">.NET</span>
            </div>
          </motion.div>

        </motion.div>
      </motion.section>

      {/* Projects Section */}
      <motion.section className="section container" {...fadeUpProps}>
        <h2 className="section-title">Projects</h2>
        <motion.div
          className="feature-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >

          <motion.div className="glass-panel feature-card" variants={staggerItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <Code size={24} color="var(--text-secondary)" />
              <ExternalLink size={20} color="var(--accent-color)" />
            </div>
            <h3>Learning Management System</h3>
            <p>
              Designed a Database-per-Tenant architecture allowing isolated databases. Implemented Event-Driven Caching with Pub/Sub and built a Configurable RBAC system.
            </p>
            <div className="tech-stack" style={{ marginTop: '1.5rem' }}>
              <span className="tech-pill">.Net 8</span>
              <span className="tech-pill">Redis</span>
              <span className="tech-pill">SQL Server</span>
            </div>
          </motion.div>

          <motion.div className="glass-panel feature-card" variants={staggerItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <Code size={24} color="var(--text-secondary)" />
              <ExternalLink size={20} color="var(--accent-color)" />
            </div>
            <h3>Sysmex Calibration Tool</h3>
            <p>
              Calibration software for blood analyzer machines. Developed features to send and manage calibration reports across global regions.
            </p>
            <div className="tech-stack" style={{ marginTop: '1.5rem' }}>
              <span className="tech-pill">.Net Core</span>
              <span className="tech-pill">PostgreSQL</span>
              <span className="tech-pill">Angular</span>
            </div>
          </motion.div>

          <motion.div className="glass-panel feature-card" variants={staggerItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <Code size={24} color="var(--text-secondary)" />
              <ExternalLink size={20} color="var(--accent-color)" />
            </div>
            <h3>Amis Task Management System</h3>
            <p>
              Task management platform that optimized leaders' time and increased employee productivity by 47% via combined work models.
            </p>
            <div className="tech-stack" style={{ marginTop: '1.5rem' }}>
              <span className="tech-pill">.Net Core</span>
              <span className="tech-pill">MySQL</span>
              <span className="tech-pill">Angular 10</span>
            </div>
          </motion.div>

        </motion.div>
      </motion.section>

      {/* Contact Section */}
      <motion.section className="section container" {...fadeUpProps}>
        <h2 className="section-title">Get In Touch</h2>
        <motion.div
          className="contact-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          <motion.a href="mailto:vinhkieu.uet@gmail.com" className="glass-panel contact-card" variants={staggerItem}>
            <Mail size={32} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>Email Me</h3>
            <p className="font-mono text-sm text-secondary">vinhkieu.uet@gmail.com</p>
          </motion.a>
          <motion.a href="https://github.com/vinhspm" target="_blank" rel="noreferrer" className="glass-panel contact-card" variants={staggerItem}>
            <GithubIcon size={32} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>GitHub</h3>
            <p className="font-mono text-sm text-secondary">vinhspm</p>
          </motion.a>
          <motion.a href="https://linkedin.com/in/vinhkieu" target="_blank" rel="noreferrer" className="glass-panel contact-card" variants={staggerItem}>
            <Briefcase size={32} className="icon text-secondary" style={{ transition: 'color 0.3s' }} />
            <h3>LinkedIn</h3>
            <p className="font-mono text-sm text-secondary">in/vinhkieu</p>
          </motion.a>
        </motion.div>
      </motion.section>
    </div>
  );
}

export default Home;

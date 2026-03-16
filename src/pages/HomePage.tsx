import BackendStatusCard from '../components/BackendStatusCard';
import env from '../config/env';

const stackItems = [
  'Java 21 + Spring Boot 3',
  'PostgreSQL + Redis',
  'Spring Session + Spring Security',
  'React 19 + TypeScript + Vite',
];

function HomePage() {
  return (
    <div className="page-grid">
      <section className="hero panel">
        <span className="eyebrow">AI Coding Platform</span>
        <h1>Coddy Intelligent Website Generator</h1>
        <p className="env-label">
          Runtime env: <strong>{env.appEnv}</strong>
        </p>

        <ul className="stack-list">
          {stackItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <BackendStatusCard />
    </div>
  );
}

export default HomePage;

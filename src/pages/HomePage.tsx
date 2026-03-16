import BackendStatusCard from "../components/BackendStatusCard";

const stackItems = [
  "Java 21 + Spring Boot 3",
  "PostgreSQL + Redis",
  "React + TypeScript + Vite",
  // "Generation modes: HTML Single / HTML Multi / React",
];

function HomePage() {
  return (
    <div className="page-grid">
      <section className="hero panel">
        <p className="eyebrow">Intelligent Webpage Generator</p>
        <h1>Coddy Site Studio</h1>
        <p>Build and iterate AI-generated websites.</p>

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

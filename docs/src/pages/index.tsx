import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Get Started →
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/dashboard"
            style={{marginLeft: '1rem'}}>
            ⚡ Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  const features = [
    {
      title: '📤 Push Sync',
      description: 'Capture your running React app and push it to Figma as editable design layers. Unlimited calls via generate_figma_design.',
    },
    {
      title: '📥 Pull Sync',
      description: 'Pull design changes from Figma back to code. Copilot reads the design context and suggests code updates.',
    },
    {
      title: '🗺️ Component Mapping',
      description: 'Map each React component to its Figma node. View mappings interactively in the Component Map UI.',
    },
    {
      title: '🤖 MCP Powered',
      description: 'Uses the Figma MCP server so Copilot can read from and write to Figma directly via natural language.',
    },
    {
      title: '📝 Code = Source of Truth',
      description: 'Designers and developers collaborate via Figma, but all changes flow through the code repo.',
    },
    {
      title: '💬 Copilot First',
      description: 'No CLI needed — just prompt Copilot in VS Code Agent Mode. Push, pull, and explore Figma conversationally.',
    },
  ];

  return (
    <section style={{padding: '3rem 0'}}>
      <div className="container">
        <div className="row">
          {features.map((f, i) => (
            <div key={i} className="col col--4" style={{marginBottom: '2rem'}}>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Bidirectional sync between code and Figma">
      <HomepageHeader />
      <main>
        <Features />
      </main>
    </Layout>
  );
}

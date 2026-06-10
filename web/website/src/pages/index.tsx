import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import HomepageFeatures from "@site/src/components/homepage-features";
import Logo from "@site/static/img/logo.svg";
import Layout from "@theme/Layout";
import clsx from "clsx";
import React from "react";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Logo className="logo" style={{ maxWidth: "300px" }} />
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Get Started️
          </Link>
          <span className={styles.indexCtasGitHubButtonWrapper}>
            <iframe
              sandbox=""
              className={styles.indexCtasGitHubButton}
              src="https://ghbtns.com/github-btn.html?user=stustapay&amp;repo=stustapay&amp;type=star&amp;count=true&amp;size=large"
              width={160}
              height={30}
              title="GitHub Stars"
            />
          </span>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout title="Home">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

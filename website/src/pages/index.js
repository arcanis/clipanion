import Link                 from '@docusaurus/Link';
import useBaseUrl           from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout               from '@theme/Layout';
import clsx                 from 'clsx';
import React                from 'react';

import styles               from './styles.module.css';

const features = [{
  title: `Type Safe`,
  description: `Clipanion provides type inference for the options you declare: no duplicated types to write and keep in sync.`,
}, {
  title: `Tooling Integration`,
  description: `Because it uses standard ES6 classes, tools like ESLint can easily lint your options to detect the unused ones.`,
}, {
  title: `Feature Complete`,
  description: `Clipanion supports subcommands, arrays, counters, execution contexts, error handling, option proxying, and much more.`,
}, {
  title: `Soundness`,
  description: `Clipanion unifies your commands into a proper state machine. It gives little room for bugs, and unlocks command overloads.`,
}, {
  title: `Tree Shaking`,
  description: `The core is implemented using a functional approach, letting most bundlers only keep what you actually use.`,
}, {
  title: `Battle Tested`,
  description: `Clipanion is used to power Yarn - likely one of the most complex CLI used everyday by the JavaScript community.`,
}];

function Feature({imageUrl, title, description}) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={clsx(`col col--4`, styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const {siteConfig = {}} = context;

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className={clsx(`hero hero--primary`, styles.heroBanner)}>
        <div className={`container`}>
          <h1 className={`hero__title`}>{siteConfig.title}</h1>
          <p className={`hero__subtitle`}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link className={clsx(`button button--outline button--secondary button--lg`, styles.getStarted)} to={useBaseUrl(`docs/`)}>
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length > 0 && (
          <section className={styles.features}>
            <div className={`container`}>
              <div className={`row`}>
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

// eslint-disable-next-line arca/no-default-export
export default Home;

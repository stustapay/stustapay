import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg?: React.ComponentType<React.ComponentProps<"svg">>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Android POS App",
    description: <>Any Android phone with a NFC reader can be used as sale point.</>,
  },
  {
    title: "Cashless payment",
    description: <>Customers pay using NFC chips Payment via NFC wristbands or cards.</>,
  },
  {
    title: "Online Top-Up",
    description: <>Customers can top up their account balance in the online customer portal.</>,
  },
  {
    title: "TSE",
    description: (
      <>
        Supports KassenSichV compatible TSE signatures for all purchases made in the system. <br />
        DSFinV-K compliant data export is also supported.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--3")}>
      {Svg && (
        <div className="text--center">
          <Svg className={styles.featureSvg} role="img" />
        </div>
      )}
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <>
      <section className={styles.features}>
        <div className="container">
          <div className="row">
            {FeatureList.map((props, idx) => (
              <Feature key={idx} {...props} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

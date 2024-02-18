import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "StuStaPay",
  tagline: "The First Open Source Festival Payment System",
  favicon: "img/logo.svg",

  // Set the production url of your site here
  url: "https://stustapay.de", // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often "/<projectName>/"
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren"t using GitHub pages, you don"t need these.
  organizationName: "stustapay", // Usually your GitHub org/user name.
  projectName: "stustapay.github.io", // Usually your repo name.
  deploymentBranch: "master",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don"t use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"), // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/stustapay/stustapay/tree/master/website/",
        },
        blog: {
          showReadingTime: true, // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/stustapay/stustapay/tree/master/website/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      } satisfies Preset.Options,
    ],
    [
      "redocusaurus",
      {
        // Plugin Options for loading OpenAPI files
        specs: [
          {
            id: "administration-api",
            spec: "../api/administration.json",
            route: "/api/administration",
          },
          {
            id: "terminalserver-api",
            spec: "../api/terminalserver.json",
            route: "/api/terminalserver",
          },
          {
            id: "customerportal-api",
            spec: "../api/customer_portal.json",
            route: "/api/customer_portal",
          },
        ],
        // Theme Options for modifying how redoc renders them
        // theme: {
        //   // Change with your site colors
        //   primaryColor: '#1890ff',
        // },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: "StuStaPay",
      logo: {
        alt: "StuStaPay Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        // { to: "/blog", label: "Blog", position: "left" },
        {
          href: "https://github.com/stustapay/stustapay",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Get Started",
              to: "/docs/intro",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/stustapay/stustapay",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} StuStaPay Developers. Built with Docusaurus.`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

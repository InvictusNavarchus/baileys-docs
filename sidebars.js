/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        '01-introduction/README',
        '02-installation/README',
        '02-installation/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        '03-architecture/README',
        '03-architecture/socket-layers',
        '03-architecture/data-flow',
        '04-authentication/README',
        '04-authentication/session-management',
        '05-messages/README',
      ],
    },
    {
      type: 'category',
      label: 'Practical Guides',
      items: [
        '10-examples/basic-bot',
        '11-deployment/README',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        '13-api-reference/README',
        '14-troubleshooting/README',
        '15-faq/README',
      ],
    },
  ],
};

module.exports = sidebars;

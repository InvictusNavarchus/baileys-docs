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
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'introduction/introduction',
        'installation/README',
        'installation/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'architecture/README',
        'architecture/socket-layers',
        'architecture/data-flow',
        'authentication/README',
        'authentication/qr-code-auth',
        'authentication/pairing-code-auth',
        'authentication/session-management',
        'messages/README',
        'messages/message-types',
      ],
    },
    {
      type: 'category',
      label: 'Practical Guides',
      items: [
        'examples/basic-bot',
        'deployment/README',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'api-reference/README',
        'api-reference/socket-api',
        'api-reference/message-api',
        'api-reference/group-api',
        'api-reference/types',
        'troubleshooting/README',
        'troubleshooting/common-issues',
        'troubleshooting/debugging',
        'faq/README',
      ],
    },
  ],
};

module.exports = sidebars;

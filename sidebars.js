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
        '04-authentication/qr-code-auth',
        '04-authentication/pairing-code-auth',
        '05-messages/README',
        '05-messages/message-types',
        '05-messages/sending-messages',
        '05-messages/receiving-messages',
        '06-events/README',
        '06-events/event-types',
        '06-events/event-handling',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        '07-media/README',
        '07-media/uploading-media',
        '07-media/downloading-media',
        '07-media/media-types',
        '08-groups/README',
        '08-groups/group-operations',
        '08-groups/group-metadata',
        '08-groups/participants',
        '09-advanced/README',
        '09-advanced/business-features',
        '09-advanced/newsletters',
        '09-advanced/privacy-settings',
        '09-advanced/custom-functionality',
      ],
    },
    {
      type: 'category',
      label: 'Practical Guides',
      items: [
        '10-examples/README',
        '10-examples/basic-bot',
        '10-examples/media-bot',
        '10-examples/group-bot',
        '10-examples/business-bot',
        '11-deployment/README',
        '11-deployment/production-setup',
        '11-deployment/scaling',
        '11-deployment/monitoring',
        '12-best-practices/README',
        '12-best-practices/performance',
        '12-best-practices/security',
        '12-best-practices/error-handling',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        '13-api-reference/README',
        '13-api-reference/socket-api',
        '13-api-reference/message-api',
        '13-api-reference/group-api',
        '13-api-reference/media-api',
        '13-api-reference/types',
        '14-troubleshooting/README',
        '14-troubleshooting/common-issues',
        '14-troubleshooting/debugging',
        '15-faq/README',
      ],
    },
  ],
};

module.exports = sidebars;

import { HelpContent } from "./types";
import { helpLinkTargets } from "./targets";

export const helpContentEn: HelpContent = {
  sections: [
    {
      id: "navigation",
      title: "Getting started and navigation",
      summary: "How to move through the portal and switch between events and sections safely.",
      body: `
Use the tree navigation on the left as the starting point for all node- and event-specific work.

- Select the correct node or event first.
- The top bar contains global actions such as **Profile**, **Language**, **Logout**, and this **Guide**.
- Tabs inside a section only switch the subsection of the currently selected node.
- If you work on multiple events, always verify the highlighted node before changing data.
      `,
      links: [
        {
          label: "Open profile",
          description: "Review your own account data and UI preferences",
          to: helpLinkTargets.profile,
        },
        {
          label: "Open current event",
          description: "Jump to the overview of the current node",
          buildTo: helpLinkTargets.nodeOverview,
          requiresNodeContext: true,
        },
      ],
    },
    {
      id: "event-setup",
      title: "Events, nodes, and core settings",
      summary: "Manage master data, portal texts, payment settings, and the event structure.",
      body: `
The overview and settings pages are the main entry point for new events and structural changes.

1. Start with the **Overview** to understand the current state of the node.
2. Move to **Settings** to maintain general event data, email texts, FAQ, receipt, or customer-portal content.
3. Use **Statistics** when you need to confirm whether changes already affect bookings or visitor numbers.

Typical tasks in this area:

- creating a new event or child node
- maintaining event texts and legal pages
- reviewing SumUp, mail, or payout settings
- preparing DSFinV-K exports
      `,
      links: [
        {
          label: "Node overview",
          description: "Status, KPIs, and shortcuts for the current node",
          buildTo: helpLinkTargets.nodeOverview,
          requiresNodeContext: true,
        },
        {
          label: "Node settings",
          description: "Edit general settings and event texts",
          buildTo: helpLinkTargets.nodeSettings,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Statistics",
          description: "Open KPIs, charts, and operational tables",
          buildTo: helpLinkTargets.nodeStats,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "DSFinV-K export",
          description: "Open the export used for audits or accounting",
          buildTo: helpLinkTargets.dsfinvk,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "users-and-rights",
      title: "Users, roles, and permissions",
      summary: "Manage user accounts, permission roles, and assignments per node.",
      body: `
This area controls who can work in the portal and which workflows are visible.

- **Users** represent real portal accounts.
- **Roles** bundle privileges for operational responsibilities.
- **User to roles** assigns those roles at node level.

Recommended flow for new team members:

1. Create or review the user account.
2. Select or create the correct role.
3. Assign the role at the correct node.
4. Verify in the target event that only the intended sections are visible.
      `,
      links: [
        {
          label: "Users",
          description: "Create, edit, and inspect portal accounts",
          buildTo: helpLinkTargets.users,
          requiresNodeContext: true,
        },
        {
          label: "Roles",
          description: "Maintain reusable permission roles",
          buildTo: helpLinkTargets.userRoles,
          requiresNodeContext: true,
        },
        {
          label: "User to roles",
          description: "Assign roles at the current node",
          buildTo: helpLinkTargets.userAssignments,
          requiresNodeContext: true,
        },
      ],
    },
    {
      id: "products-and-tickets",
      title: "Products, tickets, and pricing",
      summary: "Maintain sellable items, ticket types, and tax setup.",
      body: `
Use these sections for everything that can be sold or validated at tills, entry points, or the customer portal.

- **Products** cover regular sales items and top-up flows.
- **Tickets** are used for entry logic and ticket sales.
- **Tax rates** should be prepared before maintaining products and tickets.

Practical workflow:

1. Review or create tax rates.
2. Maintain products and prices.
3. Check tickets and restrictions.
4. Validate the setup in till layouts or entry areas afterwards.
      `,
      links: [
        {
          label: "Products",
          description: "Maintain sale items and prices",
          buildTo: helpLinkTargets.products,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Tickets",
          description: "Maintain ticket types and entry rules",
          buildTo: helpLinkTargets.tickets,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Tax rates",
          description: "Maintain tax logic for products and tickets",
          buildTo: helpLinkTargets.taxRates,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "customers-and-tags",
      title: "Customers, accounts, and user tags",
      summary: "Handle balances, customer support, NFC tags, and account mapping.",
      body: `
These sections are especially important for operational support during the event.

- **Customers** gives you balances, bookings, and payout-related details.
- **Accounts** is the right place for account search and balance operations.
- **User tags** manages wristbands, cards, CSV imports, and tag secrets.

Typical use cases:

- search for a visitor account or tag
- check or move balance
- import new tag batches
- trace missing account assignments
      `,
      links: [
        {
          label: "Customers",
          description: "Open customer overview and detail pages",
          buildTo: helpLinkTargets.customers,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Accounts",
          description: "Search accounts and manage balances",
          buildTo: helpLinkTargets.accounts,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "User tags",
          description: "Search tags, import data, and maintain secrets",
          buildTo: helpLinkTargets.userTags,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "terminals-and-tills",
      title: "Terminals, tills, and layouts",
      summary: "Configure devices, till profiles, layouts, and cash handling.",
      body: `
Use these pages to prepare the operational sales setup.

- **Terminals** represent physical devices.
- **Tills** represent the POS setup used during the event.
- **Till profiles** and **till layouts** define behavior and UI structure.
- **Cash registers** and **stockings** support cash-drawer workflows.

Recommended order for new setups:

1. create the terminal and till
2. define the profile and layout
3. validate buttons and products
4. prepare cash registers and stockings
5. test the setup on a real device

Recommended workflow for **product -> layout -> profile -> till**:

1. create or update the product
2. verify in the till layout that the product button is visible in the correct place
3. confirm which till profile uses that layout, or should use it
4. assign the correct profile to the target till
5. open the till on a terminal and run a real test sale
      `,
      links: [
        {
          label: "Terminals",
          description: "Maintain and inspect devices",
          buildTo: helpLinkTargets.terminals,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Tills",
          description: "Open POS tills and their details",
          buildTo: helpLinkTargets.tills,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Till profiles",
          description: "Maintain default behavior for tills",
          buildTo: helpLinkTargets.tillProfiles,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Till layouts",
          description: "Adjust pages, buttons, and layout structure",
          buildTo: helpLinkTargets.tillLayouts,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Cash registers",
          description: "Manage cash drawers and assignments",
          buildTo: helpLinkTargets.cashRegisters,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "operations-and-finance",
      title: "Orders, payouts, statistics, and exports",
      summary: "Use these areas for monitoring, support, and end-of-event finance work.",
      body: `
This is where the most important operational control processes come together during live operation and closing.

- **Statistics** shows revenue, quantity, and forecast data.
- **Payouts** bundles payout runs and pending refunds.
- **DSFinV-K** supports fiscal exports.
- Order and transaction details are usually opened from statistics, customer flows, or cashier workflows.

For operational troubleshooting it is usually best to start from statistics or customer detail pages and drill down from there.
      `,
      links: [
        {
          label: "Statistics",
          description: "Open live KPIs, charts, and tables",
          buildTo: helpLinkTargets.nodeStats,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Payout runs",
          description: "Manage payout processes and exports",
          buildTo: helpLinkTargets.payouts,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "DSFinV-K export",
          description: "Open fiscal export workflows",
          buildTo: helpLinkTargets.dsfinvk,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
    {
      id: "integrations-and-entry",
      title: "Entry, TSE, SumUp, and integrations",
      summary: "Use these sections for access control, fiscalization, device management, and payment integrations.",
      body: `
These sections matter whenever hardware, external services, or admission workflows are involved.

- **Entry** manages areas, groups, and logs for access control.
- **TSE** manages fiscal devices and technical security equipment.
- **SumUp** shows transactions and checkouts if enabled for the event.
- **Headwind / MDM** helps manage Android devices and their status.

When something behaves unexpectedly, first verify that you are in the correct event and that the integration is actually enabled there.

Recommended **entry workflow**:

1. verify tickets and product logic so the correct admission rights exist
2. create entry areas and assign the intended groups or rules
3. assign entry scanners or terminals to the correct event and area
4. run one test scan with a valid ticket and one with an invalid ticket
5. review the entry logs afterwards to confirm allows and denials
      `,
      links: [
        {
          label: "Entry areas",
          description: "Maintain admission areas and groups",
          buildTo: helpLinkTargets.entryAreas,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Entry logs",
          description: "Inspect admission events and error cases",
          buildTo: helpLinkTargets.entryLogs,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "TSE",
          description: "Manage fiscalization devices",
          buildTo: helpLinkTargets.tses,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "SumUp",
          description: "Review payment integration and transactions",
          buildTo: helpLinkTargets.sumup,
          requiresNodeContext: true,
          context: "event",
        },
        {
          label: "Headwind / MDM",
          description: "Manage Android terminals and device health",
          buildTo: helpLinkTargets.mdm,
          requiresNodeContext: true,
          context: "event",
        },
      ],
    },
  ],
};

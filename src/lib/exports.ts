import type { NavItemType } from "@/components/ui/navigation-menu"
import {
  AudioLinesIcon,
  BookOpen,
  Computer,
  FileText,
  FlaskConical,
  FrameIcon,
  GalleryVerticalEndIcon,
  Github,
  GlobeIcon,
  HelpCircle,
  LayoutDashboard,
  Linkedin,
  Lock,
  MessageCircle,
  Palette,
  PlugIcon,
  Rocket,
  ScrollText,
  SendIcon,
  Settings2Icon,
  ShieldCheck,
  TableProperties,
  TerminalIcon,
  TerminalSquareIcon,
  Twitter,
  Video,
} from "lucide-react"
import { ROUTES } from "@/routes/routeConstants"
import { PERMISSIONS } from "@/lib/permissions"
import i18n from "@/config/i18n"
const t = i18n.t
export const logo = "../logo.png"
export const userImg = "../user.png"
export const APP_NAME = import.meta.env.VITE_APP_NAME as string

// Everything below down to `teams` is placeholder content for the landing
// page (nav links, footer links, team names) describing this template
// itself — replace or remove it before shipping a real product.
export const productLinks: NavItemType[] = [
  {
    title: "Authentication",
    href: "#",
    description:
      "JWT or session auth with automatic token refresh, wired in from the start.",
    icon: Lock,
  },
  {
    title: "Role & Permission Access",
    href: "#",
    description:
      "Route guards and component HOCs for coarse roles and fine-grained permissions.",
    icon: ShieldCheck,
  },
  {
    title: "Dashboard Layout",
    href: "#",
    description:
      "A responsive shell with navigation, theming, and route-level progress feedback.",
    icon: LayoutDashboard,
  },
  {
    title: "Data Tables",
    href: "#",
    icon: TableProperties,
  },
  {
    title: "Internationalization",
    href: "#",
    icon: GlobeIcon,
  },
  {
    title: "GraphQL Data Layer",
    href: "#",
    icon: PlugIcon,
  },
  {
    title: "Theming",
    href: "#",
    icon: Palette,
  },
  {
    title: "Testing",
    href: "#",
    icon: FlaskConical,
  },
]

export const companyLinks: NavItemType[] = [
  {
    title: "Getting Started",
    href: "#",
    description:
      "Clone the template, set your environment variables, and start the dev server.",
    icon: Rocket,
  },
  {
    title: "Documentation",
    href: "#",
    description:
      "Architecture, routing, and auth conventions used throughout the template.",
    icon: BookOpen,
  },
  {
    title: "GitHub Repository",
    href: "#",
    icon: Github,
  },
  {
    title: "Changelog",
    href: "#",
    icon: ScrollText,
  },
  {
    title: "License",
    href: "#",
    icon: FileText,
  },
  {
    title: "Report an Issue",
    href: "#",
    icon: HelpCircle,
  },
  {
    title: "Discussions",
    href: "#",
    icon: MessageCircle,
  },
]

export const footerDetails = {
  foterLinks: [
    {
      linkTitle: "Template",
      linkDetails: [
        { name: "Features", url: "#" },
        {
          name: "Data Tables",
          url: "#",
        },
        {
          name: "Theming",
          url: "#",
        },
      ],
    },
    {
      linkTitle: "Resources",
      linkDetails: [
        { name: "Getting Started", url: "#" },
        {
          name: "Documentation",
          url: "#",
        },
        {
          name: "Changelog",
          url: "#",
        },
        {
          name: "GitHub Repository",
          url: "#",
        },
      ],
    },
    {
      linkTitle: "Community",
      linkDetails: [
        { name: "Discussions", url: "#" },
        {
          name: "Report an Issue",
          url: "#",
        },
        {
          name: "License",
          url: "#",
        },
      ],
    },
  ],
  footerSocialMedia: [
    {
      name: "github",
      active: true,
      url: "#",
      icon: Github,
      color: "text-primary",
    },
    {
      name: "twitter",
      active: true,
      url: "#",
      icon: Twitter,
      color: "text-blue-600",
    },
    {
      name: "linkedin",
      active: true,
      url: "#",
      icon: Linkedin,
      color: "text-primary",
    },
  ],
  footerParagraph:
    "A production-ready React, Vite, and TypeScript frontend template — authentication, RBAC, and dashboards built in, so you can start on your product instead of your boilerplate.",
}

// App sidebar
export const teams = [
  {
    name: "Acme Inc",
    logo: GalleryVerticalEndIcon,
    plan: "Enterprise",
  },
  {
    name: "Acme Corp.",
    logo: AudioLinesIcon,
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: TerminalIcon,
    plan: "Free",
  },
]

export type NavSubItem = {
  id: string
  title: () => string
  url: string
  /** Hidden from the sidebar unless the user holds every listed permission (admin bypasses). */
  requiredPermissions?: string[]
}

export type NavMainItem = {
  id: string
  title: () => string
  url: string
  icon?: any
  isActive?: boolean
  requiredPermissions?: string[]
  items?: NavSubItem[]
}

export const navMain: NavMainItem[] = [
  {
    id: "dashboard",
    title: () => t("dashboards.navMain.dashboard.title"),
    url: "#",
    icon: TerminalSquareIcon,
    isActive: true,
    items: [
      {
        id: "dashboard-home",
        title: () => t("dashboards.navMain.dashboard.home"),
        url: ROUTES.DASHBOARD,
      },
      {
        id: "dashboard-users",
        title: () => t("dashboards.navMain.dashboard.users"),
        url: ROUTES.USERS,
        requiredPermissions: [PERMISSIONS.USERS.READ],
      },
      {
        id: "dashboard-analytics",
        title: () => t("dashboards.navMain.dashboard.analytics"),
        url: ROUTES.VISITORS,
        requiredPermissions: [PERMISSIONS.ANALYTICS.READ],
      },
    ],
  },

  {
    id: "settings",
    title: () => t("dashboards.navMain.settings.title"),
    url: "#",
    icon: Settings2Icon,
    items: [
      {
        id: "settings-account",
        title: () => t("dashboards.navMain.settings.my_account"),
        url: ROUTES.SETTINGS,
      },
    ],
  },
  {
    id: "newsletter",
    title: () => t("dashboards.navMain.newsletter.title"),
    url: "#",
    icon: SendIcon,
    items: [
      {
        id: "newsletter-campaigns",
        title: () => t("dashboards.navMain.newsletter.campaigns"),
        url: ROUTES.CAMPAIGNS,
        requiredPermissions: [PERMISSIONS.CAMPAIGNS.READ],
      },
      {
        id: "newsletter-subscribers",
        title: () => t("dashboards.navMain.newsletter.subscribers"),
        url: ROUTES.SUBSCRIBERS,
        requiredPermissions: [PERMISSIONS.NEWSLETTER.READ],
      },
      {
        id: "newsletter-visitors",
        title: () => t("dashboards.navMain.newsletter.visitors"),
        url: ROUTES.VISITORS,
        requiredPermissions: [PERMISSIONS.ANALYTICS.READ],
      },
    ],
  },
  {
    id: "role-permissions",
    title: () => t("dashboards.navMain.role_permissions.title"),
    url: "#",
    icon: Settings2Icon,
    items: [
      {
        id: "roles",
        title: () => t("dashboards.navMain.role_permissions.roles"),
        url: ROUTES.ROLES,
        requiredPermissions: [PERMISSIONS.ROLES.READ],
      },
      {
        id: "permissions",
        title: () => t("dashboards.navMain.role_permissions.permissions"),
        url: `${ROUTES.ROLES}?tab=permissions`,
        requiredPermissions: [
          PERMISSIONS.ROLES.READ,
          PERMISSIONS.PERMISSIONS.READ,
        ],
      },
    ],
  },
]

// Demo secondary-nav section ("Departments") — placeholder links showing the
// sidebar pattern; replace with real sections or remove.
export const navSubmain: {
  name: () => string
  url: string
  icon: any
}[] = [
  {
    name: () => t("dashboards.subMain.design"),
    url: "#",
    icon: FrameIcon,
  },
  {
    name: () => t("dashboards.subMain.software"),
    url: "#",
    icon: Computer,
  },
  {
    name: () => t("dashboards.subMain.multimedia"),
    url: "#",
    icon: Video,
  },
]

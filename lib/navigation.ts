import {
  Bot,
  BrainCircuit,
  FolderKanban,
  LayoutDashboard,
  Radar,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** 侧边栏主导航分组（唯一来源，TopBar / CommandPalette 均引用） */
export const navGroups: NavGroup[] = [
  {
    label: "概览",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "工作区运行状态总览",
      },
      {
        title: "Projects",
        href: "/projects",
        icon: FolderKanban,
        description: "按项目组织智能体与任务",
      },
    ],
  },
  {
    label: "智能体",
    items: [
      {
        title: "Agents",
        href: "/agents",
        icon: Bot,
        description: "创建与配置智能体",
      },
    ],
  },
  {
    label: "本地资源",
    items: [
      {
        title: "Local Resources",
        href: "/resources",
        icon: Radar,
        description: "发现并索引本机 AI Harness 资源",
      },
      {
        title: "Resource Capabilities",
        href: "/resources/capabilities",
        icon: BrainCircuit,
        description: "从真实资源归纳的能力索引与任务匹配",
      },
      {
        title: "Task Intelligence",
        href: "/task-intelligence",
        icon: Workflow,
        description: "任务理解与能力编排：拆解、检索与推荐",
      },
    ],
  },
];

/** 底部导航（设置），视觉上与主导航分离 */
export const footerNav: NavItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
  description: "工作区与模型设置",
};

export const allNavItems: NavItem[] = [
  ...navGroups.flatMap((group) => group.items),
  footerNav,
];

/** 当前路由是否为该导航项激活态 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/dashboard") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Workspace",
  description: "构建、装配与治理你的 AI 智能体 — 现代化 AI SaaS 工作台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`dark ${GeistSans.variable} ${GeistMono.variable} antialiased`}
    >
      <body className="min-h-svh bg-background text-foreground">
        {/* 主题防闪烁：hydration 前从 localStorage 恢复 data-theme（仅 UI 偏好） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("aiw-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}

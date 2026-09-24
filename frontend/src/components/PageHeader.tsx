import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppShellRowSlots } from "../layout/appShellRowSlots";
import { Tabs } from "./Tabs";
import "./PageHeader.css";

interface ChapterTab {
  key: string;
  label: string;
  icon: ReactNode;
  content?: ReactNode;
}

interface ChapterMarker {
  label: string;
  icon: ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  chapterTabs?: ChapterTab[];
  chapterMarker?: ChapterMarker;
  activeTab?: string;
  onTabSelect?: (key: string) => void;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  chapterTabs,
  chapterMarker,
  activeTab,
  onTabSelect,
  actions,
}: PageHeaderProps) {
  const { identitySlot, tabsSlot } = useAppShellRowSlots();
  const pageHeaderMain = (
    <div className="page-header-main">
      <div className="page-header-titles">
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
  const pageHeaderTabs = chapterTabs && chapterTabs.length > 0 && (
    <Tabs
      ariaLabel="Content sections"
      className="page-header-tabs-root"
      navigationClassName="page-header-tabs"
      tabListContainer={tabsSlot}
      tabs={chapterTabs.map((tab) => ({
        id: tab.key,
        label: (
          <>
            {tab.icon}
            <span>{tab.label}</span>
          </>
        ),
        content: tab.content,
      }))}
      selectedId={activeTab}
      onSelectedIdChange={onTabSelect}
    />
  );
  const pageHeaderMarker = chapterMarker && (
    <div className="page-header-tabs page-header-tabs--static">
      <span className="page-header-tab page-header-tab--active page-header-tab--static">
        {chapterMarker.icon}
        <span>{chapterMarker.label}</span>
      </span>
    </div>
  );
  const pageHeaderNavigation =
    pageHeaderTabs ||
    (tabsSlot && pageHeaderMarker ? createPortal(pageHeaderMarker, tabsSlot) : pageHeaderMarker);

  if (identitySlot || tabsSlot) {
    return (
      <>
        {identitySlot ? createPortal(pageHeaderMain, identitySlot) : pageHeaderMain}
        {pageHeaderNavigation}
      </>
    );
  }

  return (
    <header className="page-header">
      {pageHeaderMain}
      {pageHeaderNavigation}
    </header>
  );
}

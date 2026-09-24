import { useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { SplitPane } from "./SplitPane";
import "./BrowserLayout.css";

interface BrowserLayoutProps {
  title: string;
  actions?: ReactNode;
  error?: string | null;
  list: ReactNode;
  detail: ReactNode;
  editor?: ReactNode;
  dialog?: ReactNode;
  listLabel?: string;
  chapterIcon?: ReactNode;
  detailOpen?: boolean;
  listCollapsible?: boolean;
}

export function BrowserLayout({
  title,
  actions,
  error,
  list,
  detail,
  editor,
  dialog,
  listLabel,
  chapterIcon,
  detailOpen = false,
  listCollapsible = false,
}: BrowserLayoutProps) {
  const resolvedListLabel = listLabel || `${title} list`;
  const [detailRequested, setDetailRequested] = useState(false);
  const showConstrainedDetail = detailOpen && detailRequested;

  return (
    <div className={`browser-layout ${showConstrainedDetail ? "browser-layout--detail-open" : ""}`}>
      <PageHeader
        title={title}
        actions={actions}
        chapterMarker={chapterIcon ? { label: title, icon: chapterIcon } : undefined}
      />

      {error && (
        <p className="browser-layout-error" role="alert">
          {error}
        </p>
      )}

      <div className="browser-layout-split">
        <SplitPane
          leftLabel={resolvedListLabel}
          left={
            <div
              onClickCapture={(event) => {
                if ((event.target as HTMLElement).closest(".search-list-item"))
                  setDetailRequested(true);
              }}
            >
              {list}
            </div>
          }
          right={
            <div
              onClickCapture={(event) => {
                if (!(event.target as HTMLElement).closest(".browser-layout-back")) return;
                event.stopPropagation();
                setDetailRequested(false);
              }}
            >
              {detail}
            </div>
          }
          collapsible={listCollapsible}
        />
      </div>

      {editor}
      {dialog}
    </div>
  );
}

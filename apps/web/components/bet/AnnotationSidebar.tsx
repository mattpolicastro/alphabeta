import type { ReactNode } from "react";

type AnnotationSidebarProps = {
  moment: ReactNode;
  body: ReactNode;
  path?: ReactNode;
  margin?: ReactNode;
};

export function AnnotationSidebar({
  moment,
  body,
  path,
  margin,
}: AnnotationSidebarProps) {
  return (
    <aside className="annot" role="complementary" aria-label="Discipline layer">
      <div className="moment">{moment}</div>
      <div>{body}</div>
      {path && <div className="pathline">{path}</div>}
      {margin && <p className="margin-note">{margin}</p>}
    </aside>
  );
}

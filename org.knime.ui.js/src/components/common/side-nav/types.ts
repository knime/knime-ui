export type SidebarNavItem<TMetadata = any> = {
  id: string;
  text: string;
  icon?: any;
  hoverable?: boolean;
  active?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  children?: Array<Omit<SidebarNavItem<TMetadata>, "children" | "hoverable">>;
  metadata?: TMetadata;
};

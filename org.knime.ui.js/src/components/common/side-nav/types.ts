export type NavMenuItem<TMetadata = any> = {
  id: string;
  text: string;
  active?: boolean;
  href?: string;
  onClick?: (
    event: MouseEvent | KeyboardEvent,
    item: NavMenuItem<TMetadata>,
  ) => void;
  metadata?: TMetadata;
};

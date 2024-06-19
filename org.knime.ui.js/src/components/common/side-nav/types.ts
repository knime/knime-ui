export type NavMenuItemProps = {
  /**
   * Text displayed in the nav menu item
   */
  text: string;
  /**
   * Sets the text color to the active color
   */
  active?: boolean;
  /**
   * Acts as a link to the provide value. When this is not set
   * it will not navigate anywhere but you still receive a click event
   */
  href?: string | null;
  /**
   * Displays the indicator to the left of the item
   */
  withIndicator?: boolean;
  /**
   * Adds the highlighted background to the item
   */
  highlighted?: boolean;
};

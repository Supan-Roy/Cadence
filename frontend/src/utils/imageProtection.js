export const imageProtectionProps = {
  draggable: false,
  onContextMenu: (event) => event.preventDefault(),
  style: {
    WebkitUserDrag: 'none',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
  },
}

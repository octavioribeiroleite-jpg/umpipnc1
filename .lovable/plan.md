

# Fix: Content Overflowing Screen on Mobile

## Problem
The screenshot shows content clipping on the left side of the Drawer on mobile. Two root causes:

1. **ResponsiveDialogContent** (line 110): On mobile, wraps children in `max-w-md px-4` which is fine for width, but the inner components (like RegistroReuniaoEditor's Card) have flex layouts that don't wrap and overflow horizontally.
2. **RegistroReuniaoEditor** CardHeader: The title + badge row uses `flex justify-between` without wrapping, causing horizontal overflow on narrow screens.
3. **Drawer height**: No max-height set, so tall content can push buttons off-screen.

## Changes

### 1. `src/components/ui/responsive-dialog.tsx`
- Change the mobile DrawerContent wrapper from `max-w-md` to `w-full` and add `overflow-y-auto max-h-[85vh]` so content scrolls within the drawer instead of overflowing.

### 2. `src/components/reunioes/RegistroReuniaoEditor.tsx`
- Make the CardHeader flex layout wrap on small screens (`flex-wrap`) so the title and badge stack instead of overflowing.
- Reduce the textarea `min-h` from `400px` to `250px` on mobile to fit better in the drawer.

### 3. `src/index.css`
- Add `overflow-x: hidden` to `body` as a safety net to prevent any horizontal scroll across the app.

### 4. `src/pages/ReuniaoDetalhe.tsx`
- Remove `max-w-4xl max-h-[90vh] overflow-y-auto` from ResponsiveDialogContent className since the responsive-dialog component itself will handle sizing per device.


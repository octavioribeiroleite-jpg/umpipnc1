// Keep one dialog tree at every viewport width so editors, focus and pending
// requests survive resizing. DialogContent handles mobile width and scrolling.
export {
  Dialog as ResponsiveDialog,
  DialogTrigger as ResponsiveDialogTrigger,
  DialogContent as ResponsiveDialogContent,
  DialogHeader as ResponsiveDialogHeader,
  DialogTitle as ResponsiveDialogTitle,
  DialogDescription as ResponsiveDialogDescription,
  DialogClose as ResponsiveDialogClose,
} from '@/components/ui/dialog';

import {
  Activity,
  ArrowLeft,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Circle,
  Command,
  LoaderCircle,
  Network,
  Moon,
  Search,
  Sparkles,
  Target,
  Sun,
  Users,
  X,
} from "lucide-react";

/**
 * Semantic icon registry. Use these intent names in components instead of
 * importing arbitrary icons, keeping Genesis iconography coherent.
 */
export const icons = {
  activity: Activity,
  alert: CircleAlert,
  approve: Check,
  back: ArrowLeft,
  complete: CheckCircle2,
  close: X,
  command: Command,
  continue: ChevronRight,
  department: Building2,
  loading: LoaderCircle,
  mission: Target,
  network: Network,
  notification: Bell,
  organization: Sparkles,
  pending: Circle,
  search: Search,
  team: Users,
  themeDark: Moon,
  themeLight: Sun,
} as const;

export type IconName = keyof typeof icons;

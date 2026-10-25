import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, Terminal, X } from "lucide-react";

const alertVariants = cva(
  "relative flex items-start gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:size-4 [&>svg]:mt-0.5",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/30 bg-destructive/5 text-destructive-foreground",
        success: "border-success/30 bg-success/10 text-success-foreground",
        warning: "border-warning/30 bg-warning/10 text-warning-foreground",
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  children?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  action?: React.ReactNode;
}

const alertIcons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, title, children, closable, onClose, action, ...props }, ref) => {
    const Icon = alertIcons[variant ?? "default"];

    return (
      <div
        ref={ref}
        className={cn(alertVariants({ variant }), className)}
        role={variant === "destructive" ? "alert" : "status"}
        {...props}
      >
        <Icon className="shrink-0" />
        <div className="flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children}
        </div>
        {action && <div>{action}</div>}
        {closable && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 opacity-50 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

export { Alert, alertVariants };

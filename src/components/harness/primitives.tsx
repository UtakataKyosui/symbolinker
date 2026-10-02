import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {eyebrow}
          <span className="status-dot" />
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}
export function Status({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "amber" | "muted";
}) {
  return (
    <Badge variant="outline" className={`status status-${tone}`}>
      {children}
    </Badge>
  );
}
export function Panel({
  title,
  icon,
  extra,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>
          {icon}
          {title}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}
export function Picker({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Metric({
  title,
  icon,
  value,
  suffix,
  badge,
  note,
  trend,
  compact = false,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  suffix?: string;
  badge?: string;
  note: string;
  trend: "cyan" | "amber" | "blue";
  compact?: boolean;
}) {
  return (
    <section className={`metric metric-${trend}`}>
      <div className="metric-label">
        <span>
          {icon}
          {title}
        </span>
        {badge && <Status tone={trend === "amber" ? "amber" : "cyan"}>{badge}</Status>}
      </div>
      <div className={`metric-value ${compact ? "metric-compact" : ""}`}>
        {value}
        <span>{suffix}</span>
      </div>
      <div className="metric-note">{note}</div>
      <div className="sparkline" aria-hidden="true">
        <svg viewBox="0 0 240 24" preserveAspectRatio="none">
          <path
            d={
              trend === "amber"
                ? "M0 20 L25 20 L25 9 L56 9 L56 16 L90 16 L90 11 L130 11 L130 18 L170 18 L170 7 L205 7 L205 12 L240 12"
                : "M0 21 L22 21 L38 15 L60 15 L76 18 L96 9 L120 9 L144 13 L168 4 L192 7 L213 2 L240 2"
            }
          />
        </svg>
      </div>
    </section>
  );
}

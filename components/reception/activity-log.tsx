"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLogs } from "@/hooks/use-hospital"
import { Clock } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

function useFormatTimeAgo() {
  const { t } = useTranslation()
  return (date: Date): string => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return t("common.justNow")
    if (minutes < 60) return t("common.mAgo", { m: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t("common.hAgo", { h: hours })
    return t("common.dAgo", { d: Math.floor(hours / 24) })
  }
}

export function ActivityLog() {
  const logs = useLogs()
  const { t } = useTranslation()
  const formatTimeAgo = useFormatTimeAgo()

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          {t("actLog.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          <div className="flex flex-col gap-3">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border/40 p-3">
                <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{log.action}</p>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">{formatTimeAgo(log.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{log.details}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground/70">{t("common.by", { actor: log.actor })}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { FieldLabel } from "@/components/ui/field"
import {
  fetchNewsletterSubscription,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
} from "@/services/account"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const NotificationsTab = () => {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const { t } = useTranslation()
  useEffect(() => {
    async function load() {
      try {
        const sub = await fetchNewsletterSubscription()
        setIsSubscribed(sub !== null)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `${t("general_error")}`
        )
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [t])

  async function handleToggle(checked: boolean) {
    setIsToggling(true)
    try {
      if (checked) {
        const res = await subscribeToNewsletter()
        toast.success(res.subscribeToNewsletter.message)
      } else {
        const res = await unsubscribeFromNewsletter()
        toast.success(res.unsubscribeFromNewsletter.message)
      }
      setIsSubscribed(checked)
    } catch (err: any) {
      toast.error(err.errors[0].message)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.notification")}</CardTitle>
        <CardDescription>
          {t("notification.notification_mesage")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <FieldLabel>{t("notification.news_letter")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {t("notification.news_letter_message")}
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading || isToggling}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <FieldLabel>{t("notification.email_notification")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {t("notification.email_notification_message")}
              </p>
            </div>
            <Switch checked={true} disabled />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <FieldLabel>{t("notification.push_notifiction")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {t("notification.push_notifiction_message")}
              </p>
            </div>
            <Switch checked={false} disabled />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default NotificationsTab

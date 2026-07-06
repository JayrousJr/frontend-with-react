import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { APP_NAME, footerDetails, logo } from "@/lib/exports"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/routes/routeConstants"
import { subscribeToNewsletter } from "@/services/account"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"

const Footer = () => {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const handleNewsLetterSubscription = async () => {
    try {
      const res = await subscribeToNewsletter()
      toast.success(res.subscribeToNewsletter?.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("general_error"))
    }
  }
  return (
    <div className="px-4 pt-20">
      <footer className="mx-auto w-full overflow-hidden px-4 pt-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:gap-12 lg:grid-cols-6">
          <div className="space-y-6 lg:col-span-3">
            <Link to={ROUTES.HOME} className="flex items-center gap-4">
              <img src={logo} className="w-12" />{" "}
              <span className="text-2xl font-black">{APP_NAME}</span>
            </Link>
            <p className="max-w-96 text-sm/6">
              {footerDetails.footerParagraph}
            </p>
            <div className="order-1 flex gap-5 md:order-2 md:gap-6">
              {footerDetails.footerSocialMedia
                .filter((item) => item.active)
                .map((media) => (
                  <Link
                    key={media.name}
                    to={media.url}
                    className="hover:text-muted-foreground"
                  >
                    <media.icon className={cn("h-6 w-6", media.color)} />
                  </Link>
                ))}
            </div>
            <div className={cn(isAuthenticated ? "block" : "hidden")}>
              <Button onClick={handleNewsLetterSubscription}>
                {t("footer.newsletter_subscription")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 items-start gap-8 md:grid-cols-3 md:gap-12 lg:col-span-3 lg:gap-28">
            {footerDetails.foterLinks.map((item) => (
              <div key={item.linkTitle}>
                <h3 className="mb-4 font-semibold md:mb-6">{item.linkTitle}</h3>

                <ul className="space-y-3 text-sm text-white/70 md:space-y-4">
                  {item.linkDetails.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.url}
                        className="text-primary hover:text-muted-foreground"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto my-12 flex max-w-7xl items-center justify-between border-t border-border pt-4">
          <p className="text-xs sm:text-sm">
            ©
            {t("footer.maker_message", {
              year: new Date().getFullYear(),
              company: APP_NAME,
            })}{" "}
          </p>
          <p className="text-sm">{t("footer.right_reserved_message")}</p>
        </div>
      </footer>
    </div>
  )
}

export default Footer

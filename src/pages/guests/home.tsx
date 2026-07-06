import CtaSectionWithGallery from "@/components/blocks/cta-section-with-gallery"
import { Component as FeatureSection } from "@/components/ui/feature-section"
import HeroComponent from "@/components/ui/hero-component"
import { useAuth } from "@/context/auth-context"
import { ROUTES } from "@/routes/routeConstants"
import {
  Globe,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  TableProperties,
  Zap,
} from "lucide-react"
import { useTranslation } from "react-i18next"

const Home = () => {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const primaryAction = isAuthenticated
    ? { label: t("home.hero.go_to_dashboard"), href: ROUTES.DASHBOARD }
    : { label: t("home.hero.get_started"), href: ROUTES.REGISTER }
  const secondaryAction = isAuthenticated
    ? undefined
    : { label: t("home.hero.sign_in"), href: ROUTES.LOGIN }

  const ctaPrimary = isAuthenticated
    ? { label: t("home.hero.go_to_dashboard"), href: ROUTES.DASHBOARD }
    : { label: t("home.cta.get_started"), href: ROUTES.REGISTER }
  const ctaSecondary = isAuthenticated
    ? undefined
    : { label: t("home.cta.sign_in"), href: ROUTES.LOGIN }

  return (
    <div className="flex flex-col">
      <HeroComponent
        eyebrow={t("home.hero.eyebrow")}
        title={t("home.hero.title")}
        subtitle={t("home.hero.subtitle")}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />

      <FeatureSection
        title={t("home.features.title")}
        subtitle={t("home.features.subtitle")}
        features={[
          {
            icon: Lock,
            title: t("home.features.auth.title"),
            description: t("home.features.auth.description"),
            span: "wide",
          },
          {
            icon: ShieldCheck,
            title: t("home.features.rbac.title"),
            description: t("home.features.rbac.description"),
            span: "tall",
          },
          {
            icon: LayoutDashboard,
            title: t("home.features.dashboards.title"),
            description: t("home.features.dashboards.description"),
          },
          {
            icon: Globe,
            title: t("home.features.i18n.title"),
            description: t("home.features.i18n.description"),
          },
          {
            icon: TableProperties,
            title: t("home.features.data_tables.title"),
            description: t("home.features.data_tables.description"),
            span: "wide",
          },
          {
            icon: Zap,
            title: t("home.features.performance.title"),
            description: t("home.features.performance.description"),
          },
        ]}
      />

      <CtaSectionWithGallery
        title={t("home.cta.title")}
        subtitle={t("home.cta.subtitle")}
        primaryAction={ctaPrimary}
        secondaryAction={ctaSecondary}
      />
    </div>
  )
}

export default Home

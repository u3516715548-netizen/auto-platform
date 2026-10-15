"use client";

import { startTransition, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Script from "next/script";
import type { ConsentState, PublicMarketingRuntimeView } from "@auto-platform/types";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { StorefrontPageViewTracker } from "@/components/marketing/storefront-page-view-tracker";
import {
  DEFAULT_CONSENT_STATE,
  GOOGLE_CONSENT_DEFAULT_DENIED,
  resolveMarketingLoadPlan,
  toGoogleConsentMode,
} from "@/lib/consent/consent-state";
import {
  registerMarketingRuntimeView,
  setTrackingRuntimeSnapshot,
} from "@/lib/marketing/tracking-runtime-registry";

type Props = {
  tenantSlug: string;
  marketing: PublicMarketingRuntimeView;
  /** Server-parsed `ab_consent` — avoids a separate SSR banner node + DOM remove. */
  initialConsent?: ConsentState | null;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: { load: (id: string) => void; page: () => void };
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
  }
}

function ensureGtagStub(): void {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
}

function applyGoogleConsentDefault(): void {
  ensureGtagStub();
  window.gtag?.("consent", "default", {
    ...GOOGLE_CONSENT_DEFAULT_DENIED,
    wait_for_update: 500,
  });
}

function applyGoogleConsentUpdate(consent: ConsentState): void {
  ensureGtagStub();
  window.gtag?.("consent", "update", toGoogleConsentMode(consent));
}

/**
 * Consent Mode defaults + gated loaders for tenant storefront.
 * Also registers tracking runtime snapshot for Phase 5 event emitters.
 * Verification meta tags are server Metadata — not here.
 */
export function StorefrontMarketingRuntime({
  tenantSlug,
  marketing,
  initialConsent = null,
}: Props) {
  const [consent, setConsent] = useState<ConsentState>(
    () => initialConsent ?? DEFAULT_CONSENT_STATE,
  );
  const [defaultsReady, setDefaultsReady] = useState(false);

  useEffect(() => {
    registerMarketingRuntimeView(tenantSlug, marketing);
    applyGoogleConsentDefault();
    if (initialConsent) {
      setTrackingRuntimeSnapshot({ consent: initialConsent, tenantSlug });
      applyGoogleConsentUpdate(initialConsent);
    }
    // Defer so Consent Mode defaults apply before gated Script children mount.
    startTransition(() => {
      setDefaultsReady(true);
    });
  }, [tenantSlug, marketing, initialConsent]);

  const onConsentChange = useCallback((next: ConsentState) => {
    setConsent(next);
    setTrackingRuntimeSnapshot({ consent: next, tenantSlug });
    applyGoogleConsentUpdate(next);
  }, [tenantSlug]);

  const plan = useMemo(
    () =>
      resolveMarketingLoadPlan(consent, marketing.preferGtm, {
        gtmContainerId: marketing.gtmContainerId,
        ga4MeasurementId: marketing.ga4MeasurementId,
        googleAdsConversionId: marketing.googleAdsConversionId,
        metaPixelId: marketing.metaPixelId,
        tiktokPixelId: marketing.tiktokPixelId,
        linkedinPartnerId: marketing.linkedinPartnerId,
      }),
    [consent, marketing],
  );

  const showRuntime = defaultsReady;

  return (
    <>
      <Suspense fallback={null}>
        <StorefrontPageViewTracker />
      </Suspense>
      <ConsentBanner
        onConsentChange={onConsentChange}
        initialConsent={initialConsent}
      />

      {showRuntime && plan.loadGtm && marketing.gtmContainerId ? (
        <>
          <Script id="autobear-gtm-boot" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
          `}</Script>
          <Script
            id="autobear-gtm"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(marketing.gtmContainerId)}`}
          />
        </>
      ) : null}

      {showRuntime && plan.loadGa4Direct && marketing.ga4MeasurementId ? (
        <>
          <Script
            id="autobear-ga4-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(marketing.ga4MeasurementId)}`}
          />
          <Script id="autobear-ga4-config" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', ${JSON.stringify(marketing.ga4MeasurementId)}, { anonymize_ip: true });
          `}</Script>
        </>
      ) : null}

      {showRuntime && plan.loadGoogleAdsDirect && marketing.googleAdsConversionId ? (
        <>
          <Script
            id="autobear-ads-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(marketing.googleAdsConversionId)}`}
          />
          <Script id="autobear-ads-config" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', ${JSON.stringify(marketing.googleAdsConversionId)});
          `}</Script>
        </>
      ) : null}

      {showRuntime && plan.loadMeta && marketing.metaPixelId ? (
        <Script id="autobear-meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', ${JSON.stringify(marketing.metaPixelId)});
          fbq('track', 'PageView');
        `}</Script>
      ) : null}

      {showRuntime && plan.loadTiktok && marketing.tiktokPixelId ? (
        <Script id="autobear-tiktok-pixel" strategy="afterInteractive">{`
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
            ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
            ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
            for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
            ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
            ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
            ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");
            o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
            var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load(${JSON.stringify(marketing.tiktokPixelId)});
            ttq.page();
          }(window, document, 'ttq');
        `}</Script>
      ) : null}

      {showRuntime && plan.loadLinkedin && marketing.linkedinPartnerId ? (
        <Script id="autobear-linkedin-insight" strategy="afterInteractive">{`
          _linkedin_partner_id = ${JSON.stringify(marketing.linkedinPartnerId)};
          window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
          window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}
          var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");
          b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";
          s.parentNode.insertBefore(b,s);})(window.lintrk);
        `}</Script>
      ) : null}
    </>
  );
}

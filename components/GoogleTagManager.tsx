'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { ANALYTICS_CONFIG, isAllowedHostname } from '@/lib/analytics';

interface GoogleTagManagerProps {
  gtmId?: string;
}

export default function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
  const gtmIdToUse = gtmId || ANALYTICS_CONFIG.GTM_ID;
  const [hostnameAllowed, setHostnameAllowed] = useState(false);

  useEffect(() => {
    const allowed = isAllowedHostname();
    setHostnameAllowed(allowed);

    if (!allowed) {
      console.debug('Analytics blocked: hostname not in allowed list');
      return;
    }

    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js',
      });
    } catch (error) {
      console.debug('GTM initialization skipped:', error);
    }
  }, []);

  if (!hostnameAllowed) return null;

  return (
    <>
      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmIdToUse}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      {/* Google Tag Manager - Commented out due to 404 error */}
      {/* 
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmIdToUse}');
          `,
        }}
      />
      */}

      {/* Google Analytics 4 - Fallback if GTM fails */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.GA4_ID}`}
        strategy="afterInteractive"
        onError={() => {
          console.debug('GTM failed, loading GA4 directly');
        }}
      />

      <Script id="ga4-config" strategy="afterInteractive">
        {`
          try {
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ANALYTICS_CONFIG.GA4_ID}', {
              page_title: document.title || 'Unknown',
              page_location: window.location.href,
              send_page_view: true
            });
          } catch (error) {
            console.debug('GA4 config error:', error);
          }
        `}
      </Script>

      {/* Google Ads - Let GTM handle this instead of loading directly */}

      {/* Meta (Facebook) Pixel - Load with lazy strategy (primary) */}
      <Script id="meta-pixel" strategy="lazyOnload">
        {`
          try {
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${ANALYTICS_CONFIG.META_PIXEL_ID}');
            fbq('track', 'PageView');
          } catch (error) {
            console.debug('Meta Pixel error:', error);
          }
        `}
      </Script>

      {/* Meta Pixel Noscript (primary) */}
      <noscript>
        <img 
          height="1" 
          width="1" 
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${ANALYTICS_CONFIG.META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>

      {/* Meta (Facebook) Pixel - Additional Ads Pixel (optional) */}
      {ANALYTICS_CONFIG.META_PIXEL_ADS_ID && (
        <>
          <Script id="meta-pixel-ads" strategy="lazyOnload">
            {`
              try {
                if (typeof fbq === 'function') {
                  fbq('init', '${ANALYTICS_CONFIG.META_PIXEL_ADS_ID}');
                  fbq('track', 'PageView');
                }
              } catch (error) {
                console.debug('Meta Ads Pixel error:', error);
              }
            `}
          </Script>
          <noscript>
            <img 
              height="1" 
              width="1" 
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${ANALYTICS_CONFIG.META_PIXEL_ADS_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* X.com (Twitter) Pixel - Load with lazy strategy */}
      {ANALYTICS_CONFIG.X_PIXEL_ID !== 'XXXXXXXXXX' && (
        <Script id="x-pixel" strategy="lazyOnload">
          {`
            !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
            },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
            a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
            twq('config','${ANALYTICS_CONFIG.X_PIXEL_ID}');
          `}
        </Script>
      )}

      {/* Snapchat Pixel - Load with lazy strategy */}
      {ANALYTICS_CONFIG.SNAPCHAT_PIXEL_ID !== 'XXXXXXXXXX' && (
        <Script id="snapchat-pixel" strategy="lazyOnload">
          {`
            (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function() {
            a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
            a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
            r.src=n;var u=t.getElementsByTagName(s)[0];
            u.parentNode.insertBefore(r,u);})(window,document,
            'https://sc-static.net/scevent.min.js');
            snaptr('init', '${ANALYTICS_CONFIG.SNAPCHAT_PIXEL_ID}');
            snaptr('track', 'PAGE_VIEW');
          `}
        </Script>
      )}

      {/* TikTok Pixel - Load with lazy strategy */}
      {ANALYTICS_CONFIG.TIKTOK_PIXEL_ID !== 'XXXXXXXXXX' && (
        <Script id="tiktok-pixel" strategy="lazyOnload">
          {`
            !function (w, d, t) {
            if (w[t]) return;
            
            // Initialize ttq object
            w.ttq = w.ttq || [];
            
            ts = d.createElement(t);
            ts.async = true;
            ts.src = "https://analytics.tiktok.com/i18n/pixel/sdk.js?sdkid=" + '${ANALYTICS_CONFIG.TIKTOK_PIXEL_ID}';
            xi = d.getElementsByTagName(t)[0];
            xi.parentNode.insertBefore(ts, xi);
            w[t] = 1;
            
            // Wait for the script to load before tracking
            ts.onload = function() {
              // Add a small delay to ensure ttq is fully initialized
              setTimeout(function() {
                if (w.ttq && typeof w.ttq.track === 'function') {
                  try {
                    w.ttq.track('PageView');
                  } catch (error) {
                    console.warn('TikTok Pixel PageView tracking failed:', error);
                  }
                }
              }, 100);
            };
            
            // Fallback: if onload doesn't fire, try after a delay
            setTimeout(function() {
              if (w.ttq && typeof w.ttq.track === 'function') {
                try {
                  w.ttq.track('PageView');
                } catch (error) {
                  console.warn('TikTok Pixel PageView tracking failed (fallback):', error);
                }
              }
            }, 2000);
            
            }(window, document, 'script');
          `}
        </Script>
      )}
    </>
  );
}

// Declare global types for dataLayer
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    snaptr: (...args: any[]) => void;
    ttq: {
      track: (eventName: string, parameters?: Record<string, any>) => void;
    };
    twq: {
      track: (eventName: string, parameters?: Record<string, any>) => void;
    };
  }
} 
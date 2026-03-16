// Analytics Configuration for Legend Holding Group
// This file contains all tracking configurations for various platforms

// Allowed hostnames — analytics will only fire on these domains
export const ALLOWED_HOSTNAMES = [
  'legendholding.com',
  'www.legendholding.com',
  'legend-holding-website.vercel.app',
];

export const isAllowedHostname = (): boolean => {
  if (typeof window === 'undefined') return false;
  return ALLOWED_HOSTNAMES.some(
    (host) => window.location.hostname === host || window.location.hostname.endsWith('.' + host)
  );
};

export const ANALYTICS_CONFIG = {
  // Google Tag Manager
  GTM_ID: process.env.NEXT_PUBLIC_GTM_ID || 'GTM-K8GMBZG5',
  
  // Google Analytics 4 - Handled by GTM
  GA4_ID: process.env.NEXT_PUBLIC_GA4_ID || 'G-TFC4L94QL6',
  
  // Google Ads
  GOOGLE_ADS_ID: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-5088079446',
  
  // Meta (Facebook) Pixel (primary site pixel)
  META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID || '2991355601025019',
  // Meta (Facebook) Pixel for Ads (additional pixel)
  META_PIXEL_ADS_ID: process.env.NEXT_PUBLIC_META_PIXEL_ADS_ID || '24047128264987943',
  
  // X.com (Twitter) Pixel
  X_PIXEL_ID: process.env.NEXT_PUBLIC_X_PIXEL_ID || 'XXXXXXXXXX',
  
  // Snapchat Pixel
  SNAPCHAT_PIXEL_ID: process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID || '89a8f015-e28b-4075-83fe-ec5f12b27738',
  
  // TikTok Pixel
  TIKTOK_PIXEL_ID: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || 'D1D6VNBC77U8DLILDANG',
  
  // Google YouTube
  YOUTUBE_CHANNEL_ID: process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || 'UCY4V3u7xBMkBiXR5u_deryA',
} as const;

// Page names for analytics clarity
export const PAGE_NAMES = {
  // Main pages
  HOME: 'Home',
  ABOUT: 'About Us',
  CONTACT: 'Contact Us',
  CAREERS: 'Careers',
  NEWS: 'News',
  SITEMAP: 'Sitemap',
  PRIVACY_POLICY: 'Privacy Policy',
  COOKIE_POLICY: 'Cookie Policy',
  
  // Who We Are section
  WHO_WE_ARE: 'Who We Are',
  OUR_FOUNDATION: 'About Us',
  JOURNEY: 'Our Journey',
  THE_TEAM: 'The Team',
  
  // Our Brands section
  OUR_BRANDS: 'Our Brands',
  LEGEND_AUTOMOBILE_SERVICES: 'Legend Automobile Services',
  LEGEND_COMMERCIAL_VEHICLES: 'Legend Commercial Vehicles',
  LEGEND_GLOBAL_MEDIA: 'Legend Global Media',
  LEGEND_GREEN_ENERGY: 'Legend Green Energy',
  LEGEND_MOTORCYCLES: 'Legend Motorcycles',
  LEGEND_MOTORS_DEALERSHIP: 'Legend Motors Dealership',
  LEGEND_MOTORS_TRADING: 'Legend Motors Trading',
  LEGEND_AUTOHUB: 'Legend AutoHub',
  LEGEND_TECHNICAL_SERVICES: 'Legend Technical Services',
  LEGEND_TRAVEL: 'Legend Travel',
  LEGEND_WORLD_RENT_A_CAR: 'Legend World Rent-A-Car',
  ZUL_ENERGY: 'Zul Energy',
  
  // Careers section
  CAREERS_JOBS: 'Available Jobs',
  CAREERS_JOB_DETAIL: 'Job Details',
  CAREERS_THANK_YOU: 'Application Submitted',
  
  // News section
  NEWS_ARTICLE: 'News Article',
  
  // Admin section
  ADMIN_DASHBOARD: 'Admin Dashboard',
  ADMIN_JOBS: 'Admin Jobs',
  ADMIN_NEWS: 'Admin News',
  ADMIN_NEWSLETTERS: 'Admin Newsletters',
  ADMIN_SUBMISSIONS: 'Admin Submissions',
  ADMIN_APPLICATIONS: 'Admin Applications',
  ADMIN_SETTINGS: 'Admin Settings',
  ADMIN_LOGIN: 'Admin Login',
} as const;

// Helper function to check if TikTok Pixel is ready
const isTikTokPixelReady = (): boolean => {
  return typeof window !== 'undefined' && 
         window.ttq && 
         typeof window.ttq.track === 'function';
};

// Event tracking functions
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && isAllowedHostname()) {
    try {
      if (window.gtag) {
        window.gtag('event', eventName, parameters);
      }
    } catch (error) {
      console.debug('Google Analytics tracking failed:', error);
    }
    
    try {
      if (window.fbq) {
        window.fbq('track', eventName, parameters);
      }
    } catch (error) {
      console.debug('Meta Pixel tracking failed:', error);
    }
    
    try {
      if (window.snaptr) {
        window.snaptr('track', eventName, parameters);
      }
    } catch (error) {
      console.debug('Snapchat Pixel tracking failed:', error);
    }
    
    if (isTikTokPixelReady()) {
      try {
        window.ttq.track(eventName, parameters);
      } catch (error) {
        console.debug('TikTok Pixel tracking failed:', error);
      }
    }
  }
};

// Path prefixes that should not be tracked (backend/admin pages)
const ANALYTICS_EXCLUDED_PATH_PREFIXES = ['/admin', '/api'];

// Page view tracking (skips backend/admin paths)
export const trackPageView = (pageName: string, pagePath?: string) => {
  const currentPath = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '');
  const isExcluded = ANALYTICS_EXCLUDED_PATH_PREFIXES.some((prefix) => currentPath === prefix || currentPath.startsWith(prefix + '/'));
  if (isExcluded) return;

  // Use standard PageView for Meta Pixel, custom event for others
  if (typeof window !== 'undefined' && isAllowedHostname()) {
    // Google Analytics
    try {
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          page_title: pageName,
          page_location: window.location.href,
          page_path: currentPath,
        });
      }
    } catch (error) {
      console.debug('Google Analytics page view tracking failed:', error);
    }
    
    // Meta Pixel - use standard PageView event
    try {
      if (window.fbq) {
        window.fbq('track', 'PageView', {
          page_title: pageName,
          page_path: currentPath,
        });
      }
    } catch (error) {
      console.debug('Meta Pixel page view tracking failed:', error);
    }
    
    // Other platforms
    try {
      if (window.snaptr) {
        window.snaptr('track', 'PAGE_VIEW', {
          page_title: pageName,
          page_path: currentPath,
        });
      }
    } catch (error) {
      console.debug('Snapchat Pixel page view tracking failed:', error);
    }
    
    if (isTikTokPixelReady()) {
      try {
        window.ttq.track('page_view', {
          page_title: pageName,
          page_path: currentPath,
        });
      } catch (error) {
        console.debug('TikTok Pixel page view tracking failed:', error);
      }
    }
  }
};

// Conversion tracking
export const trackConversion = (conversionType: string, value?: number, currency = 'USD') => {
  trackEvent('conversion', {
    conversion_type: conversionType,
    value: value,
    currency: currency,
  });
};

// Form submission tracking
export const trackFormSubmission = (formName: string, formType: string) => {
  trackEvent('form_submit', {
    form_name: formName,
    form_type: formType,
  });
};

// Button click tracking
export const trackButtonClick = (buttonName: string, buttonLocation: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    button_location: buttonLocation,
  });
};

// Link click tracking
export const trackLinkClick = (linkText: string, linkUrl: string, linkLocation: string) => {
  trackEvent('link_click', {
    link_text: linkText,
    link_url: linkUrl,
    link_location: linkLocation,
  });
};

// Job application tracking
export const trackJobApplication = (jobTitle: string, jobId: string) => {
  trackEvent('job_application', {
    job_title: jobTitle,
    job_id: jobId,
  });
  
  // Track as conversion for Google Ads
  trackConversion('job_application', undefined, 'USD');
};

// Contact form tracking
export const trackContactForm = (formType: string) => {
  trackEvent('contact_form_submit', {
    form_type: formType,
  });
  
  // Track as conversion for Google Ads
  trackConversion('contact_form', undefined, 'USD');
};

// Newsletter subscription tracking
export const trackNewsletterSubscription = (source: string) => {
  trackEvent('newsletter_signup', {
    source: source,
  });
  
  // Track as conversion for Google Ads
  trackConversion('newsletter_signup', undefined, 'USD');
};

// Video play tracking
export const trackVideoPlay = (videoTitle: string, videoSource: string) => {
  trackEvent('video_play', {
    video_title: videoTitle,
    video_source: videoSource,
  });
};

// Social media link tracking
export const trackSocialMediaClick = (platform: string, linkType: string) => {
  trackEvent('social_media_click', {
    platform: platform,
    link_type: linkType,
  });
};

// Brand page visit tracking
export const trackBrandPageVisit = (brandName: string) => {
  trackEvent('brand_page_visit', {
    brand_name: brandName,
  });
};

// Search tracking
export const trackSearch = (searchTerm: string, searchResults: number) => {
  trackEvent('search', {
    search_term: searchTerm,
    search_results: searchResults,
  });
};

// File download tracking
export const trackFileDownload = (fileName: string, fileType: string) => {
  trackEvent('file_download', {
    file_name: fileName,
    file_type: fileType,
  });
};

// Declare global types for tracking libraries
declare global {
  interface Window {
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
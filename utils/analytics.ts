// Global types for GA4 and Facebook Pixel
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}

// Helper to log events safely (checks if analytics scripts are loaded)
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  try {
    // 1. Google Analytics 4
    if (window.gtag) {
      window.gtag('event', eventName, params);
    }

    // 2. Facebook Pixel mapping
    if (window.fbq) {
      // Map standard GA4 events to FB Standard Events where possible
      switch (eventName) {
        case 'sign_up':
          window.fbq('track', 'CompleteRegistration', params);
          break;
        case 'login':
          window.fbq('trackCustom', 'Login', params);
          break;
        case 'begin_checkout':
          window.fbq('track', 'InitiateCheckout', params);
          break;
        case 'purchase':
          window.fbq('track', 'Purchase', params);
          break;
        case 'exam_start':
          window.fbq('trackCustom', 'ExamStart', params);
          break;
        case 'exam_complete':
          window.fbq('trackCustom', 'ExamComplete', params); // Custom conversion for Retargeting
          break;
        default:
          window.fbq('trackCustom', eventName, params);
      }
    }
    
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Analytics Event: ${eventName}`, params);
    }
  } catch (e) {
    console.warn("Analytics Error:", e);
  }
};

export const trackPageView = (url: string) => {
  try {
    if (window.gtag) {
      window.gtag('config', 'G-XYNSWPNMGE', { // The ID is pulled from index.html config usually, but here we update path
        page_path: url
      });
    }
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  } catch (e) {
    console.warn("PageView Error:", e);
  }
};